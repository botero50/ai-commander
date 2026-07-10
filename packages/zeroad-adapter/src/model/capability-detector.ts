/**
 * Story 48.3 — Capability Detection
 *
 * Automatically detect model capabilities across providers:
 * - Ollama (local models)
 * - OpenAI (GPT models)
 * - Claude (Anthropic)
 * - Gemini (Google)
 */

import { Logger } from '../config/logger.js';
import type { ModelProfile } from './model-registry.js';

export interface DetectionResult {
  provider: string;
  modelId: string;
  modelName: string;
  detected: boolean;
  available: boolean;
  capabilities: {
    contextWindow: number;
    streaming: boolean;
    functionCalling: boolean;
    multimodal: boolean;
    vision?: boolean;
    audio?: boolean;
    costPerMTok?: number;
  };
  version?: string;
  error?: string;
  timestamp: string;
}

export interface DetectionOptions {
  ollamaEndpoint?: string;
  openaiKey?: string;
  claudeKey?: string;
  geminiKey?: string;
  timeout?: number;
}

export class CapabilityDetector {
  private logger: Logger;
  private detectionCache: Map<string, DetectionResult> = new Map();
  private cacheTimeout: number = 3600000; // 1 hour

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Detect all available models across all providers
   */
  async detectAll(options: DetectionOptions = {}): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];
    const timeout = options.timeout || 5000;

    // Detect Ollama
    if (options.ollamaEndpoint === undefined || typeof options.ollamaEndpoint === 'string') {
      const ollamaModels = await this.detectOllama(
        options.ollamaEndpoint || 'http://localhost:11434',
        timeout
      );
      results.push(...ollamaModels);
    }

    // Detect OpenAI
    if (options.openaiKey) {
      const openaiModels = await this.detectOpenAI(options.openaiKey, timeout);
      results.push(...openaiModels);
    }

    // Detect Claude
    if (options.claudeKey) {
      const claudeModels = await this.detectClaude(options.claudeKey, timeout);
      results.push(...claudeModels);
    }

    // Detect Gemini
    if (options.geminiKey) {
      const geminiModels = await this.detectGemini(options.geminiKey, timeout);
      results.push(...geminiModels);
    }

    this.logger.info('Capability detection complete', {
      total: results.length,
      available: results.filter(r => r.available).length,
    });

    return results;
  }

  /**
   * Detect Ollama models and their capabilities
   */
  async detectOllama(endpoint: string = 'http://localhost:11434', timeout: number = 5000): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${endpoint}/api/tags`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.logger.warn('Ollama endpoint unreachable', { endpoint, status: response.status });
        return results;
      }

      const data = (await response.json()) as { models?: Array<{ name: string; details?: any }> };
      const models = data.models || [];

      for (const model of models) {
        const modelId = `ollama-${model.name}`;
        const cacheKey = `${modelId}@ollama`;

        // Check cache first
        if (this.detectionCache.has(cacheKey)) {
          const cached = this.detectionCache.get(cacheKey);
          if (cached && Date.now() - new Date(cached.timestamp).getTime() < this.cacheTimeout) {
            results.push(cached);
            continue;
          }
        }

        const result: DetectionResult = {
          provider: 'Ollama',
          modelId,
          modelName: model.name,
          detected: true,
          available: true,
          capabilities: {
            contextWindow: 4096, // Ollama default
            streaming: true,
            functionCalling: false,
            multimodal: false,
            vision: model.name.includes('vision') || model.name.includes('llava'),
          },
          version: model.details?.version || '1.0',
          timestamp: new Date().toISOString(),
        };

        this.detectionCache.set(cacheKey, result);
        results.push(result);
      }

      this.logger.info('Ollama models detected', { endpoint, count: results.length });
    } catch (error) {
      this.logger.warn('Failed to detect Ollama models', { endpoint, error: String(error) });
    }

    return results;
  }

  /**
   * Detect OpenAI models and their capabilities
   */
  async detectOpenAI(apiKey: string, timeout: number = 5000): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];

    // Known OpenAI models (would require API call for full list)
    const knownModels = [
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        contextWindow: 128000,
        costPerMTok: 0.01,
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        contextWindow: 128000,
        costPerMTok: 0.005,
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        contextWindow: 8192,
        costPerMTok: 0.03,
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        contextWindow: 4096,
        costPerMTok: 0.0005,
      },
    ];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Test API key validity
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const isValid = response.ok;

      for (const model of knownModels) {
        const cacheKey = `${model.id}@openai`;

        if (this.detectionCache.has(cacheKey)) {
          const cached = this.detectionCache.get(cacheKey);
          if (cached && Date.now() - new Date(cached.timestamp).getTime() < this.cacheTimeout) {
            results.push(cached);
            continue;
          }
        }

        const result: DetectionResult = {
          provider: 'OpenAI',
          modelId: model.id,
          modelName: model.name,
          detected: true,
          available: isValid,
          capabilities: {
            contextWindow: model.contextWindow,
            streaming: true,
            functionCalling: true,
            multimodal: model.id.includes('4o'),
            vision: model.id.includes('4o'),
            costPerMTok: model.costPerMTok,
          },
          timestamp: new Date().toISOString(),
        };

        if (!isValid) {
          result.error = 'API key invalid or rate limited';
        }

        this.detectionCache.set(cacheKey, result);
        results.push(result);
      }

      this.logger.info('OpenAI models detected', {
        count: results.length,
        available: results.filter(r => r.available).length,
      });
    } catch (error) {
      this.logger.warn('Failed to detect OpenAI models', { error: String(error) });
    }

    return results;
  }

  /**
   * Detect Claude models and their capabilities
   */
  async detectClaude(apiKey: string, timeout: number = 5000): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];

    const knownModels = [
      {
        id: 'claude-opus-4-8',
        name: 'Claude Opus 4.8',
        contextWindow: 200000,
        costPerMTok: 0.015,
      },
      {
        id: 'claude-sonnet-5',
        name: 'Claude Sonnet 5',
        contextWindow: 200000,
        costPerMTok: 0.003,
      },
      {
        id: 'claude-haiku-4-5',
        name: 'Claude Haiku 4.5',
        contextWindow: 200000,
        costPerMTok: 0.0008,
      },
    ];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Test API key validity
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-8',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const isValid = response.status === 200 || response.status === 400; // 400 is ok for test

      for (const model of knownModels) {
        const cacheKey = `${model.id}@anthropic`;

        if (this.detectionCache.has(cacheKey)) {
          const cached = this.detectionCache.get(cacheKey);
          if (cached && Date.now() - new Date(cached.timestamp).getTime() < this.cacheTimeout) {
            results.push(cached);
            continue;
          }
        }

        const result: DetectionResult = {
          provider: 'Anthropic',
          modelId: model.id,
          modelName: model.name,
          detected: true,
          available: isValid,
          capabilities: {
            contextWindow: model.contextWindow,
            streaming: true,
            functionCalling: true,
            multimodal: true,
            vision: true,
            audio: false,
            costPerMTok: model.costPerMTok,
          },
          timestamp: new Date().toISOString(),
        };

        if (!isValid) {
          result.error = 'API key invalid or rate limited';
        }

        this.detectionCache.set(cacheKey, result);
        results.push(result);
      }

      this.logger.info('Claude models detected', {
        count: results.length,
        available: results.filter(r => r.available).length,
      });
    } catch (error) {
      this.logger.warn('Failed to detect Claude models', { error: String(error) });
    }

    return results;
  }

  /**
   * Detect Gemini models and their capabilities
   */
  async detectGemini(apiKey: string, timeout: number = 5000): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];

    const knownModels = [
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        contextWindow: 1000000,
        costPerMTok: 0.001,
      },
      {
        id: 'gemini-2.0-pro',
        name: 'Gemini 2.0 Pro',
        contextWindow: 1000000,
        costPerMTok: 0.005,
      },
    ];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Test API key validity
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        {
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      const isValid = response.ok;

      for (const model of knownModels) {
        const cacheKey = `${model.id}@google`;

        if (this.detectionCache.has(cacheKey)) {
          const cached = this.detectionCache.get(cacheKey);
          if (cached && Date.now() - new Date(cached.timestamp).getTime() < this.cacheTimeout) {
            results.push(cached);
            continue;
          }
        }

        const result: DetectionResult = {
          provider: 'Google',
          modelId: model.id,
          modelName: model.name,
          detected: true,
          available: isValid,
          capabilities: {
            contextWindow: model.contextWindow,
            streaming: true,
            functionCalling: true,
            multimodal: true,
            vision: true,
            audio: true,
            costPerMTok: model.costPerMTok,
          },
          timestamp: new Date().toISOString(),
        };

        if (!isValid) {
          result.error = 'API key invalid or rate limited';
        }

        this.detectionCache.set(cacheKey, result);
        results.push(result);
      }

      this.logger.info('Gemini models detected', {
        count: results.length,
        available: results.filter(r => r.available).length,
      });
    } catch (error) {
      this.logger.warn('Failed to detect Gemini models', { error: String(error) });
    }

    return results;
  }

  /**
   * Get detection result from cache
   */
  getCached(modelId: string): DetectionResult | null {
    const result = this.detectionCache.get(modelId);
    if (!result) return null;

    // Check if cache is still valid
    if (Date.now() - new Date(result.timestamp).getTime() > this.cacheTimeout) {
      this.detectionCache.delete(modelId);
      return null;
    }

    return result;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.detectionCache.clear();
    this.logger.info('Detection cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    cached: number;
    expired: number;
  } {
    let expired = 0;
    const now = Date.now();

    for (const [, result] of this.detectionCache) {
      if (now - new Date(result.timestamp).getTime() > this.cacheTimeout) {
        expired++;
      }
    }

    return {
      cached: this.detectionCache.size,
      expired,
    };
  }

  /**
   * Summarize detection results
   */
  summarizeResults(results: DetectionResult[]): {
    total: number;
    byProvider: Record<string, number>;
    available: number;
    unavailable: number;
    withErrors: number;
  } {
    const summary = {
      total: results.length,
      byProvider: {} as Record<string, number>,
      available: 0,
      unavailable: 0,
      withErrors: 0,
    };

    for (const result of results) {
      summary.byProvider[result.provider] = (summary.byProvider[result.provider] || 0) + 1;

      if (result.available) {
        summary.available++;
      } else {
        summary.unavailable++;
      }

      if (result.error) {
        summary.withErrors++;
      }
    }

    return summary;
  }
}
