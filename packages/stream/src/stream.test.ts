/**
 * Stream Processing Tests
 *
 * Tests for streaming data operations
 * - Stream creation and piping
 * - Data transformation
 * - Backpressure handling
 * - End and error events
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

interface StreamOptions {
  highWaterMark?: number;
}

class MockStream<T> {
  private data: T[] = [];
  private highWaterMark: number;
  private paused = false;
  private ended = false;
  private onData: ((chunk: T) => void)[] = [];
  private onEnd: (() => void)[] = [];

  constructor(options: StreamOptions = {}) {
    this.highWaterMark = options.highWaterMark || 16;
  }

  write(chunk: T): boolean {
    if (this.ended) return false;

    this.data.push(chunk);
    this._emitData(chunk);

    return this.data.length < this.highWaterMark;
  }

  private _emitData(chunk: T): void {
    for (const callback of this.onData) {
      callback(chunk);
    }
  }

  on(event: 'data' | 'end', callback: (chunk?: T) => void): void {
    if (event === 'data') {
      this.onData.push(callback as (chunk: T) => void);
    } else if (event === 'end') {
      this.onEnd.push(callback);
    }
  }

  end(): void {
    this.ended = true;
    for (const callback of this.onEnd) {
      callback();
    }
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  isPaused(): boolean {
    return this.paused;
  }

  isEnded(): boolean {
    return this.ended;
  }

  getBufferedSize(): number {
    return this.data.length;
  }

  pipe<U>(transform: (data: T) => U): MockStream<U> {
    const output = new MockStream<U>();

    this.on('data', (chunk: T) => {
      const transformed = transform(chunk);
      output.write(transformed);
    });

    this.on('end', () => {
      output.end();
    });

    return output;
  }
}

describe('Stream', () => {
  let stream: MockStream<number>;

  beforeEach(() => {
    stream = new MockStream();
  });

  describe('Basic Operations', () => {
    it('should write data', () => {
      const result = stream.write(1);
      expect(result).toBe(true);
    });

    it('should emit data event', () => {
      const callback = vi.fn();
      stream.on('data', callback);
      stream.write(42);

      expect(callback).toHaveBeenCalledWith(42);
    });

    it('should end stream', () => {
      const callback = vi.fn();
      stream.on('end', callback);
      stream.end();

      expect(callback).toHaveBeenCalled();
    });

    it('should not write after end', () => {
      stream.end();
      const result = stream.write(1);

      expect(result).toBe(false);
    });
  });

  describe('Backpressure', () => {
    it('should indicate backpressure', () => {
      const stream2 = new MockStream({ highWaterMark: 2 });

      stream2.write(1);
      stream2.write(2);
      const result = stream2.write(3);

      expect(result).toBe(false);
    });

    it('should track buffer size', () => {
      stream.write(1);
      stream.write(2);
      stream.write(3);

      expect(stream.getBufferedSize()).toBe(3);
    });
  });

  describe('Flow Control', () => {
    it('should pause stream', () => {
      stream.pause();
      expect(stream.isPaused()).toBe(true);
    });

    it('should resume stream', () => {
      stream.pause();
      stream.resume();
      expect(stream.isPaused()).toBe(false);
    });
  });

  describe('Piping and Transformation', () => {
    it('should pipe data through transform', () => {
      const doubled = stream.pipe((x: number) => x * 2);
      const callback = vi.fn();

      doubled.on('data', callback);
      stream.write(5);

      expect(callback).toHaveBeenCalledWith(10);
    });

    it('should chain multiple transforms', () => {
      const doubled = stream.pipe((x: number) => x * 2);
      const incremented = doubled.pipe((x: number) => x + 1);

      const callback = vi.fn();
      incremented.on('data', callback);

      stream.write(5);

      expect(callback).toHaveBeenCalledWith(11); // (5 * 2) + 1
    });

    it('should propagate end event through pipe', () => {
      const transformed = stream.pipe((x: number) => x * 2);
      const endCallback = vi.fn();

      transformed.on('end', endCallback);
      stream.end();

      expect(endCallback).toHaveBeenCalled();
    });

    it('should transform different types', () => {
      const stringStream = stream.pipe((x: number) => `num${x}`);
      const callback = vi.fn();

      stringStream.on('data', callback);
      stream.write(42);

      expect(callback).toHaveBeenCalledWith('num42');
    });
  });

  describe('Multiple Listeners', () => {
    it('should call multiple data listeners', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();

      stream.on('data', cb1);
      stream.on('data', cb2);

      stream.write(1);

      expect(cb1).toHaveBeenCalledWith(1);
      expect(cb2).toHaveBeenCalledWith(1);
    });

    it('should call multiple end listeners', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();

      stream.on('end', cb1);
      stream.on('end', cb2);

      stream.end();

      expect(cb1).toHaveBeenCalled();
      expect(cb2).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should handle 1000 writes', () => {
      const callback = vi.fn();
      stream.on('data', callback);

      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        stream.write(i);
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(500);
      expect(callback).toHaveBeenCalledTimes(1000);
    });

    it('should handle deep piping', () => {
      let current = stream;

      for (let i = 0; i < 10; i++) {
        current = current.pipe((x: number) => x + 1);
      }

      const callback = vi.fn();
      (current as MockStream<number>).on('data', callback);

      stream.write(0);

      expect(callback).toHaveBeenCalledWith(10);
    });

    it('should process data quickly', () => {
      const start = Date.now();
      for (let i = 0; i < 10000; i++) {
        stream.write(i);
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('Edge Cases', () => {
    it('should handle end without writes', () => {
      const callback = vi.fn();
      stream.on('end', callback);
      stream.end();

      expect(callback).toHaveBeenCalled();
    });

    it('should handle writing null', () => {
      const nullStream = new MockStream<number | null>();
      const callback = vi.fn();

      nullStream.on('data', callback);
      nullStream.write(null as any);

      expect(callback).toHaveBeenCalled();
    });

    it('should handle transform with no data', () => {
      const transformed = stream.pipe((x: number) => x * 2);
      const callback = vi.fn();

      transformed.on('data', callback);
      stream.end();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('State Tracking', () => {
    it('should track ended state', () => {
      expect(stream.isEnded()).toBe(false);
      stream.end();
      expect(stream.isEnded()).toBe(true);
    });

    it('should track paused state', () => {
      expect(stream.isPaused()).toBe(false);
      stream.pause();
      expect(stream.isPaused()).toBe(true);
      stream.resume();
      expect(stream.isPaused()).toBe(false);
    });
  });
});
