/**
 * Logging Service Tests
 *
 * Tests for centralized logging system
 * - Log level filtering
 * - Message formatting
 * - Multiple transports
 * - Performance under load
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  stack?: string;
}

interface Transport {
  name: string;
  write: (entry: LogEntry) => Promise<void>;
  isActive: boolean;
}

class MockLogger {
  private entries: LogEntry[] = [];
  private transports: Map<string, Transport> = new Map();
  private minLevel: LogLevel = 'debug';
  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
  };

  addTransport(name: string, transport: Transport): void {
    this.transports.set(name, transport);
  }

  removeTransport(name: string): void {
    this.transports.delete(name);
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.minLevel];
  }

  private async writeToTransports(entry: LogEntry): Promise<void> {
    for (const transport of this.transports.values()) {
      if (transport.isActive) {
        await transport.write(entry);
      }
    }
  }

  private async log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      context,
    };

    this.entries.push(entry);
    await this.writeToTransports(entry);
  }

  async debug(message: string, context?: Record<string, unknown>): Promise<void> {
    await this.log('debug', message, context);
  }

  async info(message: string, context?: Record<string, unknown>): Promise<void> {
    await this.log('info', message, context);
  }

  async warn(message: string, context?: Record<string, unknown>): Promise<void> {
    await this.log('warn', message, context);
  }

  async error(message: string, context?: Record<string, unknown>): Promise<void> {
    await this.log('error', message, context);
  }

  async fatal(message: string, context?: Record<string, unknown>): Promise<void> {
    await this.log('fatal', message, context);
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  getEntriesByLevel(level: LogLevel): LogEntry[] {
    return this.entries.filter(e => e.level === level);
  }

  getEntryCount(): number {
    return this.entries.length;
  }

  clear(): void {
    this.entries = [];
  }

  getTransportCount(): number {
    return this.transports.size;
  }

  hasTransport(name: string): boolean {
    return this.transports.has(name);
  }

  searchEntries(query: string): LogEntry[] {
    return this.entries.filter(e => e.message.includes(query));
  }
}

describe('Logger', () => {
  let logger: MockLogger;
  let mockTransport: Transport;

  beforeEach(() => {
    logger = new MockLogger();
    mockTransport = {
      name: 'mock',
      write: vi.fn(async () => {}),
      isActive: true,
    };
  });

  describe('Logging Levels', () => {
    it('should log at debug level', async () => {
      logger.setMinLevel('debug');
      await logger.debug('Debug message');

      expect(logger.getEntryCount()).toBe(1);
    });

    it('should log at info level', async () => {
      logger.setMinLevel('info');
      await logger.info('Info message');

      expect(logger.getEntryCount()).toBe(1);
    });

    it('should log at warn level', async () => {
      logger.setMinLevel('warn');
      await logger.warn('Warning message');

      expect(logger.getEntryCount()).toBe(1);
    });

    it('should log at error level', async () => {
      logger.setMinLevel('error');
      await logger.error('Error message');

      expect(logger.getEntryCount()).toBe(1);
    });

    it('should log at fatal level', async () => {
      logger.setMinLevel('fatal');
      await logger.fatal('Fatal message');

      expect(logger.getEntryCount()).toBe(1);
    });

    it('should respect minimum level', async () => {
      logger.setMinLevel('warn');
      await logger.debug('Debug');
      await logger.info('Info');
      await logger.warn('Warn');

      expect(logger.getEntryCount()).toBe(1);
    });

    it('should filter logs below minimum level', async () => {
      logger.setMinLevel('error');
      await logger.debug('Debug');
      await logger.info('Info');
      await logger.warn('Warn');
      await logger.error('Error');

      expect(logger.getEntryCount()).toBe(1);
    });
  });

  describe('Message Formatting', () => {
    it('should preserve message text', async () => {
      const message = 'Test message with details';
      await logger.info(message);

      const entries = logger.getEntries();
      expect(entries[0].message).toBe(message);
    });

    it('should include context data', async () => {
      const context = { userId: 123, action: 'login' };
      await logger.info('User action', context);

      const entries = logger.getEntries();
      expect(entries[0].context).toEqual(context);
    });

    it('should include timestamp', async () => {
      const before = Date.now();
      await logger.info('Timestamped');
      const after = Date.now();

      const entries = logger.getEntries();
      expect(entries[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(entries[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should include log level', async () => {
      await logger.warn('Warning');
      const entries = logger.getEntries();
      expect(entries[0].level).toBe('warn');
    });
  });

  describe('Transport Management', () => {
    it('should add transport', () => {
      logger.addTransport('mock', mockTransport);
      expect(logger.hasTransport('mock')).toBe(true);
    });

    it('should add multiple transports', () => {
      logger.addTransport('mock1', mockTransport);
      logger.addTransport('mock2', { ...mockTransport, name: 'mock2' });

      expect(logger.getTransportCount()).toBe(2);
    });

    it('should remove transport', () => {
      logger.addTransport('mock', mockTransport);
      logger.removeTransport('mock');

      expect(logger.hasTransport('mock')).toBe(false);
    });

    it('should write to all transports', async () => {
      const transport1 = { ...mockTransport, name: 'transport1', write: vi.fn(async () => {}) };
      const transport2 = { ...mockTransport, name: 'transport2', write: vi.fn(async () => {}) };

      logger.addTransport('t1', transport1);
      logger.addTransport('t2', transport2);

      await logger.info('Test message');

      expect(transport1.write).toHaveBeenCalled();
      expect(transport2.write).toHaveBeenCalled();
    });

    it('should skip inactive transports', async () => {
      const inactiveTransport = { ...mockTransport, write: vi.fn(async () => {}), isActive: false };
      logger.addTransport('inactive', inactiveTransport);

      await logger.info('Test');

      expect(inactiveTransport.write).not.toHaveBeenCalled();
    });
  });

  describe('Log Retrieval', () => {
    beforeEach(async () => {
      await logger.info('Info 1');
      await logger.warn('Warn 1');
      await logger.error('Error 1');
      await logger.info('Info 2');
    });

    it('should retrieve all entries', () => {
      const entries = logger.getEntries();
      expect(entries).toHaveLength(4);
    });

    it('should filter by level', async () => {
      const infos = logger.getEntriesByLevel('info');
      expect(infos).toHaveLength(2);
      expect(infos.every(e => e.level === 'info')).toBe(true);
    });

    it('should search entries by message', () => {
      const found = logger.searchEntries('Info');
      expect(found).toHaveLength(2);
    });

    it('should preserve entry order', () => {
      const entries = logger.getEntries();
      expect(entries[0].message).toBe('Info 1');
      expect(entries[1].message).toBe('Warn 1');
      expect(entries[3].message).toBe('Info 2');
    });

    it('should clear entries', () => {
      logger.clear();
      expect(logger.getEntryCount()).toBe(0);
    });
  });

  describe('Multiple Level Scenarios', () => {
    it('should handle mixed log levels', async () => {
      await logger.debug('Debug');
      await logger.info('Info');
      await logger.warn('Warn');
      await logger.error('Error');
      await logger.fatal('Fatal');

      expect(logger.getEntryCount()).toBe(5);
    });

    it('should group logs by level', async () => {
      for (let i = 0; i < 3; i++) {
        await logger.info(`Info ${i}`);
        await logger.warn(`Warn ${i}`);
        await logger.error(`Error ${i}`);
      }

      expect(logger.getEntriesByLevel('info')).toHaveLength(3);
      expect(logger.getEntriesByLevel('warn')).toHaveLength(3);
      expect(logger.getEntriesByLevel('error')).toHaveLength(3);
    });
  });

  describe('Context Data', () => {
    it('should include optional context', async () => {
      const context = {
        userId: 'user123',
        sessionId: 'sess456',
        duration: 1234,
      };

      await logger.info('Action completed', context);
      const entry = logger.getEntries()[0];

      expect(entry.context).toEqual(context);
    });

    it('should work without context', async () => {
      await logger.info('Simple message');
      const entry = logger.getEntries()[0];

      expect(entry.context).toBeUndefined();
    });
  });

  describe('Performance', () => {
    it('should handle rapid logging', async () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        await logger.info(`Message ${i}`);
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000);
      expect(logger.getEntryCount()).toBe(1000);
    });

    it('should search large log sets efficiently', async () => {
      for (let i = 0; i < 100; i++) {
        await logger.info(`Message ${i}`, { index: i });
      }

      const start = Date.now();
      const found = logger.searchEntries('Message 5');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(10);
      expect(found.length).toBeGreaterThan(0);
    });

    it('should filter by level efficiently', async () => {
      for (let i = 0; i < 100; i++) {
        await logger.info(`Info ${i}`);
        await logger.warn(`Warn ${i}`);
        await logger.error(`Error ${i}`);
      }

      const start = Date.now();
      const warns = logger.getEntriesByLevel('warn');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(10);
      expect(warns).toHaveLength(100);
    });
  });
});
