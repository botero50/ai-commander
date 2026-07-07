/**
 * Brain Manager
 *
 * Runtime provider selection: switch AI provider without modifying gameplay code.
 * Supports: built-in AI, Claude, GPT, Gemini, Ollama
 * Each provider implements Brain interface identically.
 */
import type { Brain } from './brain-sdk.js';
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
export declare class BrainManager {
    private brains;
    private defaultBrain;
    constructor();
    /**
     * Create a brain from configuration
     */
    createBrain(config: BrainConfig): Brain;
    /**
     * Register a brain with a key for later retrieval
     */
    registerBrain(key: string, brain: Brain): void;
    /**
     * Get a registered brain
     */
    getBrain(key: string): Brain;
    /**
     * Get the default brain (builtin)
     */
    getDefaultBrain(): Brain;
    /**
     * List all registered brains
     */
    listBrains(): string[];
    /**
     * Reset all registered brains
     */
    resetAll(): void;
}
export declare function getGlobalBrainManager(): BrainManager;
export declare function resetGlobalBrainManager(): void;
/**
 * Convenience function: create and register a brain
 */
export declare function setupBrain(key: string, config: BrainConfig): Brain;
/**
 * Convenience function: get a registered brain (or default)
 */
export declare function getBrain(key?: string): Brain;
//# sourceMappingURL=brain-manager.d.ts.map