"use strict";
/**
 * Ollama Request Throttler
 *
 * Limits the rate of requests sent to Ollama to prevent overwhelming
 * the server. Each brain instance gets its own throttle queue.
 *
 * Features:
 * - One request at a time per brain
 * - Configurable delay between requests (default: 3 seconds)
 * - Queues pending requests while one is in-flight
 * - Logs throttling metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaRequestThrottler = void 0;
class OllamaRequestThrottler {
    playerId;
    logger;
    lastRequestTime = 0;
    queue = [];
    isProcessing = false;
    delayBetweenRequests;
    maxQueueSize;
    totalRequests = 0;
    droppedRequests = 0;
    constructor(logger, playerId, config = {}) {
        this.playerId = playerId;
        this.logger = logger;
        this.delayBetweenRequests = config.delayBetweenRequests || 3000; // 3 seconds default
        this.maxQueueSize = config.maxQueueSize || 1; // fire-and-forget
    }
    /**
     * Queue a request with throttling
     * Returns a promise that resolves when the request completes
     */
    async throttle(requestFn) {
        this.totalRequests++;
        // Check queue size
        if (this.queue.length >= this.maxQueueSize) {
            this.droppedRequests++;
            this.logger.debug(`[${this.playerId}] Request dropped (queue full: ${this.queue.length}/${this.maxQueueSize})`);
            return requestFn().catch(() => {
                throw new Error('Request dropped due to queue overflow');
            });
        }
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await requestFn();
                    resolve(result);
                }
                catch (error) {
                    reject(error);
                }
            });
            this.processQueue();
        });
    }
    /**
     * Process queued requests with delay between each
     */
    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }
        this.isProcessing = true;
        while (this.queue.length > 0) {
            // Wait for delay since last request
            const timeSinceLastRequest = Date.now() - this.lastRequestTime;
            const remainingDelay = Math.max(0, this.delayBetweenRequests - timeSinceLastRequest);
            if (remainingDelay > 0) {
                await new Promise(resolve => setTimeout(resolve, remainingDelay));
            }
            // Execute next request
            const requestFn = this.queue.shift();
            if (requestFn) {
                this.lastRequestTime = Date.now();
                try {
                    await requestFn();
                }
                catch (error) {
                    // Already handled in the throttle() method
                    this.logger.debug(`[${this.playerId}] Request failed: ${error}`);
                }
            }
        }
        this.isProcessing = false;
    }
    /**
     * Get throttler metrics
     */
    getMetrics() {
        return {
            playerId: this.playerId,
            totalRequests: this.totalRequests,
            droppedRequests: this.droppedRequests,
            queueSize: this.queue.length,
            isProcessing: this.isProcessing,
            delayBetweenRequests: this.delayBetweenRequests,
        };
    }
    /**
     * Reset throttler state
     */
    reset() {
        this.lastRequestTime = 0;
        this.queue = [];
        this.isProcessing = false;
        this.totalRequests = 0;
        this.droppedRequests = 0;
    }
}
exports.OllamaRequestThrottler = OllamaRequestThrottler;
//# sourceMappingURL=ollama-request-throttler.js.map