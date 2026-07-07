/**
 * Brain Manager — Runtime provider selection
 *
 * Allows switching between providers without modifying gameplay code.
 * Supports built-in, Claude, OpenAI, Gemini, and Ollama.
 */

import type { Brain } from './types/brain';

export type BrainProvider = 'builtin' | 'claude' | 'openai' | 'gemini' | 'ollama';

export interface BrainManagerConfig {
  readonly provider: BrainProvider;
  readonly builtin?: Record<string, unknown>;
  readonly claude?: {
    readonly apiKey: string;
    readonly model: 'claude-3-opus-20240229' | 'claude-3-sonnet-20240229' | 'claude-3-haiku-20240307';
    readonly temperature?: number;
    readonly maxTokens?: number;
  };
  readonly openai?: {
    readonly apiKey: string;
    readonly model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
    readonly temperature?: number;
    readonly maxTokens?: number;
  };
  readonly gemini?: {
    readonly apiKey: string;
    readonly model: 'gemini-pro' | 'gemini-pro-vision';
    readonly temperature?: number;
    readonly maxOutputTokens?: number;
  };
  readonly ollama?: {
    readonly endpoint: string;
    readonly model: string;
    readonly temperature?: number;
    readonly numPredict?: number;
  };
}

/**
 * BrainManager: Create and manage brain instances
 *
 * This allows switching providers at runtime based on configuration.
 */
export class BrainManager {
  static async create(config: BrainManagerConfig): Promise<Brain> {
    switch (config.provider) {
      case 'builtin':
        // Lazy load to avoid circular dependencies
        const { BuiltinBrain } = await import('./builtin-brain');
        return new BuiltinBrain({
          selectGoal: async () => 'default-goal',
          planGoal: async () => [],
          selectCommands: async () => [],
        });

      case 'claude':
        if (!config.claude?.apiKey) {
          throw new Error('Claude provider requires apiKey');
        }
        const { ClaudeBrain } = await import('@ai-commander/brain-claude');
        return new ClaudeBrain({
          apiKey: config.claude.apiKey,
          model: config.claude.model,
          temperature: config.claude.temperature,
          maxTokens: config.claude.maxTokens,
        });

      case 'openai':
        if (!config.openai?.apiKey) {
          throw new Error('OpenAI provider requires apiKey');
        }
        const { OpenAIBrain } = await import('@ai-commander/brain-openai');
        return new OpenAIBrain({
          apiKey: config.openai.apiKey,
          model: config.openai.model,
          temperature: config.openai.temperature,
          maxTokens: config.openai.maxTokens,
        });

      case 'gemini':
        if (!config.gemini?.apiKey) {
          throw new Error('Gemini provider requires apiKey');
        }
        const { GeminiBrain } = await import('@ai-commander/brain-gemini');
        return new GeminiBrain({
          apiKey: config.gemini.apiKey,
          model: config.gemini.model,
          temperature: config.gemini.temperature,
          maxOutputTokens: config.gemini.maxOutputTokens,
        });

      case 'ollama':
        if (!config.ollama?.endpoint || !config.ollama?.model) {
          throw new Error('Ollama provider requires endpoint and model');
        }
        const { OllamaBrain } = await import('@ai-commander/brain-ollama');
        return new OllamaBrain({
          endpoint: config.ollama.endpoint,
          model: config.ollama.model,
          temperature: config.ollama.temperature,
          numPredict: config.ollama.numPredict,
        });

      default:
        const _exhaustive: never = config.provider;
        throw new Error(`Unknown brain provider: ${_exhaustive}`);
    }
  }
}
