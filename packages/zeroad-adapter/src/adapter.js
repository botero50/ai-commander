import { ConfigurationLoader } from './config/configuration-loader.js';
import { Logger } from './config/logger.js';
import { GameProcessManager } from './process/game-process-manager.js';
import { IPCBridgeImpl } from './ipc/ipc-bridge-impl.js';
import { ObservationProvider } from './observation/observation-provider.js';
import { ZeroADGameSession } from './session/game-session.js';
import { generateUUID } from './utils/uuid.js';
const ZEROAD_CAPABILITIES = {
    supportsPause: false,
    supportsSaveState: false,
    supportsDeterministicMode: true,
    supportsReplay: true,
    supportsCompleteWorldState: true,
    supportsMultipleAgents: true,
    maxTicksPerSecond: 20,
    metadata: {
        name: '0 A.D. (Pyrogenesis)',
        commandTypes: ['move', 'attack', 'gather', 'build', 'train', 'patrol', 'repair', 'stop'],
        maxPlayers: 8,
    },
};
export class ZeroADAdapter {
    adapterId = '0ad-adapter';
    displayName = '0 A.D. Adapter';
    capabilities = ZEROAD_CAPABILITIES;
    config;
    logger;
    process = null;
    ipcBridge = null;
    observationProvider = null;
    session = null;
    initialized = false;
    constructor(configOverrides) {
        this.config = ConfigurationLoader.load(configOverrides);
        this.logger = new Logger(this.config.logLevel, 'ZeroADAdapter');
    }
    async initialize(config) {
        if (this.initialized) {
            this.logger.warn('Adapter already initialized');
            return;
        }
        // Merge any config overrides
        if (config) {
            const overrides = Object.fromEntries(Object.entries(config).map(([k, v]) => [k, v]));
            this.config = ConfigurationLoader.load(overrides);
        }
        this.logger.info('Initializing adapter', { config: this.sanitizeConfig(this.config) });
        this.process = new GameProcessManager({
            executablePath: this.config.gameExecutablePath,
            launchTimeout: this.config.launchTimeout,
            shutdownTimeout: this.config.shutdownTimeout,
        }, this.logger);
        this.ipcBridge = new IPCBridgeImpl({
            host: this.config.ipcHost,
            port: this.config.ipcPort,
            connectTimeout: this.config.launchTimeout,
        }, this.logger);
        this.observationProvider = new ObservationProvider(this.ipcBridge, {
            frequency: 10,
        }, this.logger);
        this.initialized = true;
        this.logger.info('Adapter initialized successfully');
    }
    async createSession(gameConfig) {
        if (!this.initialized) {
            throw new Error('Adapter not initialized. Call initialize() first.');
        }
        if (this.session) {
            this.logger.warn('Session already exists. Closing previous session.');
            await this.session.stop();
        }
        const sessionId = `zeroad-${generateUUID()}`;
        this.session = new ZeroADGameSession(sessionId, ZEROAD_CAPABILITIES, this.process, this.ipcBridge, this.observationProvider, this.logger, gameConfig);
        await this.session.start();
        return this.session;
    }
    async shutdown() {
        if (this.session) {
            await this.session.stop();
            this.session = null;
        }
        if (this.observationProvider) {
            // ObservationProvider cleanup handled by session
            this.observationProvider = null;
        }
        if (this.ipcBridge) {
            await this.ipcBridge.disconnect();
            this.ipcBridge = null;
        }
        if (this.process) {
            await this.process.stop();
            this.process = null;
        }
        this.initialized = false;
        this.logger.info('Adapter shutdown complete');
    }
    async getAdapterInfo() {
        return {
            version: '1.0.0',
            gameVersion: '0 A.D. 0.26.0+',
            compatibility: '0 A.D. >= 0.26.0',
        };
    }
    getConfig() {
        return this.config;
    }
    getLogger() {
        return this.logger;
    }
    getProcess() {
        if (!this.process) {
            throw new Error('Process manager not initialized');
        }
        return this.process;
    }
    getIPCBridge() {
        if (!this.ipcBridge) {
            throw new Error('IPC bridge not initialized');
        }
        return this.ipcBridge;
    }
    getObservationProvider() {
        if (!this.observationProvider) {
            throw new Error('Observation provider not initialized');
        }
        return this.observationProvider;
    }
    getSession() {
        return this.session;
    }
    sanitizeConfig(config) {
        const { gameExecutablePath, gameDataPath, ...rest } = config;
        return {
            ...rest,
            gameExecutablePath: '<hidden>',
            gameDataPath: gameDataPath ? '<hidden>' : undefined,
        };
    }
}
//# sourceMappingURL=adapter.js.map