import { AdapterError, AdapterErrorCode } from '@ai-commander/adapter';
import { FakeGameSession } from './fake-game-session.js';
/**
 * Fake game adapter.
 *
 * Entry point for creating sessions with the in-memory fake game.
 * Reference implementation of GameAdapter interface.
 */
export class FakeGameAdapter {
    constructor() {
        this.adapterId = 'fake-game';
        this.displayName = 'Fake In-Memory Game';
        this.capabilities = Object.freeze({
            supportsPause: true,
            supportsSaveState: true,
            supportsDeterministicMode: true,
            supportsReplay: true,
            supportsCompleteWorldState: true,
            supportsMultipleAgents: false,
            metadata: Object.freeze({
                description: 'Deterministic in-memory game for framework validation',
                agents: '1',
                'world-type': 'infinite-grid',
                deterministic: 'true',
            }),
        });
        this.initialized = false;
        this.sessionCounter = 0;
    }
    async initialize() {
        this.initialized = true;
        return Promise.resolve();
    }
    async createSession() {
        if (!this.initialized) {
            throw new AdapterError('Adapter not initialized', AdapterErrorCode.InitializationFailed);
        }
        this.sessionCounter += 1;
        const sessionId = `fake-session-${this.sessionCounter}`;
        return Promise.resolve(new FakeGameSession(sessionId));
    }
    async shutdown() {
        this.initialized = false;
        this.sessionCounter = 0;
        return Promise.resolve();
    }
    async getAdapterInfo() {
        return Promise.resolve({
            version: '0.1.0',
            compatible: ['0.1.0'],
        });
    }
}
//# sourceMappingURL=fake-game-adapter.js.map