/**
 * Story 48.1 — Model Registry
 *
 * Track every available AI model.
 * Maintain a registry of:
 * - Local Ollama models
 * - Remote API models (OpenAI, Claude, Gemini)
 * - Built-in game AI (Petra)
 * - Custom models
 */

import { Logger } from '../config/logger.js';

export type ModelType = 'ollama' | 'openai' | 'claude' | 'gemini' | 'petra' | 'custom';

export type ModelStatus = 'available' | 'unavailable' | 'unknown' | 'loading';

export interface ModelProfile {
  id: string;
  name: string;
  type: ModelType;
  status: ModelStatus;
  version?: string;
  provider?: string;
  endpoint?: string;
  capabilities: {
    contextWindow: number; // Max tokens
    streaming: boolean;
    functionCalling: boolean;
    multimodal: boolean;
    costPerMTok?: number; // For API models
  };
  metadata: Record<string, any>;
  lastChecked?: string; // ISO timestamp
  createdAt: string;
  updatedAt: string;
}

export interface ModelDetectionResult {
  found: string[];
  unavailable: string[];
  errors: Array<{ model: string; error: string }>;
}

export class ModelRegistry {
  private models: Map<string, ModelProfile> = new Map();
  private logger: Logger;
  private persistPath?: string;

  constructor(logger: Logger, persistPath?: string) {
    this.logger = logger;
    this.persistPath = persistPath;
    this.initializeDefaultModels();
  }

  /**
   * Initialize built-in default models
   */
  private initializeDefaultModels(): void {
    // Petra AI (built-in to 0 A.D.)
    this.registerModel({
      id: 'petra-builtin',
      name: 'Petra',
      type: 'petra',
      status: 'available',
      version: '0.26.13',
      provider: '0 A.D.',
      capabilities: {
        contextWindow: 8192,
        streaming: false,
        functionCalling: false,
        multimodal: false,
      },
      metadata: {
        builtIn: true,
        difficulty: ['easy', 'moderate', 'hard', 'veryhard'],
        strategies: ['aggressive', 'balanced', 'defensive', 'economic'],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Register a new model in the registry
   */
  registerModel(profile: ModelProfile): void {
    this.models.set(profile.id, {
      ...profile,
      updatedAt: new Date().toISOString(),
    });

    this.logger.info('Model registered', {
      id: profile.id,
      name: profile.name,
      type: profile.type,
    });
  }

  /**
   * Get a model by ID
   */
  getModel(id: string): ModelProfile | null {
    return this.models.get(id) || null;
  }

  /**
   * List all registered models
   */
  listModels(filter?: { type?: ModelType; status?: ModelStatus }): ModelProfile[] {
    let models = Array.from(this.models.values());

    if (filter?.type) {
      models = models.filter(m => m.type === filter.type);
    }

    if (filter?.status) {
      models = models.filter(m => m.status === filter.status);
    }

    return models.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Update model status
   */
  updateStatus(id: string, status: ModelStatus): boolean {
    const model = this.models.get(id);
    if (!model) return false;

    model.status = status;
    model.lastChecked = new Date().toISOString();
    model.updatedAt = new Date().toISOString();

    this.logger.info('Model status updated', { id, status });
    return true;
  }

  /**
   * Check if a model is available
   */
  isAvailable(id: string): boolean {
    const model = this.models.get(id);
    return model?.status === 'available';
  }

  /**
   * Remove a model from registry
   */
  unregisterModel(id: string): boolean {
    if (this.models.delete(id)) {
      this.logger.info('Model unregistered', { id });
      return true;
    }
    return false;
  }

  /**
   * Get all models by type
   */
  getModelsByType(type: ModelType): ModelProfile[] {
    return this.listModels({ type });
  }

  /**
   * Find Ollama models (check against local endpoint)
   */
  async detectOllamaModels(endpoint: string = 'http://localhost:11434'): Promise<ModelDetectionResult> {
    const result: ModelDetectionResult = {
      found: [],
      unavailable: [],
      errors: [],
    };

    try {
      const response = await fetch(`${endpoint}/api/tags`);
      if (!response.ok) {
        this.logger.warn('Ollama endpoint not responding', { endpoint, status: response.status });
        return result;
      }

      const data = (await response.json()) as { models?: Array<{ name: string }> };
      const models = data.models || [];

      for (const model of models) {
        const modelId = `ollama-${model.name}`;
        this.registerModel({
          id: modelId,
          name: model.name,
          type: 'ollama',
          status: 'available',
          version: '1.0', // Would need to fetch more details for version
          provider: 'Ollama',
          endpoint,
          capabilities: {
            contextWindow: 4096,
            streaming: true,
            functionCalling: false,
            multimodal: false,
          },
          metadata: {
            source: 'ollama',
            detectedAt: new Date().toISOString(),
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        result.found.push(modelId);
      }

      this.logger.info('Ollama models detected', { count: result.found.length, endpoint });
    } catch (error) {
      this.logger.error('Failed to detect Ollama models', { endpoint, error });
      result.errors.push({
        model: 'ollama-*',
        error: String(error),
      });
    }

    return result;
  }

  /**
   * Register OpenAI models
   */
  registerOpenAIModels(apiKey?: string): void {
    const models = [
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        type: 'openai',
        contextWindow: 128000,
        costPerMTok: 0.01,
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        type: 'openai',
        contextWindow: 8192,
        costPerMTok: 0.03,
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        type: 'openai',
        contextWindow: 4096,
        costPerMTok: 0.0005,
      },
    ];

    for (const model of models) {
      this.registerModel({
        id: model.id,
        name: model.name,
        type: model.type as ModelType,
        status: apiKey ? 'available' : 'unavailable',
        provider: 'OpenAI',
        endpoint: 'https://api.openai.com/v1',
        capabilities: {
          contextWindow: model.contextWindow,
          streaming: true,
          functionCalling: true,
          multimodal: false,
          costPerMTok: model.costPerMTok,
        },
        metadata: {
          source: 'openai',
          requiresAuth: true,
          authenticated: !!apiKey,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    this.logger.info('OpenAI models registered', { count: models.length });
  }

  /**
   * Register Claude models
   */
  registerClaudeModels(apiKey?: string): void {
    const models = [
      {
        id: 'claude-opus-4-8',
        name: 'Claude Opus 4.8',
        type: 'claude',
        contextWindow: 200000,
        costPerMTok: 0.015,
      },
      {
        id: 'claude-sonnet-5',
        name: 'Claude Sonnet 5',
        type: 'claude',
        contextWindow: 200000,
        costPerMTok: 0.003,
      },
      {
        id: 'claude-haiku-4-5',
        name: 'Claude Haiku 4.5',
        type: 'claude',
        contextWindow: 200000,
        costPerMTok: 0.0008,
      },
    ];

    for (const model of models) {
      this.registerModel({
        id: model.id,
        name: model.name,
        type: model.type as ModelType,
        status: apiKey ? 'available' : 'unavailable',
        provider: 'Anthropic',
        endpoint: 'https://api.anthropic.com/v1',
        capabilities: {
          contextWindow: model.contextWindow,
          streaming: true,
          functionCalling: true,
          multimodal: true,
          costPerMTok: model.costPerMTok,
        },
        metadata: {
          source: 'anthropic',
          requiresAuth: true,
          authenticated: !!apiKey,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    this.logger.info('Claude models registered', { count: models.length });
  }

  /**
   * Register Gemini models
   */
  registerGeminiModels(apiKey?: string): void {
    const models = [
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        type: 'gemini',
        contextWindow: 1000000,
        costPerMTok: 0.001,
      },
      {
        id: 'gemini-2.0-pro',
        name: 'Gemini 2.0 Pro',
        type: 'gemini',
        contextWindow: 1000000,
        costPerMTok: 0.005,
      },
    ];

    for (const model of models) {
      this.registerModel({
        id: model.id,
        name: model.name,
        type: model.type as ModelType,
        status: apiKey ? 'available' : 'unavailable',
        provider: 'Google',
        endpoint: 'https://generativelanguage.googleapis.com',
        capabilities: {
          contextWindow: model.contextWindow,
          streaming: true,
          functionCalling: true,
          multimodal: true,
          costPerMTok: model.costPerMTok,
        },
        metadata: {
          source: 'google',
          requiresAuth: true,
          authenticated: !!apiKey,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    this.logger.info('Gemini models registered', { count: models.length });
  }

  /**
   * Get registry statistics
   */
  getStatistics(): {
    totalModels: number;
    byType: Record<ModelType, number>;
    available: number;
    unavailable: number;
  } {
    const stats = {
      totalModels: this.models.size,
      byType: {
        ollama: 0,
        openai: 0,
        claude: 0,
        gemini: 0,
        petra: 0,
        custom: 0,
      } as Record<ModelType, number>,
      available: 0,
      unavailable: 0,
    };

    for (const model of this.models.values()) {
      stats.byType[model.type]++;
      if (model.status === 'available') {
        stats.available++;
      } else if (model.status === 'unavailable') {
        stats.unavailable++;
      }
    }

    return stats;
  }

  /**
   * Export registry as JSON
   */
  exportRegistry(): string {
    const models = Array.from(this.models.values());
    return JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        models,
      },
      null,
      2
    );
  }

  /**
   * Import registry from JSON
   */
  importRegistry(json: string): boolean {
    try {
      const data = JSON.parse(json);
      if (data.version !== '1.0' || !Array.isArray(data.models)) {
        this.logger.error('Invalid registry format');
        return false;
      }

      for (const model of data.models) {
        this.registerModel(model);
      }

      this.logger.info('Registry imported', { modelCount: data.models.length });
      return true;
    } catch (error) {
      this.logger.error('Failed to import registry', { error });
      return false;
    }
  }
}
