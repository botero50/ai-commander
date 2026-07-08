export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  constructor(private level: LogLevel = 'info', private context: string = 'ZeroADAdapter') {}

  debug(message: string, data?: unknown): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.debug) {
      console.log(`[${this.context}:DEBUG] ${message}`, data || '');
    }
  }

  info(message: string, data?: unknown): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.info) {
      console.log(`[${this.context}:INFO] ${message}`, data || '');
    }
  }

  warn(message: string, data?: unknown): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.warn) {
      console.warn(`[${this.context}:WARN] ${message}`, data || '');
    }
  }

  error(message: string, error?: unknown): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.error) {
      console.error(`[${this.context}:ERROR] ${message}`, error || '');
    }
  }
}
