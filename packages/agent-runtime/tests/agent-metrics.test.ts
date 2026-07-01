import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsCollector } from '../src/agent-metrics.js';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  it('should start with zero metrics', () => {
    const metrics = collector.getMetrics();
    expect(metrics.ticksExecuted).toBe(0);
    expect(metrics.decisionsExecuted).toBe(0);
    expect(metrics.commandsExecuted).toBe(0);
    expect(metrics.errorsEncountered).toBe(0);
    expect(metrics.averagePlanningTimeMs).toBe(0);
    expect(metrics.averageDecisionTimeMs).toBe(0);
  });

  it('should record ticks', () => {
    collector.recordTick();
    let metrics = collector.getMetrics();
    expect(metrics.ticksExecuted).toBe(1);

    collector.recordTick();
    metrics = collector.getMetrics();
    expect(metrics.ticksExecuted).toBe(2);
  });

  it('should record planning time', () => {
    collector.recordPlanning(10);
    collector.recordPlanning(20);

    const metrics = collector.getMetrics();
    expect(metrics.averagePlanningTimeMs).toBe(15);
  });

  it('should record decision count and time', () => {
    collector.recordDecision(5);
    let metrics = collector.getMetrics();
    expect(metrics.decisionsExecuted).toBe(1);
    expect(metrics.averageDecisionTimeMs).toBe(5);

    collector.recordDecision(15);
    metrics = collector.getMetrics();
    expect(metrics.decisionsExecuted).toBe(2);
    expect(metrics.averageDecisionTimeMs).toBe(10);
  });

  it('should record successful command executions', () => {
    collector.recordCommandExecution(true);
    let metrics = collector.getMetrics();
    expect(metrics.commandsExecuted).toBe(1);

    collector.recordCommandExecution(false);
    metrics = collector.getMetrics();
    expect(metrics.commandsExecuted).toBe(1);

    collector.recordCommandExecution(true);
    metrics = collector.getMetrics();
    expect(metrics.commandsExecuted).toBe(2);
  });

  it('should record errors', () => {
    collector.recordError();
    let metrics = collector.getMetrics();
    expect(metrics.errorsEncountered).toBe(1);

    collector.recordError();
    collector.recordError();
    metrics = collector.getMetrics();
    expect(metrics.errorsEncountered).toBe(3);
  });

  it('should update timestamp on each tick', () => {
    collector.recordTick();
    const metrics1 = collector.getMetrics();
    expect(metrics1.lastTickTimestamp).toBeGreaterThan(0);

    const timestamp1 = metrics1.lastTickTimestamp;

    // Wait a bit to ensure timestamp changes
    const start = Date.now();
    while (Date.now() === start) {
      // Spin to ensure time advances
    }

    collector.recordTick();
    const metrics2 = collector.getMetrics();
    expect(metrics2.lastTickTimestamp).toBeGreaterThanOrEqual(timestamp1);
  });

  it('should calculate correct average planning time', () => {
    collector.recordPlanning(10);
    collector.recordPlanning(20);
    collector.recordPlanning(30);

    const metrics = collector.getMetrics();
    expect(metrics.averagePlanningTimeMs).toBe(20);
  });

  it('should return frozen metrics', () => {
    const metrics = collector.getMetrics();
    expect(() => {
      (metrics as any).ticksExecuted = 999;
    }).toThrow();
  });

  it('should handle zero planning times gracefully', () => {
    const metrics = collector.getMetrics();
    expect(metrics.averagePlanningTimeMs).toBe(0);
  });

  it('should handle zero decision times gracefully', () => {
    const metrics = collector.getMetrics();
    expect(metrics.averageDecisionTimeMs).toBe(0);
  });

  it('should accumulate multiple operations', () => {
    for (let i = 0; i < 5; i++) {
      collector.recordTick();
      collector.recordPlanning(10 + i);
      collector.recordDecision(5 + i);
      collector.recordCommandExecution(true);
    }

    const metrics = collector.getMetrics();
    expect(metrics.ticksExecuted).toBe(5);
    expect(metrics.decisionsExecuted).toBe(5);
    expect(metrics.commandsExecuted).toBe(5);
    expect(metrics.errorsEncountered).toBe(0);
    expect(metrics.averagePlanningTimeMs).toBe(12);
    expect(metrics.averageDecisionTimeMs).toBe(7);
  });
});
