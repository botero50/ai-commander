import { StateExtractor } from './state-extractor.js';
import { ZeroADAdapterError, ZeroADAdapterErrorCode } from '../types/errors.js';
export class ObservationLoop {
    constructor(ipcBridge, config, logger) {
        this.loopInterval = null;
        this.isRunning = false;
        this.lastState = null;
        this.observationCount = 0;
        this.totalLatency = 0;
        this.ipcBridge = ipcBridge;
        this.config = this.validateConfig(config);
        this.logger = logger;
        this.extractor = new StateExtractor(logger);
    }
    async start() {
        if (this.isRunning) {
            this.logger.warn('Observation loop already running');
            return;
        }
        this.isRunning = true;
        this.logger.info('Starting observation loop', { frequency: this.config.frequency });
        const intervalMs = 1000 / this.config.frequency;
        this.loopInterval = setInterval(() => {
            this.observeTick();
        }, intervalMs);
    }
    async stop() {
        if (!this.isRunning) {
            return;
        }
        this.logger.info('Stopping observation loop');
        this.isRunning = false;
        if (this.loopInterval) {
            clearInterval(this.loopInterval);
            this.loopInterval = null;
        }
        if (this.observationCount > 0) {
            const avgLatency = this.totalLatency / this.observationCount;
            this.logger.info('Observation loop stopped', {
                observations: this.observationCount,
                avgLatency: avgLatency.toFixed(2),
            });
        }
    }
    getLastState() {
        return this.lastState;
    }
    getMetrics() {
        return {
            isRunning: this.isRunning,
            observationCount: this.observationCount,
            avgLatency: this.observationCount > 0 ? (this.totalLatency / this.observationCount).toFixed(2) : 0,
        };
    }
    async observeTick() {
        try {
            const startTime = Date.now();
            // Request current state from game via IPC
            const response = await this.ipcBridge.sendRequest('get_state');
            const rawState = response;
            // Extract and normalize state
            const gameState = this.extractor.extract(rawState);
            this.lastState = gameState;
            const latency = Date.now() - startTime;
            this.observationCount++;
            this.totalLatency += latency;
            if (latency > 50) {
                this.logger.warn('Slow observation', {
                    tick: gameState.tick,
                    latency,
                    units: gameState.units.length,
                    buildings: gameState.buildings.length,
                });
            }
        }
        catch (err) {
            this.logger.error('Observation tick failed', err);
            // Continue loop on error - IPC may be temporarily unavailable
        }
    }
    validateConfig(config) {
        if (config.frequency < 1 || config.frequency > 20) {
            throw new ZeroADAdapterError(ZeroADAdapterErrorCode.INVALID_CONFIG, `Invalid observation frequency: ${config.frequency}. Must be between 1 and 20 Hz`);
        }
        return config;
    }
}
//# sourceMappingURL=observation-loop.js.map