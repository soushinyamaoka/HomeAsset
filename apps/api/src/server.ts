import 'dotenv/config';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import authPlugin from './plugins/auth';
import authRoutes from './routes/auth';
import homeAssetRoutes from './routes/homeAssets';
import categoryRoutes from './routes/categories';
import locationRoutes from './routes/locations';
import specRoutes from './routes/specs';
import linkRoutes from './routes/links';
import maintenanceRoutes from './routes/maintenance';
import repairRoutes from './routes/repairs';
import consumableRoutes from './routes/consumables';
import accessoryRoutes from './routes/accessories';
import actionPlanRoutes from './routes/actionPlans';
import networkRoutes from './routes/networkInfos';
import aiImportRoutes from './routes/aiImport';
import dashboardRoutes from './routes/dashboard';
import exportRoutes from './routes/exportData';
import householdRoutes from './routes/households';
import { flushLogs, log, logger, requestLogTarget } from './lib/logger';

const PRISMA_ERROR_NAMES = new Set([
  'PrismaClientValidationError',
  'PrismaClientKnownRequestError',
  'PrismaClientUnknownRequestError',
]);

type ErrorWithCode = Error & {
  code?: unknown;
  statusCode?: unknown;
};

function errorStatusCode(error: ErrorWithCode, reply: FastifyReply): number {
  if (
    typeof error.statusCode === 'number' &&
    error.statusCode >= 400 &&
    error.statusCode <= 599
  ) {
    return error.statusCode;
  }
  return reply.statusCode >= 400 ? reply.statusCode : 500;
}

function errorKind(
  error: ErrorWithCode,
  statusCode: number
): 'db' | 'validation' | 'auth' | 'timeout' | 'internal' {
  const code = typeof error.code === 'string' ? error.code : '';
  if (PRISMA_ERROR_NAMES.has(error.name) || error.name.startsWith('PrismaClient')) {
    return 'db';
  }
  if (error.name === 'ZodError' || code === 'FST_ERR_VALIDATION' || statusCode === 400) {
    return 'validation';
  }
  if (statusCode === 401 || statusCode === 403 || code.includes('JWT')) {
    return 'auth';
  }
  if (error.name.includes('Timeout') || code === 'ETIMEDOUT') {
    return 'timeout';
  }
  return 'internal';
}

function stackFrames(error: Error): string | undefined {
  const frames = error.stack
    ?.split('\n')
    .filter((line) => line.startsWith('    at '))
    .slice(0, 10)
    .join('\n');
  return frames || undefined;
}

function processErrorFields(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return { err_name: 'NonError' };
  }
  const fields: Record<string, unknown> = { err_name: error.name };
  const code = (error as ErrorWithCode).code;
  if (typeof code === 'string' || typeof code === 'number') {
    fields.err_code = code;
  }
  const frames = stackFrames(error);
  if (frames) {
    fields.stack_frames = frames;
  }
  return fields;
}

export async function buildServer() {
  const app = Fastify({
    loggerInstance: logger,
    disableRequestLogging: true,
  });

  app.addHook('onResponse', async (request, reply) => {
    const fields = {
      method: request.method,
      target: requestLogTarget(request),
      status_code: reply.statusCode,
      duration_ms: Math.round(reply.elapsedTime),
      req_id: request.id,
    };
    if (reply.statusCode >= 500) {
      log.error('http_request', fields);
    } else {
      log.info('http_request', fields);
    }
  });

  app.setErrorHandler((error: ErrorWithCode, request: FastifyRequest, reply: FastifyReply) => {
    const statusCode = errorStatusCode(error, reply);
    const fields: Record<string, unknown> = {
      err_name: error.name,
      error_kind: errorKind(error, statusCode),
      method: request.method,
      target: requestLogTarget(request),
      status_code: statusCode,
      req_id: request.id,
    };
    if (typeof error.code === 'string' || typeof error.code === 'number') {
      fields.err_code = error.code;
    }
    if (PRISMA_ERROR_NAMES.has(error.name)) {
      fields.err_message_suppressed = true;
    } else {
      fields.err_message = error.message.slice(0, 300);
    }
    const frames = stackFrames(error);
    if (frames) {
      fields.stack_frames = frames;
    }
    log.error('request_failed', fields);
    reply.send(error);
  });

  // fastify@5 の既定JSONパーサは空ボディを拒否するので、空文字を{}として扱う
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    const text = (body as string) ?? '';
    if (text.trim() === '') {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(text));
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  await app.register(cors, { origin: true });
  await app.register(sensible);
  await app.register(authPlugin);

  app.get('/health', async () => ({ status: 'ok' }));

  // 認証不要
  await app.register(authRoutes, { prefix: '/api/auth' });

  // 認証必須
  await app.register(async (instance) => {
    instance.addHook('preHandler', instance.authenticate);
    await instance.register(householdRoutes, { prefix: '/api/households' });
    await instance.register(homeAssetRoutes, { prefix: '/api/assets' });
    await instance.register(categoryRoutes, { prefix: '/api/categories' });
    await instance.register(locationRoutes, { prefix: '/api/locations' });
    await instance.register(specRoutes, { prefix: '/api' });
    await instance.register(linkRoutes, { prefix: '/api' });
    await instance.register(maintenanceRoutes, { prefix: '/api' });
    await instance.register(repairRoutes, { prefix: '/api' });
    await instance.register(consumableRoutes, { prefix: '/api' });
    await instance.register(accessoryRoutes, { prefix: '/api' });
    await instance.register(actionPlanRoutes, { prefix: '/api' });
    await instance.register(networkRoutes, { prefix: '/api' });
    await instance.register(aiImportRoutes, { prefix: '/api' });
    await instance.register(dashboardRoutes, { prefix: '/api/dashboard' });
    await instance.register(exportRoutes, { prefix: '/api/export' });
  });

  return app;
}

type ServerInstance = Awaited<ReturnType<typeof buildServer>>;

export async function shutdownServer(
  app: ServerInstance,
  reason: 'SIGTERM' | 'SIGINT' | 'selfcheck'
): Promise<void> {
  log.info('shutdown', { signal: reason });
  await app.close();
  flushLogs();
}

async function boot(): Promise<void> {
  let app: ServerInstance | undefined;
  let shuttingDown = false;

  const handleShutdown = async (signal: 'SIGTERM' | 'SIGINT') => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    if (app) {
      await shutdownServer(app, signal);
    } else {
      log.info('shutdown', { signal });
      flushLogs();
    }
    process.exit(0);
  };

  process.once('SIGTERM', () => void handleShutdown('SIGTERM'));
  process.once('SIGINT', () => void handleShutdown('SIGINT'));
  process.once('uncaughtException', (error) => {
    log.critical('uncaught_exception', processErrorFields(error));
    flushLogs();
    process.exit(1);
  });
  process.once('unhandledRejection', (reason) => {
    log.critical('unhandled_rejection', processErrorFields(reason));
    flushLogs();
    process.exit(1);
  });

  try {
    app = await buildServer();
    const port = Number(process.env.PORT) || 4001;
    const host = process.env.HOST || '0.0.0.0';
    await app.listen({ port, host });
    log.info('startup', {
      port,
      host,
      node_env: process.env.NODE_ENV || 'development',
      pid: process.pid,
    });
  } catch (err) {
    log.critical('startup_failed', processErrorFields(err));
    flushLogs();
    process.exit(1);
  }
}

if (require.main === module) {
  void boot();
}
