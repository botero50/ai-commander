import { GameAdapter, GameSession } from '@ai-commander/adapter';
import { ZeroADConfiguration } from './types/configuration.js';
import { GameProcess } from './types/game-process.js';
import { IPCBridge } from './types/ipc-bridge.js';
import { ConfigurationLoader } from './config/configuration-loader.js';
import { Logger } from './config/logger.js';
import { GameProcessManager } from './process/game-process-manager.js';
import { IPCBridgeImpl } from './ipc/ipc-bridge-impl.js';

export class ZeroADAdapter implements GameAdapter {
  private config: ZeroADConfiguration;
  private logger: Logger;
  private process: GameProcess | null = null;
  private ipcBridge: IPCBridge | null = null;

  constructor(configOverrides?: Partial<ZeroADConfiguration>) {
    this.config = ConfigurationLoader.load(configOverrides);
    this.logger = new Logger(this.config.logLevel, 'ZeroADAdapter');
    this.logger.info('Adapter initialized', { config: this.sanitizeConfig(this.config) });

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
  }

  async startGame(): Promise<GameSession> {
    if (!this.process || !this.ipcBridge) {
      throw new Error('Adapter not properly initialized');
    }

    await this.process.start();
    await this.ipcBridge.connect();

    this.logger.info('Game started and IPC connected');
    throw new Error('GameSession implementation pending (Story 3)');
  }

  async stopGame(): Promise<void> {
    if (this.ipcBridge) {
      await this.ipcBridge.disconnect();
    }
    if (this.process) {
      await this.process.stop();
    }
  }

  async getSession(): Promise<GameSession | null> {
    throw new Error('Not yet implemented');
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

  private sanitizeConfig(config: ZeroADConfiguration): object {
    const { gameExecutablePath, gameDataPath, ...rest } = config;
    return {
      ...rest,
      gameExecutablePath: '<hidden>',
      gameDataPath: gameDataPath ? '<hidden>' : undefined,
    };
  }
}
