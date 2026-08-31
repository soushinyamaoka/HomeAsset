import pino from 'pino';
import type { FastifyRequest } from 'fastify';

export type LogEvent =
  | 'startup'
  | 'shutdown'
  | 'startup_failed'
  | 'http_request'
  | 'request_failed'
  | 'auth_failed'
  | 'auth_forbidden'
  | 'uncaught_exception'
  | 'unhandled_rejection'
  | 'app_log';

type LogFields = Record<string, unknown> & {
  app?: never;
  event?: never;
  level?: never;
  ts?: never;
};

const destination = pino.destination({ dest: 1, sync: true });

const levelLabels: Record<string, 'debug' | 'info' | 'warn' | 'error' | 'critical'> = {
  trace: 'debug',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
  fatal: 'critical',
};

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

function timestampWithOffset(date = new Date()): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const offsetSign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = Math.floor(absoluteOffset / 60);
  const offsetRemainder = absoluteOffset % 60;

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `.${pad(date.getMilliseconds(), 3)}` +
    `${offsetSign}${pad(offsetHours)}:${pad(offsetRemainder)}`
  );
}

export const logger = pino(
  {
    level:
      process.env.LOG_LEVEL ||
      (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    base: { app: 'homeasset' },
    timestamp: () => `,"ts":"${timestampWithOffset()}"`,
    messageKey: 'msg',
    formatters: {
      level(label) {
        return { level: levelLabels[label] ?? 'info' };
      },
      log(fields) {
        return { event: 'app_log', ...fields };
      },
    },
    redact: {
      paths: [
        'authorization',
        'cookie',
        'password',
        'token',
        'api_key',
        'apiKey',
        'secret',
        '*.authorization',
        '*.cookie',
        '*.password',
        '*.token',
        '*.api_key',
        '*.apiKey',
        '*.secret',
        '*.*.authorization',
        '*.*.cookie',
        '*.*.password',
        '*.*.token',
        '*.*.api_key',
        '*.*.apiKey',
        '*.*.secret',
      ],
      remove: true,
    },
  },
  destination
);

function writeLog(
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal',
  event: LogEvent,
  fields: LogFields = {}
): void {
  logger[level]({ ...fields, event });
}

export const log = {
  debug: (event: LogEvent, fields?: LogFields) => writeLog('debug', event, fields),
  info: (event: LogEvent, fields?: LogFields) => writeLog('info', event, fields),
  warn: (event: LogEvent, fields?: LogFields) => writeLog('warn', event, fields),
  error: (event: LogEvent, fields?: LogFields) => writeLog('error', event, fields),
  critical: (event: LogEvent, fields?: LogFields) => writeLog('fatal', event, fields),
};

export function requestLogTarget(request: FastifyRequest): string {
  const routeTarget = request.routeOptions.url;
  const target = routeTarget || request.url.split('?', 1)[0];
  return target.slice(0, 200);
}

export function flushLogs(): void {
  destination.flushSync();
}
