import { GameAdapter, GameSession, GameCapabilities } from '@ai-commander/adapter';
import { ZeroADConfiguration } from './types/configuration.js';
import { GameProcess } from './types/game-process.js';
import { IPCBridge } from './types/ipc-bridge.js';
import { ConfigurationLoader } from './config/configuration-loader.js';
import { Logger } from './config/logger.js';
import { GameProcessManager } from './process/game-process-manager.js';
import { IPCBridgeImpl } from './ipc/ipc-bridge-impl.js';
import { ObservationProvider } from './observation/observation-provider.js';
import { ZeroADGameSession } from './session/game-session.js';
import { generateUUID } from './utils/uuid.js';

const ZEROAD_CAPABILITIES: GameCapabilities = {
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

export class ZeroADAdapter implements GameAdapter {
  readonly adapterId = '0ad-adapter';
  readonly displayName = '0 A.D. Adapter';
  readonly capabilities = ZEROAD_CAPABILITIES;

  private config: ZeroADConfiguration;
  private logger: Logger;
  private process: GameProcess | null = null;
  private ipcBridge: IPCBridge | null = null;
  private observationProvider: ObservationProvider | null = null;
  private session: ZeroADGameSession | null = null;
  private initialized = false;

  constructor(configOverrides?: Partial<ZeroADConfiguration>) {
    this.config = ConfigurationLoader.load(configOverrides);
    this.logger = new Logger(this.config.logLevel, 'ZeroADAdapter');
  }

  async initialize(config?: Record<string, unknown>): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Adapter already initialized');
      return;
    }

    // Merge any config overrides
    if (config) {
      const overrides = Object.fromEntries(
        Object.entries(config).map(([k, v]) => [k, v])
      ) as Partial<ZeroADConfiguration>;
      this.config = ConfigurationLoader.load(overrides);
    }

    this.logger.info('Initializing adapter', { config: this.sanitizeConfig(this.config) });

    this.process = new GameProcessManager(
      {
        executablePath: this.config.gameExecutablePath,
        launchTimeout: this.config.launchTimeout!,
        shutdownTimeout: this.config.shutdownTimeout!,
      },
      this.logger
    );

    this.ipcBridge = new IPCBridgeImpl(
      {
        host: this.config.ipcHost!,
        port: this.config.ipcPort!,
        connectTimeout: this.config.launchTimeout!,
      },
      this.logger
    );

    this.observationProvider = new ObservationProvider(
      this.ipcBridge,
      {
        frequency: 10,
      },
      this.logger
    );

    this.initialized = true;
    this.logger.info('Adapter initialized successfully');
  }

  async createSession(gameConfig?: Record<string, unknown>): Promise<GameSession> {
    if (!this.initialized) {
      throw new Error('Adapter not initialized. Call initialize() first.');
    }

    if (this.session) {
      this.logger.warn('Session already exists. Closing previous session.');
      await this.session.stop();
    }

    const sessionId = `zeroad-${generateUUID()}`;
    this.session = new ZeroADGameSession(
      sessionId,
      ZEROAD_CAPABILITIES,
      this.process!,
      this.ipcBridge!,
      this.observationProvider!,
      this.logger,
      gameConfig
    );

    await this.session.start();
    return this.session;
  }

  async shutdown(): Promise<void> {
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

  async getAdapterInfo(): Promise<{ version: string; gameVersion?: string; compatibility?: string }> {
    return {
      version: '1.0.0',
      gameVersion: '0 A.D. 0.26.0+',
      compatibility: '0 A.D. >= 0.26.0',
    };
  }

  getConfig(): ZeroADConfiguration {
    return this.config;
  }

  getLogger(): Logger {
    return this.logger;
  }

  getProcess(): GameProcess {
    if (!this.process) {
      throw new Error('Process manager not initialized');
    }
    return this.process;
  }

  getIPCBridge(): IPCBridge {
    if (!this.ipcBridge) {
      throw new Error('IPC bridge not initialized');
    }
    return this.ipcBridge;
  }

  getObservationProvider(): ObservationProvider {
    if (!this.observationProvider) {
      throw new Error('Observation provider not initialized');
    }
    return this.observationProvider;
  }

  getSession(): ZeroADGameSession | null {
    return this.session;
  }

  private sanitizeConfig(config: ZeroADConfiguration): object {
    const { gameExecutablePath, gameDataPath, ...rest } = config;
    return {
      ...rest,
      gameExecutablePath: '<hidden>',
      gameDataPath: gameDataPath ? '<hidden>' : undefined,
    };
  }
}
