type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function activeLevel(): LogLevel {
  const configured = process.env.LOG_LEVEL as LogLevel | undefined;
  if (configured && configured in LEVEL_WEIGHT) return configured;
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function serialize(value: unknown) {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

function write(level: LogLevel, message: string, data: unknown[]) {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[activeLevel()]) return;

  const method = console[level];

  if (typeof window === 'undefined') {
    // Server/edge: one structured JSON line per entry for log aggregators.
    method(
      JSON.stringify({
        level,
        message,
        timestamp: new Date().toISOString(),
        ...(data.length > 0 && {
          data: data.length === 1 ? serialize(data[0]) : data.map(serialize),
        }),
      })
    );
    return;
  }

  // Browser: keep it human-readable.
  method(`[${level}] ${message}`, ...data);
}

export const logger = {
  debug: (message: string, ...data: unknown[]) => write('debug', message, data),
  info: (message: string, ...data: unknown[]) => write('info', message, data),
  warn: (message: string, ...data: unknown[]) => write('warn', message, data),
  error: (message: string, ...data: unknown[]) => write('error', message, data),
};
