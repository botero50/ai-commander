export class ZeroADObservationProvider {
    constructor(observationLoop, logger) {
        this.observationLoop = observationLoop;
        this.logger = logger;
    }
    async getWorldState() {
        try {
            const state = this.observationLoop.getCurrentWorldState();
            if (!state) {
                throw new Error('No world state available');
            }
            return state;
        }
        catch (err) {
            this.logger.error('Failed to get world state', err);
            throw err;
        }
    }
    async getWorldStateAt(tick) {
        // 0 A.D. doesn't support historical state retrieval
        this.logger.warn('Historical state retrieval not supported', { tick });
        return undefined;
    }
    async isObservationAvailable() {
        try {
            const state = this.observationLoop.getCurrentWorldState();
            return state !== null;
        }
        catch {
            return false;
        }
    }
}
//# sourceMappingURL=observation-provider.js.map