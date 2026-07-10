/**
 * Story 51.2 — Parameter Sweeps
 *
 * Execute systematic parameter exploration.
 * Enable:
 * - Grid search over parameter spaces
 * - Random search for high-dimensional spaces
 * - Bayesian optimization for efficient exploration
 * - Parameter interaction analysis
 */

import { Logger } from '../config/logger.js';

export interface ParameterValue {
  name: string;
  value: any;
}

export interface SweepConfiguration {
  id: string;
  experimentId: string;
  strategy: 'grid' | 'random' | 'bayesian';
  parameters: {
    name: string;
    type: 'range' | 'discrete' | 'categorical';
    values?: any[];
    min?: number;
    max?: number;
    step?: number;
    samples?: number; // For random search
  }[];
  maxIterations: number;
  maxConcurrent?: number;
  createdAt: string;
}

export interface SweepIteration {
  iterationId: string;
  configuration: ParameterValue[];
  result?: {
    winRate: number;
    latency: number;
    cost: number;
    matchesRun: number;
  };
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
}

export interface SweepResults {
  sweepId: string;
  experimentId: string;
  strategy: string;
  totalIterations: number;
  completedIterations: number;
  bestConfiguration: ParameterValue[];
  bestScore: number;
  iterations: SweepIteration[];
  duration?: number;
}

export interface ParameterImportance {
  parameterName: string;
  importance: number; // 0-1
  meanImpact: number;
  variance: number;
}

export class ParameterSweeper {
  private sweeps: Map<string, SweepResults> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Generate grid search configurations
   */
  generateGridSearch(config: SweepConfiguration): ParameterValue[][] {
    const configurations: ParameterValue[][] = [];
    const parameterLists: any[][] = [];

    // Build parameter value lists
    for (const param of config.parameters) {
      const values: any[] = [];

      if (param.type === 'categorical' && param.values) {
        values.push(...param.values);
      } else if (param.type === 'discrete' && param.values) {
        values.push(...param.values);
      } else if (param.type === 'range' && param.min !== undefined && param.max !== undefined) {
        const step = param.step || 1;
        for (let v = param.min; v <= param.max; v += step) {
          values.push(v);
        }
      }

      parameterLists.push(values.map(v => ({ name: param.name, value: v })));
    }

    // Generate cartesian product
    const cartesianProduct = (arrays: any[][]): any[][] => {
      if (arrays.length === 0) return [[]];
      if (arrays.length === 1) return arrays[0].map(v => [v]);

      const [first, ...rest] = arrays;
      const products = cartesianProduct(rest);

      return first.flatMap(f => products.map(p => [f, ...p]));
    };

    const product = cartesianProduct(parameterLists);
    return product.slice(0, config.maxIterations);
  }

  /**
   * Generate random search configurations
   */
  generateRandomSearch(config: SweepConfiguration): ParameterValue[][] {
    const configurations: ParameterValue[][] = [];

    for (let i = 0; i < config.maxIterations; i++) {
      const configuration: ParameterValue[] = [];

      for (const param of config.parameters) {
        let value: any;

        if (param.type === 'categorical' && param.values) {
          value = param.values[Math.floor(Math.random() * param.values.length)];
        } else if (param.type === 'discrete' && param.values) {
          value = param.values[Math.floor(Math.random() * param.values.length)];
        } else if (param.type === 'range' && param.min !== undefined && param.max !== undefined) {
          value = param.min + Math.random() * (param.max - param.min);
        }

        configuration.push({ name: param.name, value });
      }

      configurations.push(configuration);
    }

    return configurations;
  }

  /**
   * Create a sweep
   */
  createSweep(config: SweepConfiguration): SweepResults {
    const strategy = config.strategy;
    let configurations: ParameterValue[][];

    if (strategy === 'grid') {
      configurations = this.generateGridSearch(config);
    } else if (strategy === 'random') {
      configurations = this.generateRandomSearch(config);
    } else {
      // Bayesian would be more complex; for now use random
      configurations = this.generateRandomSearch(config);
    }

    const iterations: SweepIteration[] = configurations.map((config, idx) => ({
      iterationId: `${config[0]}-iter-${idx}`,
      configuration: config,
      status: 'pending',
    }));

    const results: SweepResults = {
      sweepId: config.id,
      experimentId: config.experimentId,
      strategy: config.strategy,
      totalIterations: iterations.length,
      completedIterations: 0,
      bestConfiguration: [],
      bestScore: -Infinity,
      iterations,
    };

    this.sweeps.set(config.id, results);

    this.logger.info('Parameter sweep created', {
      sweepId: config.id,
      strategy: config.strategy,
      iterations: iterations.length,
    });

    return results;
  }

  /**
   * Record iteration result
   */
  recordResult(
    sweepId: string,
    iterationId: string,
    result: {
      winRate: number;
      latency: number;
      cost: number;
      matchesRun: number;
    }
  ): boolean {
    const sweep = this.sweeps.get(sweepId);
    if (!sweep) return false;

    const iteration = sweep.iterations.find(i => i.iterationId === iterationId);
    if (!iteration) return false;

    iteration.result = result;
    iteration.status = 'completed';
    iteration.endTime = new Date().toISOString();
    sweep.completedIterations++;

    // Calculate composite score (similar to model comparison)
    const score =
      result.winRate * 0.5 - (result.latency / 10000) * 0.25 - result.cost * 1000 * 0.25;

    if (score > sweep.bestScore) {
      sweep.bestScore = score;
      sweep.bestConfiguration = iteration.configuration;
    }

    return true;
  }

  /**
   * Get sweep results
   */
  getSweep(sweepId: string): SweepResults | null {
    return this.sweeps.get(sweepId) || null;
  }

  /**
   * Get best configuration from sweep
   */
  getBestConfiguration(sweepId: string): ParameterValue[] | null {
    const sweep = this.sweeps.get(sweepId);
    if (!sweep || sweep.bestConfiguration.length === 0) return null;
    return sweep.bestConfiguration;
  }

  /**
   * Get top N configurations
   */
  getTopConfigurations(
    sweepId: string,
    n: number = 5
  ): Array<{ configuration: ParameterValue[]; score: number }> {
    const sweep = this.sweeps.get(sweepId);
    if (!sweep) return [];

    const completed = sweep.iterations.filter(i => i.result && i.status === 'completed');

    const scored = completed.map(i => {
      const result = i.result!;
      const score =
        result.winRate * 0.5 - (result.latency / 10000) * 0.25 - result.cost * 1000 * 0.25;
      return { configuration: i.configuration, score };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, n);
  }

  /**
   * Analyze parameter importance
   */
  analyzeImportance(sweepId: string): ParameterImportance[] {
    const sweep = this.sweeps.get(sweepId);
    if (!sweep) return [];

    const completed = sweep.iterations.filter(i => i.result && i.status === 'completed');
    if (completed.length === 0) return [];

    const parameterNames = new Set<string>();
    for (const iter of completed) {
      for (const param of iter.configuration) {
        parameterNames.add(param.name);
      }
    }

    const importance: ParameterImportance[] = [];

    for (const paramName of parameterNames) {
      const groupedByValue: Record<string, number[]> = {};

      for (const iter of completed) {
        const paramValue = iter.configuration.find(p => p.name === paramName)?.value;
        const result = iter.result!;
        const score =
          result.winRate * 0.5 - (result.latency / 10000) * 0.25 - result.cost * 1000 * 0.25;

        const key = String(paramValue);
        if (!groupedByValue[key]) groupedByValue[key] = [];
        groupedByValue[key].push(score);
      }

      // Calculate variance in mean scores across values
      const meanScores = Object.values(groupedByValue).map(
        scores => scores.reduce((a, b) => a + b) / scores.length
      );

      const overallMean = meanScores.reduce((a, b) => a + b) / meanScores.length;
      const variance =
        meanScores.reduce((sum, mean) => sum + Math.pow(mean - overallMean, 2), 0) /
        meanScores.length;

      importance.push({
        parameterName: paramName,
        importance: Math.min(1, variance / (overallMean || 1)),
        meanImpact: overallMean,
        variance,
      });
    }

    return importance.sort((a, b) => b.importance - a.importance);
  }

  /**
   * Get parameter interaction effects
   */
  analyzeInteractions(sweepId: string, param1: string, param2: string): {
    param1: string;
    param2: string;
    interactions: Array<{
      value1: any;
      value2: any;
      avgScore: number;
      matchCount: number;
    }>;
  } {
    const sweep = this.sweeps.get(sweepId);
    if (!sweep) {
      return { param1, param2, interactions: [] };
    }

    const completed = sweep.iterations.filter(i => i.result && i.status === 'completed');
    const interactions: Record<string, number[]> = {};

    for (const iter of completed) {
      const val1 = iter.configuration.find(p => p.name === param1)?.value;
      const val2 = iter.configuration.find(p => p.name === param2)?.value;
      const result = iter.result!;
      const score =
        result.winRate * 0.5 - (result.latency / 10000) * 0.25 - result.cost * 1000 * 0.25;

      const key = `${val1}|${val2}`;
      if (!interactions[key]) interactions[key] = [];
      interactions[key].push(score);
    }

    const results = Object.entries(interactions).map(([key, scores]) => {
      const [value1, value2] = key.split('|');
      return {
        value1: isNaN(Number(value1)) ? value1 : Number(value1),
        value2: isNaN(Number(value2)) ? value2 : Number(value2),
        avgScore: scores.reduce((a, b) => a + b) / scores.length,
        matchCount: scores.length,
      };
    });

    return {
      param1,
      param2,
      interactions: results.sort((a, b) => b.avgScore - a.avgScore),
    };
  }

  /**
   * Export sweep results
   */
  exportResults(sweepId: string): string | null {
    const sweep = this.sweeps.get(sweepId);
    if (!sweep) return null;

    return JSON.stringify(
      {
        ...sweep,
        iterations: sweep.iterations.map(i => ({
          ...i,
          configuration: Object.fromEntries(i.configuration.map(p => [p.name, p.value])),
        })),
      },
      null,
      2
    );
  }

  /**
   * Clear all sweeps (for testing)
   */
  clear(): void {
    this.sweeps.clear();
  }
}
