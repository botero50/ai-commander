/**
 * Brain Manager
 *
 * Runtime provider selection: switch AI provider without modifying gameplay code.
 * Supports: built-in AI, Claude, GPT, Gemini, Ollama
 * Each provider implements Brain interface identically.
 */

import type { Brain, BrainInput, BrainOutput } from './brain-sdk.js';
import { BuiltinBrain } from './brain-sdk.js';
import { ClaudeBrain } from './claude-brain.js';
import { OpenAIBrain } from './openai-brain.js';
import { GeminiBrain } from './gemini-brain.js';
import { OllamaBrain } from './ollama-brain.js';

export type BrainProviderType = 'builtin' | 'claude' | 'openai' | 'gemini' | 'ollama';

export interface BrainConfig {
  readonly provider: BrainProviderType;
  readonly model?: string;
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
}

/**
 * Brain Manager - factory and registry for all providers
 */
export class BrainManager {
  private brains: Map<string, Brain> = new Map();
  private defaultBrain: Brain;

  constructor() {
    this.defaultBrain = new BuiltinBrain();
    this.brains.set('builtin', this.defaultBrain);
  }

  /**
   * Create a brain from configuration
   */
  createBrain(config: BrainConfig): Brain {
    switch (config.provider) {
      case 'builtin':
        return new BuiltinBrain();

      case 'claude': {
        if (!config.apiKey) {
          throw new Error('Claude provider requires apiKey');
        }
        return new ClaudeBrain({
          apiKey: config.apiKey,
          model: config.model || 'claude-3-sonnet',
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        });
      }

      case 'openai': {
        if (!config.apiKey) {
          throw new Error('OpenAI provider requires apiKey');
        }
        return new OpenAIBrain({
          apiKey: config.apiKey,
          model: config.model || 'gpt-4',
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        });
      }

      case 'gemini': {
        if (!config.apiKey) {
          throw new Error('Gemini provider requires apiKey');
        }
        return new GeminiBrain({
          apiKey: config.apiKey,
          model: config.model || 'gemini-pro',
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        });
      }

      case 'ollama': {
        return new OllamaBrain({
          baseUrl: config.baseUrl || 'http://localhost:11434',
          model: config.model || 'llama2',
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        });
      }

      default: {
        const _exhaustive: never = config.provider;
        throw new Error(`Unknown provider: ${_exhaustive}`);
      }
    }
  }

  /**
   * Register a brain with a key for later retrieval
   */
  registerBrain(key: string, brain: Brain): void {
    this.brains.set(key, brain);
  }

  /**
   * Get a registered brain
   */
  getBrain(key: string): Brain {
    const brain = this.brains.get(key);
    if (!brain) {
      throw new Error(`Brain not found: ${key}`);
    }
    return brain;
  }

  /**
   * Get the default brain (builtin)
   */
  getDefaultBrain(): Brain {
    return this.defaultBrain;
  }

  /**
   * List all registered brains
   */
  listBrains(): string[] {
    return Array.from(this.brains.keys());
  }

  /**
   * Reset all registered brains
   */
  resetAll(): void {
    for (const brain of this.brains.values()) {
      brain.reset();
    }
  }
}

/**
 * Global singleton manager
 */
let globalManager: BrainManager | null = null;

export function getGlobalBrainManager(): BrainManager {
  if (!globalManager) {
    globalManager = new BrainManager();
  }
  return globalManager;
}

export function resetGlobalBrainManager(): void {
  globalManager = null;
}

/**
 * Convenience function: create and register a brain
 */
export function setupBrain(key: string, config: BrainConfig): Brain {
  const manager = getGlobalBrainManager();
  const brain = manager.createBrain(config);
  manager.registerBrain(key, brain);
  return brain;
}

/**
 * Convenience function: get a registered brain (or default)
 */
export function getBrain(key?: string): Brain {
  const manager = getGlobalBrainManager();
  if (!key) {
    return manager.getDefaultBrain();
  }
  return manager.getBrain(key);
}
