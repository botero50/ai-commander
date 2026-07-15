/**
 * Metrics Collection Tests
 *
 * Tests for performance metrics collection
 * - Timing measurement
 * - Counter aggregation
 * - Histogram tracking
 * - Performance reporting
 */

import { describe, it, expect, beforeEach } from 'vitest';

interface MetricValue {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

interface TimerResult {
  name: string;
  duration: number;
  unit: 'ms' | 'us';
}

class MockMetricsCollector {
  private metrics: Map<string, number> = new Map();
  private timers: Map<string, number> = new Map();
  private history: MetricValue[] = [];
  private timings: Map<string, number[]> = new Map();

  recordMetric(name: string, value: number, unit: string = 'count'): void {
    this.metrics.set(name, value);
    this.history.push({
      name,
      value,
      unit,
      timestamp: Date.now(),
    });
  }

  getMetric(name: string): number | undefined {
    return this.metrics.get(name);
  }

  startTimer(name: string): void {
    this.timers.set(name, Date.now());
  }

  stopTimer(name: string): TimerResult | undefined {
    const start = this.timers.get(name);
    if (!start) return undefined;

    const duration = Date.now() - start;
    this.timers.delete(name);

    if (!this.timings.has(name)) {
      this.timings.set(name, []);
    }
    this.timings.get(name)!.push(duration);

    return { name, duration, unit: 'ms' };
  }

  getTimerStats(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
  } | null {
    const timings = this.timings.get(name);
    if (!timings || timings.length === 0) return null;

    return {
      count: timings.length,
      min: Math.min(...timings),
      max: Math.max(...timings),
      avg: timings.reduce((a, b) => a + b, 0) / timings.length,
    };
  }

  increment(name: string, amount: number = 1): void {
    const current = this.metrics.get(name) || 0;
    this.metrics.set(name, current + amount);
  }

  decrement(name: string, amount: number = 1): void {
    const current = this.metrics.get(name) || 0;
    this.metrics.set(name, current - amount);
  }

  gauge(name: string, value: number): void {
    this.metrics.set(name, value);
  }

  histogram(name: string, value: number): void {
    if (!this.timings.has(name)) {
      this.timings.set(name, []);
    }
    this.timings.get(name)!.push(value);
  }

  getAllMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  getHistory(): MetricValue[] {
    return [...this.history];
  }

  clear(): void {
    this.metrics.clear();
    this.timers.clear();
    this.history = [];
    this.timings.clear();
  }

  getMetricCount(): number {
    return this.metrics.size;
  }
}

describe('MetricsCollector', () => {
  let collector: MockMetricsCollector;

  beforeEach(() => {
    collector = new MockMetricsCollector();
  });

  describe('Basic Metrics', () => {
    it('should record metric', () => {
      collector.recordMetric('requests', 100, 'count');

      expect(collector.getMetric('requests')).toBe(100);
    });

    it('should record multiple metrics', () => {
      collector.recordMetric('cpu', 45, 'percent');
      collector.recordMetric('memory', 2048, 'mb');
      collector.recordMetric('latency', 125, 'ms');

      expect(collector.getMetricCount()).toBe(3);
    });

    it('should overwrite metric', () => {
      collector.recordMetric('value', 10);
      collector.recordMetric('value', 20);

      expect(collector.getMetric('value')).toBe(20);
    });
  });

  describe('Counters', () => {
    it('should increment counter', () => {
      collector.recordMetric('count', 0);
      collector.increment('count');
      collector.increment('count');

      expect(collector.getMetric('count')).toBe(2);
    });

    it('should increment by amount', () => {
      collector.recordMetric('count', 0);
      collector.increment('count', 5);

      expect(collector.getMetric('count')).toBe(5);
    });

    it('should decrement counter', () => {
      collector.recordMetric('active', 10);
      collector.decrement('active', 3);

      expect(collector.getMetric('active')).toBe(7);
    });

    it('should handle counter from zero', () => {
      collector.increment('new_counter', 5);

      expect(collector.getMetric('new_counter')).toBe(5);
    });
  });

  describe('Timers', () => {
    it('should measure timer', async () => {
      collector.startTimer('operation');
      await new Promise(resolve => setTimeout(resolve, 50));
      const result = collector.stopTimer('operation');

      expect(result?.duration).toBeGreaterThan(40);
    });

    it('should measure multiple operations', async () => {
      collector.startTimer('op1');
      await new Promise(resolve => setTimeout(resolve, 20));
      collector.stopTimer('op1');

      collector.startTimer('op2');
      await new Promise(resolve => setTimeout(resolve, 30));
      collector.stopTimer('op2');

      const stats1 = collector.getTimerStats('op1');
      const stats2 = collector.getTimerStats('op2');

      expect(stats1?.count).toBe(1);
      expect(stats2?.count).toBe(1);
    });

    it('should calculate timer statistics', async () => {
      for (let i = 0; i < 5; i++) {
        collector.startTimer('test');
        await new Promise(resolve => setTimeout(resolve, 10));
        collector.stopTimer('test');
      }

      const stats = collector.getTimerStats('test');
      expect(stats?.count).toBe(5);
      expect(stats?.min).toBeGreaterThan(0);
      expect(stats?.max).toBeGreaterThan(stats?.min!);
      expect(stats?.avg).toBeGreaterThan(0);
    });

    it('should return null for non-existent timer', () => {
      const stats = collector.getTimerStats('nonexistent');
      expect(stats).toBeNull();
    });
  });

  describe('Gauge', () => {
    it('should set gauge value', () => {
      collector.gauge('temperature', 72);

      expect(collector.getMetric('temperature')).toBe(72);
    });

    it('should update gauge', () => {
      collector.gauge('temp', 20);
      collector.gauge('temp', 25);

      expect(collector.getMetric('temp')).toBe(25);
    });

    it('should handle gauge at zero', () => {
      collector.gauge('count', 0);

      expect(collector.getMetric('count')).toBe(0);
    });
  });

  describe('Histogram', () => {
    it('should record histogram values', () => {
      collector.histogram('latencies', 10);
      collector.histogram('latencies', 20);
      collector.histogram('latencies', 15);

      const stats = collector.getTimerStats('latencies');
      expect(stats?.count).toBe(3);
    });

    it('should calculate histogram stats', () => {
      collector.histogram('values', 10);
      collector.histogram('values', 50);
      collector.histogram('values', 30);

      const stats = collector.getTimerStats('values');
      expect(stats?.min).toBe(10);
      expect(stats?.max).toBe(50);
      expect(stats?.avg).toBe(30);
    });

    it('should handle single value', () => {
      collector.histogram('single', 42);

      const stats = collector.getTimerStats('single');
      expect(stats?.min).toBe(42);
      expect(stats?.max).toBe(42);
      expect(stats?.avg).toBe(42);
    });
  });

  describe('History Tracking', () => {
    it('should track metric history', () => {
      collector.recordMetric('requests', 100);
      collector.recordMetric('latency', 50);

      const history = collector.getHistory();
      expect(history).toHaveLength(2);
    });

    it('should preserve timestamp', () => {
      const before = Date.now();
      collector.recordMetric('metric', 42);
      const after = Date.now();

      const history = collector.getHistory();
      expect(history[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(history[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should track units', () => {
      collector.recordMetric('cpu', 75, 'percent');
      collector.recordMetric('memory', 1024, 'mb');

      const history = collector.getHistory();
      expect(history[0].unit).toBe('percent');
      expect(history[1].unit).toBe('mb');
    });
  });

  describe('Retrieval', () => {
    it('should get all metrics', () => {
      collector.recordMetric('a', 1);
      collector.recordMetric('b', 2);
      collector.recordMetric('c', 3);

      const all = collector.getAllMetrics();
      expect(Object.keys(all)).toHaveLength(3);
    });

    it('should handle empty metrics', () => {
      const all = collector.getAllMetrics();
      expect(Object.keys(all)).toHaveLength(0);
    });
  });

  describe('Performance', () => {
    it('should handle many metrics', () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        collector.recordMetric(`metric${i}`, i);
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500);
      expect(collector.getMetricCount()).toBe(1000);
    });

    it('should handle rapid increments', () => {
      const start = Date.now();

      for (let i = 0; i < 10000; i++) {
        collector.increment('counter');
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000);
      expect(collector.getMetric('counter')).toBe(10000);
    });

    it('should collect timings efficiently', async () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        collector.startTimer(`timer${i}`);
        await new Promise(resolve => setTimeout(resolve, 1));
        collector.stopTimer(`timer${i}`);
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000);
    });
  });

  describe('Data Management', () => {
    it('should clear all metrics', () => {
      collector.recordMetric('a', 1);
      collector.recordMetric('b', 2);
      collector.clear();

      expect(collector.getMetricCount()).toBe(0);
      expect(collector.getHistory()).toHaveLength(0);
    });
  });
});
