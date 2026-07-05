import type { ExecutionTrace } from './execution-trace.js';

export interface ReplayQuery {
  readonly eventType?: string;
  readonly startTick?: number;
  readonly endTick?: number;
  readonly dataKey?: string;
  readonly dataValue?: any;
}

export interface ReplayEvent {
  readonly tick: number;
  readonly eventType: string;
  readonly data: Record<string, any>;
}

export interface MatchStatistics {
  readonly totalTicks: number;
  readonly totalEvents: number;
  readonly eventTypeCount: Record<string, number>;
  readonly decisionsCount: number;
  readonly commandsCount: number;
  readonly failuresCount: number;
  readonly success: boolean;
  readonly completionPercent: number;
}

export class ReplayManager {
  private trace: ExecutionTrace;

  constructor(trace: ExecutionTrace) {
    this.trace = trace;
  }

  /**
   * Search for events matching query criteria.
   */
  search(query: ReplayQuery): readonly ReplayEvent[] {
    let results = this.trace.events;

    if (query.eventType) {
      results = results.filter(e => e.eventType === query.eventType);
    }

    if (query.startTick !== undefined) {
      results = results.filter(e => e.tick >= query.startTick!);
    }

    if (query.endTick !== undefined) {
      results = results.filter(e => e.tick <= query.endTick!);
    }

    if (query.dataKey && query.dataValue !== undefined) {
      results = results.filter(e => (e.data as any)[query.dataKey] === query.dataValue);
    }

    return results.map(e => ({
      tick: e.tick,
      eventType: e.eventType,
      data: e.data || {},
    }));
  }

  /**
   * Get decision history with context.
   */
  getDecisionHistory(): readonly ReplayEvent[] {
    return this.search({ eventType: 'decision_made' });
  }

  /**
   * Get events by type.
   */
  getEventsByType(eventType: string): readonly ReplayEvent[] {
    return this.search({ eventType });
  }

  /**
   * Get events in tick range.
   */
  getEventsByTickRange(startTick: number, endTick: number): readonly ReplayEvent[] {
    return this.search({ startTick, endTick });
  }

  /**
   * Compute match statistics from trace.
   */
  computeStatistics(): MatchStatistics {
    const eventCounts: Record<string, number> = {};
    let decisionsCount = 0;
    let commandsCount = 0;
    let failuresCount = 0;
    let maxTick = 0;
    let success = false;

    for (const event of this.trace.events) {
      eventCounts[event.eventType] = (eventCounts[event.eventType] || 0) + 1;
      maxTick = Math.max(maxTick, event.tick);

      if (event.eventType.includes('decision')) {
        decisionsCount++;
      }
      if (event.eventType.includes('command')) {
        commandsCount++;
      }
      if (event.eventType.includes('failure') || event.eventType.includes('failed')) {
        failuresCount++;
      }
      if (event.eventType === 'mission_completed') {
        success = true;
      }
    }

    const totalEvents = this.trace.events.length;
    const completionPercent = success ? 100 : 0;

    return {
      totalTicks: maxTick,
      totalEvents,
      eventTypeCount: eventCounts,
      decisionsCount,
      commandsCount,
      failuresCount,
      success,
      completionPercent,
    };
  }

  /**
   * Get performance summary.
   */
  getSummary(): string {
    const stats = this.computeStatistics();
    const lines = [
      `Match Statistics:`,
      `  Total ticks: ${stats.totalTicks}`,
      `  Total events: ${stats.totalEvents}`,
      `  Decisions: ${stats.decisionsCount}`,
      `  Commands: ${stats.commandsCount}`,
      `  Failures: ${stats.failuresCount}`,
      `  Status: ${stats.success ? 'SUCCESS' : 'FAILED'}`,
      `  Completion: ${stats.completionPercent}%`,
    ];
    return lines.join('\n');
  }
}
