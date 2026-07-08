import { ObservationLoop } from '../state/observation-loop.js';
import { StateExtractor } from '../state/state-extractor.js';
import { WorldMapper } from '../mapper/world-mapper.js';
export class ObservationProvider {
    constructor(ipcBridge, config, logger) {
        this.currentWorldState = null;
        this.lastUpdateTime = 0;
        this.updateCount = 0;
        this.ipcBridge = ipcBridge;
        this.logger = logger;
        this.stateExtractor = new StateExtractor(logger);
        this.worldMapper = new WorldMapper(logger);
        this.observationLoop = new ObservationLoop(ipcBridge, config, logger);
        this.logger.info('ObservationProvider initialized', { frequency: config.frequency });
    }
    async start() {
        this.logger.info('Starting observation provider');
        await this.observationLoop.start();
        await this.observeOnce(); // Get initial state
    }
    async stop() {
        this.logger.info('Stopping observation provider');
        await this.observationLoop.stop();
    }
    getCurrentWorldState() {
        return this.currentWorldState;
    }
    getMetrics() {
        return {
            ...this.observationLoop.getMetrics(),
            updateCount: this.updateCount,
            lastUpdateTime: this.lastUpdateTime,
            hasState: this.currentWorldState !== null,
        };
    }
    async observeOnce() {
        try {
            const gameState = this.observationLoop.getLastState();
            if (!gameState) {
                this.logger.debug('No game state available yet');
                return;
            }
            const startTime = Date.now();
            // Extract raw state
            const extractedState = this.stateExtractor.extract(gameState);
            // Map to world state
            const worldState = this.worldMapper.map(extractedState);
            this.currentWorldState = worldState;
            this.updateCount++;
            this.lastUpdateTime = Date.now() - startTime;
            if (this.lastUpdateTime > 50) {
                this.logger.warn('Slow observation update', {
                    tick: worldState.time.currentTick.number,
                    latency: this.lastUpdateTime,
                    agents: worldState.agents.length,
                });
            }
        }
        catch (err) {
            this.logger.error('Failed to update world state', err);
            // Don't throw - allow observation to continue
        }
    }
    /**
     * Register a callback to be invoked on each state update.
     * Callback receives the new WorldState.
     */
    onStateUpdate(callback) {
        const originalGetLastState = this.observationLoop.getLastState.bind(this.observationLoop);
        // This is a workaround - in production would use proper event emitter
        const checkState = setInterval(() => {
            const gameState = originalGetLastState();
            if (gameState) {
                try {
                    const extractedState = this.stateExtractor.extract(gameState);
                    const worldState = this.worldMapper.map(extractedState);
                    callback(worldState);
                }
                catch (err) {
                    this.logger.error('Callback error', err);
                }
            }
        }, 50); // Check frequently for updates
        // Return function to unsubscribe
        return () => clearInterval(checkState);
    }
}
//# sourceMappingURL=observation-provider.js.map