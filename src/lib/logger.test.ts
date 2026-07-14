import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('logs a structured JSON line on the server for each level', () => {
    vi.stubEnv('LOG_LEVEL', 'debug');
    logger.info('hello');

    expect(console.info).toHaveBeenCalledTimes(1);
    const line = JSON.parse((console.info as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(line).toMatchObject({ level: 'info', message: 'hello' });
    expect(line.timestamp).toEqual(expect.any(String));
  });

  it('serializes Error instances into name/message/stack', () => {
    vi.stubEnv('LOG_LEVEL', 'debug');
    const err = new Error('boom');
    logger.error('failed', err);

    const line = JSON.parse((console.error as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(line.data).toMatchObject({ name: 'Error', message: 'boom' });
  });

  it('gates out levels below the configured LOG_LEVEL', () => {
    vi.stubEnv('LOG_LEVEL', 'warn');
    logger.debug('should not log');
    logger.info('should not log either');
    logger.warn('should log');

    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('defaults to info level in production when LOG_LEVEL is unset', () => {
    vi.stubEnv('LOG_LEVEL', undefined);
    vi.stubEnv('NODE_ENV', 'production');
    logger.debug('dropped');
    logger.info('kept');

    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledTimes(1);
  });

  it('defaults to debug level outside production when LOG_LEVEL is unset', () => {
    vi.stubEnv('LOG_LEVEL', undefined);
    vi.stubEnv('NODE_ENV', 'test');
    logger.debug('kept');

    expect(console.debug).toHaveBeenCalledTimes(1);
  });
});
