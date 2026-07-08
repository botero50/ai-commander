import { generateUUID } from '../utils/uuid.js';
export class Match {
    constructor(adapter, config, logger) {
        this.session = null;
        this.currentTick = 0;
        this.tickHistory = new Map();
        this.matchId = `match-${generateUUID()}`;
        this.adapter = adapter;
        this.logger = logger;
        this.metadata = {
            matchId: this.matchId,
            createdAt: Date.now(),
            config,
            status: 'created',
        };
        this.logger.info('Match created', {
            matchId: this.matchId,
            config: {
                mapName: config.mapName,
                numberOfPlayers: config.numberOfPlayers,
                turnDurationMs: config.turnDurationMs,
            },
        });
    }
    async start() {
        if (this.metadata.status !== 'created') {
            throw new Error(`Cannot start match in ${this.metadata.status} status`);
        }
        try {
            const sessionConfig = this.metadata.config;
            this.session = await this.adapter.createSession(sessionConfig);
            const initialState = await this.session.observationProvider.getWorldState();
            this.currentTick = initialState.time.currentTick.number;
            this.tickHistory.set(this.currentTick, initialState);
            this.metadata.status = 'started';
            this.metadata.startedAt = Date.now();
            this.logger.info('Match started', {
                matchId: this.matchId,
                initialTick: this.currentTick,
            });
            return initialState;
        }
        catch (err) {
            this.logger.error('Failed to start match', err);
            throw err;
        }
    }
    async stop() {
        if (this.session) {
            try {
                await this.session.stop();
            }
            catch (err) {
                this.logger.warn('Error stopping session', err);
            }
        }
        if (this.metadata.status !== 'ended') {
            this.metadata.status = 'ended';
            this.metadata.endedAt = Date.now();
        }
        this.logger.info('Match stopped', { matchId: this.matchId });
    }
    async getCurrentWorldState() {
        if (!this.session) {
            return null;
        }
        try {
            const state = await this.session.observationProvider.getWorldState();
            if (state) {
                this.currentTick = state.time.currentTick.number;
                this.tickHistory.set(this.currentTick, state);
            }
            return state;
        }
        catch (err) {
            this.logger.error('Failed to get world state', err);
            return null;
        }
    }
    getMetadata() {
        return { ...this.metadata };
    }
    getCurrentTick() {
        return this.currentTick;
    }
    getTickHistory() {
        return Array.from(this.tickHistory.keys()).sort((a, b) => a - b);
    }
    getWorldStateAt(tick) {
        return this.tickHistory.get(tick);
    }
    isActive() {
        return this.metadata.status === 'started';
    }
    getSession() {
        return this.session;
    }
}
//# sourceMappingURL=match.js.map