"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaAIBrain = void 0;
const decision_logger_js_1 = require("./decision-logger.js");
const ollama_request_throttler_js_1 = require("./ollama-request-throttler.js");
const ollama_api_client_js_1 = require("./ollama-api-client.js");
const ollama_request_builder_js_1 = require("./ollama-request-builder.js");
const ollama_response_parser_js_1 = require("./ollama-response-parser.js");
/**
 * AI Brain powered by local Ollama LLM inference
 */
class OllamaAIBrain {
    logger;
    config;
    decisionCount = 0;
    decisionLogger;
    playerID;
    throttler;
    apiClient;
    requestBuilder;
    responseParser;
    constructor(logger, config = {}) {
        this.logger = logger;
        this.decisionLogger = new decision_logger_js_1.DecisionLogger(logger);
        this.playerID = config.playerID || 2;
        this.config = {
            modelName: config.modelName || 'llama2',
            baseUrl: config.baseUrl || 'http://localhost:11434',
            temperature: config.temperature !== undefined ? config.temperature : 0.7,
            topP: config.topP !== undefined ? config.topP : 0.9,
            topK: config.topK !== undefined ? config.topK : 40,
            numPredict: config.numPredict || 256,
            timeout: config.timeout || 60000,
            playerID: config.playerID || 2,
        };
        // Initialize helper modules
        this.apiClient = new ollama_api_client_js_1.OllamaAPIClient(logger, this.config);
        this.requestBuilder = new ollama_request_builder_js_1.OllamaRequestBuilder(logger, this.playerID);
        this.responseParser = new ollama_response_parser_js_1.OllamaResponseParser(logger, this.playerID);
        // Throttle requests: max 1 per 3 seconds per brain (prevent 500 errors)
        this.throttler = new ollama_request_throttler_js_1.OllamaRequestThrottler(logger, `Player${this.playerID}`, {
            delayBetweenRequests: 3000,
            maxQueueSize: 5,
        });
    }
    /**
     * Initialize brain (verify Ollama is reachable)
     */
    async initialize() {
        await this.apiClient.healthCheck();
    }
    /**
     * Make a decision based on world state (throttled to 1 request per 3 seconds)
     */
    async decide(worldState) {
        this.decisionCount++;
        return this.throttler.throttle(async () => {
            try {
                // Build prompt via request builder
                const gameDescription = this.requestBuilder.describeGameState(worldState);
                const prompt = this.requestBuilder.buildPrompt(gameDescription);
                this.logger.debug('Querying Ollama (throttled)', {
                    decision: this.decisionCount,
                    model: this.config.modelName,
                    promptLength: prompt.length,
                });
                // Get response via API client
                const response = await this.apiClient.generateResponse(prompt);
                // Parse commands via response parser
                const commands = this.responseParser.parseCommands(response, worldState);
                const decision = {
                    playerID: this.playerID,
                    commands,
                    reasoning: response.substring(0, 300),
                    timestamp: new Date(),
                };
                this.decisionLogger.logDecision(worldState, prompt, response, Date.now() - (decision.timestamp.getTime() - 1000), commands, true);
                this.logger.info('Brain decision made', {
                    decision: this.decisionCount,
                    commands: commands.length,
                    responseLength: response.length,
                    throttlerMetrics: this.throttler.getMetrics(),
                });
                return decision;
            }
            catch (error) {
                const isAbortError = error instanceof Error && error.name === 'AbortError';
                if (!isAbortError) {
                    this.logger.error('Brain decision failed', {
                        decision: this.decisionCount,
                        error: String(error),
                    });
                }
                return {
                    playerID: this.playerID,
                    commands: [],
                    reasoning: isAbortError ? 'Decision aborted' : `Decision failed: ${error}`,
                    timestamp: new Date(),
                };
            }
        });
    }
    /**
     * Shutdown brain
     */
    async shutdown() {
        this.logger.info('Ollama brain shutdown', {
            totalDecisions: this.decisionCount,
            throttlerMetrics: this.throttler.getMetrics(),
        });
        this.throttler.reset();
    }
    /**
     * Get decision quality report
     */
    getDecisionReport() {
        return this.decisionLogger.generateReport();
    }
    /**
     * Export decision log
     */
    exportDecisions() {
        return this.decisionLogger.exportToJSON();
    }
    /**
     * Generate metrics report
     */
    generateReport() {
        const lines = [];
        lines.push('╔═══════════════════════════════════════════════════════╗');
        lines.push('║          OLLAMA AI BRAIN REPORT                      ║');
        lines.push('╚═══════════════════════════════════════════════════════╝');
        lines.push('');
        lines.push('Configuration:');
        lines.push(`  Model:        ${this.config.modelName}`);
        lines.push(`  Base URL:     ${this.config.baseUrl}`);
        lines.push(`  Temperature:  ${this.config.temperature}`);
        lines.push('');
        lines.push('Statistics:');
        lines.push(`  Decisions:    ${this.decisionCount}`);
        lines.push('');
        return lines.join('\n');
    }
}
exports.OllamaAIBrain = OllamaAIBrain;
//# sourceMappingURL=ollama-brain.js.map