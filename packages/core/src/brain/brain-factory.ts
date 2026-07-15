/**
 * Brain Factory
 *
 * Creates AI brains from provider strings.
 * Supports: ollama, openai, anthropic, huggingface
 *
 * Usage:
 *   const brain = createBrain('ollama:mistral', logger, { playerID: 1 })
 *   const brain = createBrain('openai:gpt-4', logger, { playerID: 1, apiKey: '...' })
 *   const brain = createBrain('anthropic:claude-3-opus', logger, { playerID: 1, apiKey: '...' })
 */

import { Logger } from '../config/logger.js';
import type { AIBrain } from './ai-loop-orchestrator.js';
import { OllamaAIBrain } from './ollama-brain.js';

export interface BrainConfig {
  playerID?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  apiKey?: string; // For OpenAI, Anthropic
  baseUrl?: string; // For custom endpoints
  timeout?: number;
  [key: string]: any;
}

export type BrainProvider = 'ollama' | 'openai' | 'anthropic' | 'huggingface';

/**
 * Parse brain identifier: "provider:model"
 * Examples:
 *   - "ollama:mistral"
 *   - "ollama:llama2"
 *   - "openai:gpt-4"
 *   - "openai:gpt-3.5-turbo"
 *   - "anthropic:claude-3-opus"
 *   - "anthropic:claude-3-sonnet"
 */
export function parseBrainId(brainId: string): { provider: BrainProvider; model: string } {
  const [provider, ...modelParts] = brainId.split(':');
  const model = modelParts.join(':');

  if (!model) {
    throw new Error(`Invalid brain ID: "${brainId}". Expected format: "provider:model" (e.g., "ollama:mistral")`);
  }

  return {
    provider: provider.toLowerCase() as BrainProvider,
    model,
  };
}

/**
 * Create an AI brain from a brain ID and config
 */
export function createBrain(brainId: string, logger: Logger, config: BrainConfig = {}): AIBrain {
  const { provider, model } = parseBrainId(brainId);

  logger.info(`🧠 Creating ${provider} brain: ${model}`, { playerID: config.playerID || 'unknown' });

  switch (provider) {
    case 'ollama':
      return new OllamaAIBrain(logger, {
        modelName: model,
        baseUrl: config.baseUrl || 'http://localhost:11434',
        temperature: config.temperature ?? 0.7,
        topP: config.topP ?? 0.9,
        topK: config.topK ?? 40,
        numPredict: config.numPredict ?? 256,
        timeout: config.timeout ?? 60000,
        playerID: config.playerID,
      });

    case 'openai':
      if (!config.apiKey) {
        throw new Error('OpenAI brain requires apiKey (set OPENAI_API_KEY env var)');
      }
      // Dynamically import to avoid circular dependencies
      const { OpenAIBrain } = require('./openai-brain.js');
      return new OpenAIBrain(logger, {
        modelName: model,
        apiKey: config.apiKey,
        temperature: config.temperature ?? 0.7,
        topP: config.topP ?? 0.9,
        maxTokens: config.maxTokens ?? 256,
        timeout: config.timeout ?? 60000,
        playerID: config.playerID,
      });

    case 'anthropic':
      if (!config.apiKey) {
        throw new Error('Anthropic brain requires apiKey (set ANTHROPIC_API_KEY env var)');
      }
      // Dynamically import to avoid circular dependencies
      const { AnthropicBrain } = require('./anthropic-brain.js');
      return new AnthropicBrain(logger, {
        modelName: model,
        apiKey: config.apiKey,
        temperature: config.temperature ?? 0.7,
        maxTokens: config.maxTokens ?? 256,
        timeout: config.timeout ?? 60000,
        playerID: config.playerID,
      });

    case 'huggingface':
      throw new Error('HuggingFace brain not yet implemented');

    default:
      throw new Error(`Unknown brain provider: ${provider}`);
  }
}

/**
 * Create brains from environment variables
 *
 * Set env vars like:
 *   BRAIN_P1=ollama:mistral
 *   BRAIN_P2=openai:gpt-4
 *
 * Or with custom config:
 *   BRAIN_P1=anthropic:claude-3-opus
 *   ANTHROPIC_API_KEY=sk-ant-...
 */
export function createBrainsFromEnv(logger: Logger): { p1Brain: AIBrain; p2Brain: AIBrain } {
  const brainP1Id = process.env.BRAIN_P1 || 'ollama:mistral';
  const brainP2Id = process.env.BRAIN_P2 || 'ollama:llama2';

  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const p1Brain = createBrain(brainP1Id, logger, {
    playerID: 1,
    apiKey: openaiKey || anthropicKey,
  });

  const p2Brain = createBrain(brainP2Id, logger, {
    playerID: 2,
    apiKey: openaiKey || anthropicKey,
  });

  return { p1Brain, p2Brain };
}
