import { MissionAgent } from './mission-agent.js';

export interface EvaluationRun {
  readonly runId: string;
  readonly targetX: number;
  readonly targetY: number;
  readonly success: boolean;
  readonly ticksExecuted: number;
  readonly commandsExecuted: number;
  readonly totalScore: number;
}

export interface EvaluationStats {
  readonly totalRuns: number;
  readonly successCount: number;
  readonly successRate: number;
  readonly avgTicks: number;
  readonly avgScore: number;
  readonly minScore: number;
  readonly maxScore: number;
}

export class AIEvaluationSuite {
  private runs: EvaluationRun[] = [];

  async executeGame(targetX: number, targetY: number): Promise<EvaluationRun> {
    const agent = new MissionAgent(targetX, targetY);
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const trace = agent.getTrace();
    const metrics = agent.getGameplayMetrics();
    const gameplayMetrics = agent.getMetrics();

    const success = trace.events.some(e => e.eventType === 'mission_completed');
    const ticksExecuted = Math.max(...trace.events.map(e => e.tick), 0);
    const commandsExecuted = trace.events.filter(e => e.eventType.includes('command')).length;
    const totalScore = metrics.totalScore;

    const run: EvaluationRun = {
      runId: `run_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      targetX,
      targetY,
      success,
      ticksExecuted,
      commandsExecuted,
      totalScore,
    };

    this.runs.push(run);
    return run;
  }

  async executeBatch(targets: readonly { x: number; y: number }[]): Promise<readonly EvaluationRun[]> {
    const results: EvaluationRun[] = [];

    for (const target of targets) {
      try {
        const result = await this.executeGame(target.x, target.y);
        results.push(result);
      } catch (e) {
        console.warn(`Evaluation failed for target (${target.x}, ${target.y}):`, e);
      }
    }

    return results;
  }

  computeStatistics(): EvaluationStats {
    const totalRuns = this.runs.length;
    const successCount = this.runs.filter(r => r.success).length;
    const successRate = totalRuns > 0 ? successCount / totalRuns : 0;

    const scores = this.runs.map(r => r.totalScore);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

    const ticks = this.runs.map(r => r.ticksExecuted);
    const avgTicks = ticks.length > 0 ? ticks.reduce((a, b) => a + b, 0) / ticks.length : 0;

    return {
      totalRuns,
      successCount,
      successRate,
      avgTicks,
      avgScore,
      minScore,
      maxScore,
    };
  }

  detectRegressions(baselineStats: EvaluationStats, currentStats: EvaluationStats, threshold: number = 0.05): string[] {
    const issues: string[] = [];

    const successRatioDrop = baselineStats.successRate - currentStats.successRate;
    if (successRatioDrop > threshold) {
      issues.push(`Success rate regression: ${baselineStats.successRate.toFixed(2)} → ${currentStats.successRate.toFixed(2)}`);
    }

    const scoreDropPercent = (baselineStats.avgScore - currentStats.avgScore) / baselineStats.avgScore;
    if (scoreDropPercent > threshold) {
      issues.push(`Average score regression: ${baselineStats.avgScore.toFixed(3)} → ${currentStats.avgScore.toFixed(3)}`);
    }

    return issues;
  }

  getRuns(): readonly EvaluationRun[] {
    return this.runs;
  }

  getSummary(): string {
    const stats = this.computeStatistics();
    return [
      `Evaluation Summary:`,
      `  Total runs: ${stats.totalRuns}`,
      `  Successes: ${stats.successCount}/${stats.totalRuns}`,
      `  Success rate: ${(stats.successRate * 100).toFixed(1)}%`,
      `  Avg ticks: ${stats.avgTicks.toFixed(0)}`,
      `  Avg score: ${stats.avgScore.toFixed(3)}`,
      `  Score range: [${stats.minScore.toFixed(3)}, ${stats.maxScore.toFixed(3)}]`,
    ].join('\n');
  }
}
