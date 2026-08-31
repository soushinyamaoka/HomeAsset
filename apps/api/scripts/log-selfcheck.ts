import { spawn } from 'node:child_process';

const CHILD_FLAG = '--selfcheck-child';
const REQUIRED_EVENTS = ['startup', 'http_request', 'auth_failed', 'shutdown'] as const;
const ALLOWED_LEVELS = new Set(['debug', 'info', 'warn', 'error', 'critical']);
const FORBIDDEN_KEYS = new Set([
  'authorization',
  'cookie',
  'password',
  'token',
  'api_key',
  'apiKey',
  'email',
  'secret',
]);
const TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)$/;
const URL_WITH_QUERY_PATTERN = /https?:\/\/\S*\?/;

type LogRecord = Record<string, unknown>;

async function requestAndExpect(url: string, expectedStatus: number): Promise<void> {
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  await response.arrayBuffer();
  if (response.status !== expectedStatus) {
    throw new Error(`Unexpected status for ${new URL(url).pathname}: ${response.status}`);
  }
}

async function emitServerLogs(): Promise<void> {
  process.env.DATABASE_URL ||= 'postgresql://selfcheck@127.0.0.1:1/selfcheck';

  const [{ buildServer, shutdownServer }, { log }] = await Promise.all([
    import('../src/server'),
    import('../src/lib/logger'),
  ]);
  const app = await buildServer();
  const port = Number(process.env.SELFCHECK_PORT) || 4099;
  const host = '127.0.0.1';

  try {
    await app.listen({ port, host });
    log.info('startup', {
      port,
      host,
      node_env: process.env.NODE_ENV || 'development',
      pid: process.pid,
    });

    const baseUrl = `http://${host}:${port}`;
    await requestAndExpect(`${baseUrl}/health`, 200);
    await requestAndExpect(`${baseUrl}/api/assets`, 401);
    await requestAndExpect(`${baseUrl}/api/__not_found__`, 404);
  } finally {
    await shutdownServer(app, 'selfcheck');
  }
}

function findForbiddenKey(value: unknown, path = ''): string | undefined {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenKey(value[index], `${path}[${index}]`);
      if (found) return found;
    }
    return undefined;
  }
  if (value === null || typeof value !== 'object') return undefined;

  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    if (FORBIDDEN_KEYS.has(key)) return childPath;
    const found = findForbiddenKey(child, childPath);
    if (found) return found;
  }
  return undefined;
}

function containsUrlWithQuery(value: unknown): boolean {
  if (typeof value === 'string') return URL_WITH_QUERY_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(containsUrlWithQuery);
  if (value !== null && typeof value === 'object') {
    return Object.values(value).some(containsUrlWithQuery);
  }
  return false;
}

function parseAndValidate(stdout: string): LogRecord[] {
  const lines = stdout.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length === 0) throw new Error('No JSON log lines were captured');

  const records = lines.map((line, index) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new Error(`Line ${index + 1} is not valid JSON`);
    }
    if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error(`Line ${index + 1} is not a JSON object`);
    }

    const record = parsed as LogRecord;
    if (
      typeof record.ts !== 'string' ||
      !TIMESTAMP_PATTERN.test(record.ts) ||
      record.ts.endsWith('Z')
    ) {
      throw new Error(`Line ${index + 1} has an invalid offset timestamp`);
    }
    if (record.app !== 'homeasset') {
      throw new Error(`Line ${index + 1} has an invalid app value`);
    }
    if (typeof record.level !== 'string' || !ALLOWED_LEVELS.has(record.level)) {
      throw new Error(`Line ${index + 1} has an invalid level`);
    }
    if (typeof record.event !== 'string' || record.event.length === 0) {
      throw new Error(`Line ${index + 1} has an invalid event`);
    }

    const forbiddenKey = findForbiddenKey(record);
    if (forbiddenKey) {
      throw new Error(`Line ${index + 1} contains forbidden key ${forbiddenKey}`);
    }
    if (containsUrlWithQuery(record)) {
      throw new Error(`Line ${index + 1} contains a URL with a query string`);
    }
    return record;
  });

  const events = new Set(records.map((record) => record.event));
  for (const requiredEvent of REQUIRED_EVENTS) {
    if (!events.has(requiredEvent)) {
      throw new Error(`Required event was not captured: ${requiredEvent}`);
    }
  }
  return records;
}

async function captureServerLogs(): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...process.execArgv, __filename, CHILD_FLAG], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Selfcheck server exited with code ${code}: ${stderr.trim()}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function main(): Promise<void> {
  if (process.argv.includes(CHILD_FLAG)) {
    await emitServerLogs();
    return;
  }

  const { stdout, stderr } = await captureServerLogs();
  if (stderr.trim()) {
    throw new Error(`Selfcheck server wrote to stderr: ${stderr.trim()}`);
  }
  const records = parseAndValidate(stdout);
  const events = [...new Set(records.map((record) => String(record.event)))].sort();
  const errorCount = records.filter((record) => record.level === 'error').length;

  process.stdout.write(stdout);
  process.stderr.write(
    `[log:selfcheck] lines=${records.length} events=${events.join(',')} ` +
      `error_levels=${errorCount} result=OK\n`
  );
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[log:selfcheck] result=NG reason=${message}\n`);
  process.exitCode = 1;
});
