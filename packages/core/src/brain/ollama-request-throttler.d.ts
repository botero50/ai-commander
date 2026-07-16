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
import { Logger } from '../config/logger.js';
export interface ThrottlerConfig {
    delayBetweenRequests?: number;
    maxQueueSize?: number;
}
export declare class OllamaRequestThrottler {
    private playerId;
    private logger;
    private lastRequestTime;
    private queue;
    private isProcessing;
    private delayBetweenRequests;
    private maxQueueSize;
    private totalRequests;
    private droppedRequests;
    constructor(logger: Logger, playerId: string, config?: ThrottlerConfig);
    /**
     * Queue a request with throttling
     * Returns a promise that resolves when the request completes
     */
    throttle<T>(requestFn: () => Promise<T>): Promise<T>;
    /**
     * Process queued requests with delay between each
     */
    private processQueue;
    /**
     * Get throttler metrics
     */
    getMetrics(): {
        playerId: string;
        totalRequests: number;
        droppedRequests: number;
        queueSize: number;
        isProcessing: boolean;
        delayBetweenRequests: number;
    };
    /**
     * Reset throttler state
     */
    reset(): void;
}
//# sourceMappingURL=ollama-request-throttler.d.ts.map