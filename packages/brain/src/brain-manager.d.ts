/**
 * Brain Manager — Runtime provider selection
 *
 * Allows switching between providers without modifying gameplay code.
 * Supports built-in, Claude, OpenAI, Gemini, and Ollama.
 */
import type { Brain } from './types/brain.js';
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
export declare class BrainManager {
    static create(config: BrainManagerConfig): Promise<Brain>;
}
//# sourceMappingURL=brain-manager.d.ts.map