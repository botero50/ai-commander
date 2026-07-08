import { GameAdapter, GameSession } from '@ai-commander/adapter';
import { ZeroADConfiguration } from './types/configuration.js';
import { GameProcess } from './types/game-process.js';
import { IPCBridge } from './types/ipc-bridge.js';

export class ZeroADAdapter implements GameAdapter {
  private config: ZeroADConfiguration;
  private process: GameProcess | null = null;
  private ipcBridge: IPCBridge | null = null;

  constructor(config: ZeroADConfiguration) {
    this.config = this.validateConfig(config);
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

  private validateConfig(config: ZeroADConfiguration): ZeroADConfiguration {
    if (!config.gameExecutablePath) {
      throw new Error('gameExecutablePath is required');
    }
    return config;
  }
}
