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
export interface BrainConfig {
    playerID?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
    apiKey?: string;
    baseUrl?: string;
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
export declare function parseBrainId(brainId: string): {
    provider: BrainProvider;
    model: string;
};
/**
 * Create an AI brain from a brain ID and config
 */
export declare function createBrain(brainId: string, logger: Logger, config?: BrainConfig): AIBrain;
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
export declare function createBrainsFromEnv(logger: Logger): {
    p1Brain: AIBrain;
    p2Brain: AIBrain;
};
//# sourceMappingURL=brain-factory.d.ts.map