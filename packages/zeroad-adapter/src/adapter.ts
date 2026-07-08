import { GameAdapter, GameSession } from '@ai-commander/adapter';
import { ZeroADConfiguration } from './types/configuration.js';
import { GameProcess } from './types/game-process.js';
import { IPCBridge } from './types/ipc-bridge.js';
import { ConfigurationLoader } from './config/configuration-loader.js';
import { Logger } from './config/logger.js';

export class ZeroADAdapter implements GameAdapter {
  private config: ZeroADConfiguration;
  private logger: Logger;
  private process: GameProcess | null = null;
  private ipcBridge: IPCBridge | null = null;

  constructor(configOverrides?: Partial<ZeroADConfiguration>) {
    this.config = ConfigurationLoader.load(configOverrides);
    this.logger = new Logger(this.config.logLevel, 'ZeroADAdapter');
    this.logger.info('Adapter initialized', { config: this.sanitizeConfig(this.config) });
  }

  async startGame(): Promise<GameSession> {
    throw new Error('Not yet implemented');
  }

  async stopGame(): Promise<void> {
    throw new Error('Not yet implemented');
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

  private sanitizeConfig(config: ZeroADConfiguration): object {
    const { gameExecutablePath, gameDataPath, ...rest } = config;
    return {
      ...rest,
      gameExecutablePath: '<hidden>',
      gameDataPath: gameDataPath ? '<hidden>' : undefined,
    };
  }
}
