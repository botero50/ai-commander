"use strict";
/**
 * Ollama API Client
 *
 * Handles low-level HTTP communication with Ollama server.
 * Encapsulates API endpoint calls and response parsing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaAPIClient = void 0;
class OllamaAPIClient {
    logger;
    config;
    constructor(logger, config) {
        this.logger = logger;
        this.config = config;
    }
    /**
     * Check if Ollama server is reachable
     */
    async healthCheck() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            const response = await fetch(`${this.config.baseUrl}/api/tags`, {
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`Ollama health check failed: ${response.status}`);
            }
            const data = (await response.json());
            const availableModels = data.models.map(m => m.name);
            this.logger.info('Ollama initialized', {
                baseUrl: this.config.baseUrl,
                availableModels,
            });
            if (!availableModels.includes(this.config.modelName)) {
                this.logger.warn('Model not found in available models', {
                    model: this.config.modelName,
                    available: availableModels,
                });
            }
        }
        catch (error) {
            this.logger.error('Failed to initialize Ollama', {
                error: error instanceof Error ? error.message : String(error),
                baseUrl: this.config.baseUrl,
            });
            throw error;
        }
    }
    /**
     * Send prompt to Ollama and get response
     */
    async generateResponse(prompt) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            const payload = {
                model: this.config.modelName,
                prompt,
                temperature: this.config.temperature,
                top_p: this.config.topP,
                top_k: this.config.topK,
                num_predict: this.config.numPredict,
                stream: false,
            };
            const response = await fetch(`${this.config.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`Ollama request failed: ${response.status}`);
            }
            const data = (await response.json());
            return data.response;
        }
        catch (error) {
            this.logger.error('Ollama API call failed', {
                error: error instanceof Error ? error.message : String(error),
                model: this.config.modelName,
            });
            throw error;
        }
    }
    /**
     * Cleanup (no resources to cleanup in this client)
     */
    async shutdown() {
        // No-op: HTTP client doesn't require cleanup
    }
}
exports.OllamaAPIClient = OllamaAPIClient;
//# sourceMappingURL=ollama-api-client.js.map