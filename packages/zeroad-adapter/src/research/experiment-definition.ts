/**
 * Story 51.1 — Experiment Definition
 *
 * Define and manage research experiments with parameters.
 * Enable:
 * - Experiment templates for common research patterns
 * - Parameter sweeps and configurations
 * - Hypothesis tracking and validation
 * - Research goals and success criteria
 */

import { Logger } from '../config/logger.js';

export interface ExperimentParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'range';
  description?: string;
  default?: any;
  values?: any[]; // For 'select' type
  min?: number; // For 'range' type
  max?: number;
  step?: number;
}

export interface SuccessCriteria {
  metric: 'winRate' | 'latency' | 'cost' | 'consistency' | 'custom';
  threshold: number;
  operator: '>' | '<' | '==' | '>=' | '<=';
  description?: string;
}

export interface ExperimentGoal {
  objective: string;
  hypothesis: string;
  successCriteria: SuccessCriteria[];
  estimatedDuration?: number; // days
  priority?: 'low' | 'medium' | 'high';
}

export interface ResearchVariant {
  id: string;
  name: string;
  description?: string;
  parameters: Record<string, any>;
}

export interface ExperimentDefinition {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  author?: string;
  goal: ExperimentGoal;
  baselineVariant: ResearchVariant;
  treatmentVariants: ResearchVariant[];
  parameters: ExperimentParameter[];
  minSampleSize?: number;
  confidenceLevel?: number; // 0.90, 0.95, 0.99
  tags?: string[];
  status: 'draft' | 'planned' | 'running' | 'completed' | 'archived';
}

export class ExperimentDefinitionManager {
  private experiments: Map<string, ExperimentDefinition> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Create a new experiment definition
   */
  createExperiment(definition: ExperimentDefinition): ExperimentDefinition {
    this.experiments.set(definition.id, definition);

    this.logger.info('Experiment definition created', {
      experimentId: definition.id,
      title: definition.title,
      variants: definition.treatmentVariants.length,
    });

    return definition;
  }

  /**
   * Get experiment by ID
   */
  getExperiment(experimentId: string): ExperimentDefinition | null {
    return this.experiments.get(experimentId) || null;
  }

  /**
   * List all experiments with optional filtering
   */
  listExperiments(filter?: { status?: string; tag?: string }): ExperimentDefinition[] {
    let experiments = Array.from(this.experiments.values());

    if (filter?.status) {
      experiments = experiments.filter(e => e.status === filter.status);
    }

    if (filter?.tag) {
      experiments = experiments.filter(e => e.tags?.includes(filter.tag!));
    }

    return experiments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Update experiment definition
   */
  updateExperiment(experimentId: string, updates: Partial<ExperimentDefinition>): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return false;

    Object.assign(experiment, updates);
    this.logger.info('Experiment updated', { experimentId });
    return true;
  }

  /**
   * Change experiment status
   */
  setStatus(experimentId: string, status: ExperimentDefinition['status']): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return false;

    experiment.status = status;
    this.logger.info('Experiment status changed', { experimentId, status });
    return true;
  }

  /**
   * Add a tag to experiment
   */
  addTag(experimentId: string, tag: string): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return false;

    if (!experiment.tags) experiment.tags = [];
    if (!experiment.tags.includes(tag)) {
      experiment.tags.push(tag);
    }

    return true;
  }

  /**
   * Clone an experiment for iteration
   */
  cloneExperiment(
    experimentId: string,
    newId: string,
    updates?: Partial<ExperimentDefinition>
  ): ExperimentDefinition | null {
    const original = this.experiments.get(experimentId);
    if (!original) return null;

    const clone: ExperimentDefinition = JSON.parse(JSON.stringify(original));
    clone.id = newId;
    clone.createdAt = new Date().toISOString();
    clone.status = 'draft';

    if (updates) {
      Object.assign(clone, updates);
    }

    this.experiments.set(newId, clone);
    this.logger.info('Experiment cloned', { original: experimentId, clone: newId });

    return clone;
  }

  /**
   * Create experiment from template
   */
  createFromTemplate(
    templateId: string,
    newId: string,
    customizations?: Partial<ExperimentDefinition>
  ): ExperimentDefinition | null {
    const template = this.getTemplate(templateId);
    if (!template) return null;

    const experiment: ExperimentDefinition = {
      ...template,
      id: newId,
      createdAt: new Date().toISOString(),
      status: 'draft',
      ...customizations,
    };

    return this.createExperiment(experiment);
  }

  /**
   * Get predefined experiment templates
   */
  getTemplate(templateId: string): ExperimentDefinition | null {
    const templates: Record<string, ExperimentDefinition> = {
      'ab-test': {
        id: 'template-ab-test',
        title: 'A/B Test Template',
        description: 'Standard A/B test for comparing two variants',
        createdAt: new Date().toISOString(),
        goal: {
          objective: 'Determine which variant performs better',
          hypothesis: 'Treatment variant outperforms control',
          successCriteria: [
            {
              metric: 'winRate',
              threshold: 0.05,
              operator: '>',
              description: '5% win rate improvement',
            },
          ],
          estimatedDuration: 7,
        },
        baselineVariant: {
          id: 'control',
          name: 'Control (Baseline)',
          parameters: {},
        },
        treatmentVariants: [
          {
            id: 'treatment',
            name: 'Treatment (Test)',
            parameters: {},
          },
        ],
        parameters: [],
        minSampleSize: 30,
        confidenceLevel: 0.95,
        status: 'draft',
      },

      'parameter-sweep': {
        id: 'template-param-sweep',
        title: 'Parameter Sweep Template',
        description: 'Systematic exploration of parameter space',
        createdAt: new Date().toISOString(),
        goal: {
          objective: 'Find optimal parameter values',
          hypothesis: 'Optimal parameters exist within search range',
          successCriteria: [
            {
              metric: 'winRate',
              threshold: 0.7,
              operator: '>=',
              description: 'Achieve at least 70% win rate',
            },
          ],
          priority: 'high',
        },
        baselineVariant: {
          id: 'baseline',
          name: 'Baseline Configuration',
          parameters: {},
        },
        treatmentVariants: [],
        parameters: [
          {
            name: 'temperature',
            type: 'range',
            description: 'Model temperature for randomness',
            min: 0.0,
            max: 2.0,
            step: 0.2,
            default: 0.7,
          },
          {
            name: 'topP',
            type: 'range',
            description: 'Nucleus sampling parameter',
            min: 0.8,
            max: 1.0,
            step: 0.05,
            default: 0.95,
          },
        ],
        minSampleSize: 50,
        status: 'draft',
      },

      'model-comparison': {
        id: 'template-model-comparison',
        title: 'Model Comparison Template',
        description: 'Compare performance of multiple AI models',
        createdAt: new Date().toISOString(),
        goal: {
          objective: 'Rank models by performance',
          hypothesis: 'Different models have significantly different performance',
          successCriteria: [
            {
              metric: 'consistency',
              threshold: 0.8,
              operator: '>=',
              description: 'Win rate std dev < 20%',
            },
          ],
        },
        baselineVariant: {
          id: 'model-baseline',
          name: 'Baseline Model',
          parameters: { model: 'baseline' },
        },
        treatmentVariants: [
          {
            id: 'model-1',
            name: 'Model 1',
            parameters: { model: 'model-1' },
          },
          {
            id: 'model-2',
            name: 'Model 2',
            parameters: { model: 'model-2' },
          },
        ],
        parameters: [
          {
            name: 'model',
            type: 'select',
            description: 'AI model to evaluate',
            values: ['baseline', 'model-1', 'model-2'],
          },
        ],
        minSampleSize: 40,
        status: 'draft',
      },
    };

    return templates[templateId] || null;
  }

  /**
   * List all available templates
   */
  listTemplates(): Array<{ id: string; title: string; description?: string }> {
    return [
      {
        id: 'ab-test',
        title: 'A/B Test Template',
        description: 'Standard A/B test for comparing two variants',
      },
      {
        id: 'parameter-sweep',
        title: 'Parameter Sweep Template',
        description: 'Systematic exploration of parameter space',
      },
      {
        id: 'model-comparison',
        title: 'Model Comparison Template',
        description: 'Compare performance of multiple AI models',
      },
    ];
  }

  /**
   * Validate experiment definition
   */
  validateExperiment(definition: ExperimentDefinition): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!definition.id) errors.push('Experiment ID is required');
    if (!definition.title) errors.push('Title is required');
    if (!definition.goal) errors.push('Goal is required');
    if (!definition.baselineVariant) errors.push('Baseline variant is required');
    if (!definition.goal.successCriteria || definition.goal.successCriteria.length === 0) {
      errors.push('At least one success criterion is required');
    }

    if (definition.minSampleSize && definition.minSampleSize < 10) {
      errors.push('Minimum sample size should be at least 10');
    }

    if (definition.confidenceLevel) {
      if (definition.confidenceLevel < 0.8 || definition.confidenceLevel > 0.99) {
        errors.push('Confidence level should be between 0.80 and 0.99');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Export experiment definition
   */
  exportDefinition(experimentId: string): string | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    return JSON.stringify(experiment, null, 2);
  }

  /**
   * Import experiment definition
   */
  importDefinition(json: string): ExperimentDefinition | null {
    try {
      const definition = JSON.parse(json) as ExperimentDefinition;
      const validation = this.validateExperiment(definition);

      if (!validation.valid) {
        this.logger.warn('Invalid experiment definition', { errors: validation.errors });
        return null;
      }

      return this.createExperiment(definition);
    } catch (error) {
      this.logger.error('Failed to import experiment definition', { error });
      return null;
    }
  }

  /**
   * Get experiment statistics
   */
  getStatistics(): {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
  } {
    const experiments = Array.from(this.experiments.values());
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const exp of experiments) {
      byStatus[exp.status] = (byStatus[exp.status] || 0) + 1;

      const priority = exp.goal.priority || 'medium';
      byPriority[priority] = (byPriority[priority] || 0) + 1;
    }

    return {
      total: experiments.length,
      byStatus,
      byPriority,
    };
  }

  /**
   * Clear all definitions (for testing)
   */
  clear(): void {
    this.experiments.clear();
  }
}
