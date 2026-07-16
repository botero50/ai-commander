/**
 * Ollama AI Brain
 *
 * Implements AIBrain interface using local Ollama LLM inference.
 * Orchestrates request building, API calls, and response parsing via specialized modules.
 *
 * Prerequisites:
 * - Ollama running on localhost:11434
 * - Model available (e.g., ollama pull llama2)
 *
 * Story R3.1: Ollama Brain Implementation
 */
import { Logger } from '../config/logger.js';
interface WorldState {
    tick: {
        number: number;
    };
    players: Array<{
        id: number;
        name: string;
        [key: string]: any;
    }>;
    [key: string]: any;
}
import type { AIBrain, BrainDecision } from './ai-loop-orchestrator.js';
export interface OllamaConfig {
    modelName: string;
    baseUrl: string;
    temperature: number;
    topP: number;
    topK: number;
    numPredict: number;
    timeout: number;
    playerID?: number;
}
/**
 * AI Brain powered by local Ollama LLM inference
 */
export declare class OllamaAIBrain implements AIBrain {
    private logger;
    private config;
    private decisionCount;
    private decisionLogger;
    private playerID;
    private throttler;
    private apiClient;
    private requestBuilder;
    private responseParser;
    constructor(logger: Logger, config?: Partial<OllamaConfig>);
    /**
     * Initialize brain (verify Ollama is reachable)
     */
    initialize(): Promise<void>;
    /**
     * Make a decision based on world state (throttled to 1 request per 3 seconds)
     */
    decide(worldState: WorldState): Promise<BrainDecision>;
    /**
     * Shutdown brain
     */
    shutdown(): Promise<void>;
    /**
     * Get decision quality report
     */
    getDecisionReport(): string;
    /**
     * Export decision log
     */
    exportDecisions(): string;
    /**
     * Generate metrics report
     */
    generateReport(): string;
}
export {};
//# sourceMappingURL=ollama-brain.d.ts.map