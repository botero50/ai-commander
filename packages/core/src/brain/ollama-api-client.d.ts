/**
 * Ollama API Client
 *
 * Handles low-level HTTP communication with Ollama server.
 * Encapsulates API endpoint calls and response parsing.
 */
import { Logger } from '../config/logger.js';
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
export interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
}
export interface OllamaTagsResponse {
    models: Array<{
        name: string;
    }>;
}
export declare class OllamaAPIClient {
    private logger;
    private config;
    constructor(logger: Logger, config: OllamaConfig);
    /**
     * Check if Ollama server is reachable
     */
    healthCheck(): Promise<void>;
    /**
     * Send prompt to Ollama and get response
     */
    generateResponse(prompt: string): Promise<string>;
    /**
     * Cleanup (no resources to cleanup in this client)
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=ollama-api-client.d.ts.map