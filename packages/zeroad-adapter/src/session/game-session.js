import { ZeroADCommandExecutor } from './command-executor.js';
import { ZeroADObservationProvider } from './observation-provider.js';
export class ZeroADGameSession {
    constructor(sessionId, capabilities, process, ipcBridge, observationLoop, logger, config) {
        this.started = false;
        this.paused = false;
        this.sessionId = sessionId;
        this.capabilities = capabilities;
        this.process = process;
        this.ipcBridge = ipcBridge;
        this.observationLoop = observationLoop;
        this.logger = logger;
        this.config = config;
        this.observationProvider = new ZeroADObservationProvider(observationLoop, logger);
        this.commandExecutor = new ZeroADCommandExecutor(ipcBridge, logger);
    }
    async start() {
        if (this.started) {
            throw new Error('Session already started');
        }
        try {
            await this.process.start();
            await this.ipcBridge.connect();
            await this.observationLoop.start();
            this.started = true;
            this.logger.info('Game session started', { sessionId: this.sessionId });
            const worldState = await this.observationProvider.getWorldState();
            if (!worldState) {
                throw new Error('Failed to get initial world state');
            }
            return worldState;
        }
        catch (err) {
            this.logger.error('Failed to start game session', err);
            throw err;
        }
    }
    async pause() {
        if (!this.started || this.paused) {
            return;
        }
        // 0 A.D. doesn't support pause (supportsPause: false)
        this.logger.warn('Pause not supported by 0 A.D.');
    }
    async resume() {
        if (!this.started || !this.paused) {
            return;
        }
        // 0 A.D. doesn't support pause (supportsPause: false)
        this.logger.warn('Resume not supported by 0 A.D.');
    }
    async stop() {
        if (!this.started) {
            return;
        }
        try {
            await this.observationLoop.stop();
            await this.ipcBridge.disconnect();
            await this.process.stop();
            this.started = false;
            this.logger.info('Game session stopped', { sessionId: this.sessionId });
        }
        catch (err) {
            this.logger.error('Error stopping game session', err);
            throw err;
        }
    }
    async isActive() {
        if (!this.started) {
            return false;
        }
        try {
            // Check if we can still observe the game
            const available = await this.observationProvider.isObservationAvailable();
            return available;
        }
        catch {
            return false;
        }
    }
}
//# sourceMappingURL=game-session.js.map