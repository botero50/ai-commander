/**
 * Story 49.4 — Prompt Experiment Tracking
 *
 * Track prompt usage and outcomes across matches.
 * Enable analysis of:
 * - Which prompts are being used across matches
 * - Experiment results and performance trends
 * - Prompt adoption and effectiveness
 * - Experiment-to-experiment comparisons
 */

import { Logger } from '../config/logger.js';

export interface ExperimentConfig {
  id: string;
  name: string;
  description?: string;
  hypothesis?: string;
  startDate: string;
  endDate?: string;
  control: string; // baseline prompt version
  treatment: string; // experimental prompt version
  targetMetric?: 'winRate' | 'latency' | 'cost' | 'composite';
  minSampleSize?: number;
  confidenceLevel?: number; // 0.90, 0.95, 0.99
}

export interface ExperimentResult {
  experimentId: string;
  status: 'running' | 'completed' | 'abandoned';
  controlMatches: number;
  treatmentMatches: number;
  controlWinRate: number;
  treatmentWinRate: number;
  winRateImprovement: number; // percentage points
  controlLatency: number;
  treatmentLatency: number;
  latencyImprovement: number; // percentage (negative = slower)
  controlCost: number;
  treatmentCost: number;
  costImprovement: number; // percentage (negative = more expensive)
  statistically_significant: boolean;
  confidence: number; // 0-1
  recommendation: 'use_treatment' | 'use_control' | 'continue_testing';
}

export interface PromptExperiment {
  experimentId: string;
  config: ExperimentConfig;
  matches: Array<{
    matchId: string;
    promptVersion: string;
    isControl: boolean;
    outcome: {
      won: boolean;
      latency: number;
      cost: number;
      duration: number;
    };
  }>;
  result?: ExperimentResult;
  createdAt: string;
  updatedAt: string;
}

export class ExperimentTracker {
  private experiments: Map<string, PromptExperiment> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Create a new experiment
   */
  createExperiment(config: ExperimentConfig): PromptExperiment {
    const experiment: PromptExperiment = {
      experimentId: config.id,
      config,
      matches: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.experiments.set(config.id, experiment);

    this.logger.info('Experiment created', {
      experimentId: config.id,
      control: config.control,
      treatment: config.treatment,
    });

    return experiment;
  }

  /**
   * Record a match for an experiment
   */
  recordExperimentMatch(
    experimentId: string,
    matchId: string,
    promptVersion: string,
    outcome: {
      won: boolean;
      latency: number;
      cost: number;
      duration: number;
    }
  ): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      this.logger.warn('Experiment not found', { experimentId });
      return false;
    }

    const isControl = promptVersion === experiment.config.control;
    const isTreatment = promptVersion === experiment.config.treatment;

    if (!isControl && !isTreatment) {
      this.logger.warn('Prompt version not part of experiment', {
        experimentId,
        promptVersion,
      });
      return false;
    }

    experiment.matches.push({
      matchId,
      promptVersion,
      isControl,
      outcome,
    });

    experiment.updatedAt = new Date().toISOString();

    // Auto-calculate result if enough data
    this.calculateResult(experimentId);

    this.logger.info('Match recorded for experiment', {
      experimentId,
      matchId,
      promptVersion,
      won: outcome.won,
    });

    return true;
  }

  /**
   * Calculate experiment results
   */
  calculateResult(experimentId: string): ExperimentResult | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    const controlMatches = experiment.matches.filter(m => m.isControl);
    const treatmentMatches = experiment.matches.filter(m => !m.isControl);

    if (controlMatches.length === 0 || treatmentMatches.length === 0) {
      return null;
    }

    const controlWins = controlMatches.filter(m => m.outcome.won).length;
    const treatmentWins = treatmentMatches.filter(m => m.outcome.won).length;

    const controlWinRate = controlWins / controlMatches.length;
    const treatmentWinRate = treatmentWins / treatmentMatches.length;
    const winRateImprovement = (treatmentWinRate - controlWinRate) * 100;

    const controlLatency =
      controlMatches.reduce((sum, m) => sum + m.outcome.latency, 0) /
      controlMatches.length;
    const treatmentLatency =
      treatmentMatches.reduce((sum, m) => sum + m.outcome.latency, 0) /
      treatmentMatches.length;
    const latencyImprovement = ((controlLatency - treatmentLatency) / controlLatency) * 100;

    const controlCost =
      controlMatches.reduce((sum, m) => sum + m.outcome.cost, 0) / controlMatches.length;
    const treatmentCost =
      treatmentMatches.reduce((sum, m) => sum + m.outcome.cost, 0) / treatmentMatches.length;
    const costImprovement = ((controlCost - treatmentCost) / controlCost) * 100;

    // Simple statistical significance (chi-square approximation)
    const chi2 = this.calculateChiSquare(
      controlWins,
      controlMatches.length - controlWins,
      treatmentWins,
      treatmentMatches.length - treatmentWins
    );
    const statistically_significant = chi2 > 3.841; // p < 0.05

    // Confidence based on sample size and improvement
    const minSampleSize = experiment.config.minSampleSize || 30;
    const sampleSizeFactor = Math.min(
      1,
      Math.max(controlMatches.length, treatmentMatches.length) / minSampleSize
    );
    const improvementFactor = Math.min(1, Math.abs(winRateImprovement) / 10); // 10% improvement = max confidence
    const confidence = sampleSizeFactor * 0.6 + improvementFactor * 0.4;

    let recommendation: 'use_treatment' | 'use_control' | 'continue_testing';

    if (statistically_significant) {
      if (winRateImprovement > 0 && treatmentWinRate > controlWinRate) {
        recommendation = 'use_treatment';
      } else if (winRateImprovement < 0) {
        recommendation = 'use_control';
      } else {
        recommendation = 'continue_testing';
      }
    } else if (confidence < 0.7) {
      recommendation = 'continue_testing';
    } else if (winRateImprovement > 5) {
      recommendation = 'use_treatment';
    } else if (winRateImprovement < -5) {
      recommendation = 'use_control';
    } else {
      recommendation = 'continue_testing';
    }

    const result: ExperimentResult = {
      experimentId,
      status: 'running',
      controlMatches: controlMatches.length,
      treatmentMatches: treatmentMatches.length,
      controlWinRate,
      treatmentWinRate,
      winRateImprovement,
      controlLatency,
      treatmentLatency,
      latencyImprovement,
      controlCost,
      treatmentCost,
      costImprovement,
      statistically_significant,
      confidence,
      recommendation,
    };

    experiment.result = result;
    return result;
  }

  /**
   * Chi-square statistic for independence test
   */
  private calculateChiSquare(
    controlWins: number,
    controlLosses: number,
    treatmentWins: number,
    treatmentLosses: number
  ): number {
    const n = controlWins + controlLosses + treatmentWins + treatmentLosses;
    const controlTotal = controlWins + controlLosses;
    const treatmentTotal = treatmentWins + treatmentLosses;
    const winsTotal = controlWins + treatmentWins;
    const lossesTotal = controlLosses + treatmentLosses;

    const expectedControlWins = (controlTotal * winsTotal) / n;
    const expectedTreatmentWins = (treatmentTotal * winsTotal) / n;
    const expectedControlLosses = (controlTotal * lossesTotal) / n;
    const expectedTreatmentLosses = (treatmentTotal * lossesTotal) / n;

    const chi2 =
      Math.pow(controlWins - expectedControlWins, 2) / expectedControlWins +
      Math.pow(treatmentWins - expectedTreatmentWins, 2) / expectedTreatmentWins +
      Math.pow(controlLosses - expectedControlLosses, 2) / expectedControlLosses +
      Math.pow(treatmentLosses - expectedTreatmentLosses, 2) / expectedTreatmentLosses;

    return chi2;
  }

  /**
   * Get experiment by ID
   */
  getExperiment(experimentId: string): PromptExperiment | null {
    return this.experiments.get(experimentId) || null;
  }

  /**
   * List all experiments
   */
  listExperiments(filter?: {
    status?: 'running' | 'completed' | 'abandoned';
  }): PromptExperiment[] {
    const experiments = Array.from(this.experiments.values());

    if (filter?.status) {
      return experiments.filter(e => e.result?.status === filter.status);
    }

    return experiments;
  }

  /**
   * Complete an experiment
   */
  completeExperiment(experimentId: string): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || !experiment.result) {
      return false;
    }

    experiment.result.status = 'completed';
    experiment.config.endDate = new Date().toISOString();
    experiment.updatedAt = new Date().toISOString();

    this.logger.info('Experiment completed', {
      experimentId,
      recommendation: experiment.result.recommendation,
    });

    return true;
  }

  /**
   * Abandon an experiment
   */
  abandonExperiment(experimentId: string, reason?: string): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      return false;
    }

    if (experiment.result) {
      experiment.result.status = 'abandoned';
    }
    experiment.config.endDate = new Date().toISOString();
    experiment.updatedAt = new Date().toISOString();

    this.logger.info('Experiment abandoned', { experimentId, reason });

    return true;
  }

  /**
   * Get matches for experiment
   */
  getExperimentMatches(experimentId: string): PromptExperiment['matches'] | null {
    const experiment = this.experiments.get(experimentId);
    return experiment?.matches || null;
  }

  /**
   * Compare multiple experiments
   */
  compareExperiments(experimentIds: string[]): Array<{
    experimentId: string;
    name: string;
    matchCount: number;
    recommendation: string;
    winRateImprovement: number;
  }> {
    return experimentIds
      .map(id => {
        const experiment = this.experiments.get(id);
        if (!experiment || !experiment.result) return null;

        return {
          experimentId: id,
          name: experiment.config.name,
          matchCount: experiment.result.controlMatches + experiment.result.treatmentMatches,
          recommendation: experiment.result.recommendation,
          winRateImprovement: experiment.result.winRateImprovement,
        };
      })
      .filter(Boolean) as Array<{
      experimentId: string;
      name: string;
      matchCount: number;
      recommendation: string;
      winRateImprovement: number;
    }>;
  }

  /**
   * Export experiment data
   */
  exportExperiment(experimentId: string): string | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    const data = {
      config: experiment.config,
      result: experiment.result,
      matchCount: experiment.matches.length,
      createdAt: experiment.createdAt,
      updatedAt: experiment.updatedAt,
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Get experiment statistics
   */
  getStatistics(): {
    totalExperiments: number;
    runningExperiments: number;
    completedExperiments: number;
    totalMatches: number;
    avgMatchesPerExperiment: number;
  } {
    const experiments = Array.from(this.experiments.values());
    const running = experiments.filter(e => !e.result || e.result.status === 'running').length;
    const completed = experiments.filter(e => e.result?.status === 'completed').length;
    const totalMatches = experiments.reduce((sum, e) => sum + e.matches.length, 0);

    return {
      totalExperiments: experiments.length,
      runningExperiments: running,
      completedExperiments: completed,
      totalMatches,
      avgMatchesPerExperiment:
        experiments.length > 0 ? totalMatches / experiments.length : 0,
    };
  }

  /**
   * Clear all data (for testing)
   */
  clearData(): void {
    this.experiments.clear();
  }
}
