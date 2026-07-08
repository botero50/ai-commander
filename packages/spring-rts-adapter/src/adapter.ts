import { GameAdapter, GameSession, GameCapabilities } from '@ai-commander/adapter';
import type { SpringRTSConfiguration } from './types/configuration.js';
import { DEFAULT_CONFIG } from './types/configuration.js';
import type { GameProcess } from './types/game-process.js';
import type { IPCBridge } from './types/ipc-bridge.js';

const SPRING_CAPABILITIES: GameCapabilities = {
  supportsPause: false,
  supportsSaveState: false,
  supportsDeterministicMode: true,
  supportsReplay: true,
  supportsCompleteWorldState: true,
  supportsMultipleAgents: true,
  maxTicksPerSecond: 30,
  metadata: {
    name: 'Spring RTS',
    commandTypes: ['move', 'attack', 'gather', 'build', 'guard', 'patrol', 'repair'],
    maxPlayers: 16,
  },
};

export class SpringRTSAdapter implements GameAdapter {
  readonly adapterId = 'spring-rts-adapter';
  readonly displayName = 'Spring RTS Adapter';
  readonly capabilities = SPRING_CAPABILITIES;

  private config: SpringRTSConfiguration;
  private process: GameProcess | null = null;
  private ipcBridge: IPCBridge | null = null;
  private initialized = false;

  constructor(configOverrides?: Partial<SpringRTSConfiguration>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...configOverrides,
    };
  }

  async initialize(config?: Record<string, unknown>): Promise<void> {
    if (this.initialized) {
      console.warn('Adapter already initialized');
      return;
    }

    // Merge any config overrides
    if (config) {
      const overrides = Object.fromEntries(
        Object.entries(config).map(([k, v]) => [k, v])
      ) as Partial<SpringRTSConfiguration>;
      this.config = {
        ...this.config,
        ...overrides,
      };
    }

    console.info('Initializing Spring RTS adapter', { config: this.sanitizeConfig(this.config) });
    this.initialized = true;
  }

  async createSession(gameConfig?: Record<string, unknown>): Promise<GameSession> {
    if (!this.initialized) {
      throw new Error('Adapter not initialized. Call initialize() first.');
    }

    throw new Error('createSession not yet implemented for Spring RTS');
  }

  async shutdown(): Promise<void> {
    if (this.ipcBridge) {
      await this.ipcBridge.disconnect();
      this.ipcBridge = null;
    }
    if (this.process) {
      await this.process.stop();
      this.process = null;
    }
    this.initialized = false;
    console.info('Spring RTS adapter shutdown complete');
  }

  async getAdapterInfo(): Promise<{ version: string; gameVersion?: string; compatibility?: string }> {
    return {
      version: '1.0.0',
      gameVersion: 'Spring Engine 104+',
      compatibility: 'Spring Engine >= 104.0',
    };
  }

  getConfig(): SpringRTSConfiguration {
    return this.config;
  }

  private sanitizeConfig(config: SpringRTSConfiguration): object {
    const { gameExecutablePath, gameDataPath, ...rest } = config;
    return {
      ...rest,
      gameExecutablePath: '<hidden>',
      gameDataPath: gameDataPath ? '<hidden>' : undefined,
    };
  }
}
