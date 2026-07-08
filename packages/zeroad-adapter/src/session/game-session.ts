import { GameSession, GameCapabilities, ObservationProvider as IObservationProvider, CommandExecutor } from '@ai-commander/adapter';
import { WorldState, Command } from '@ai-commander/domain';
import { GameProcess } from '../types/game-process.js';
import { IPCBridge } from '../types/ipc-bridge.js';
import { Logger } from '../config/logger.js';
import { ObservationProvider } from '../observation/observation-provider.js';
import { ZeroADCommandExecutor } from './command-executor.js';
import { ZeroADObservationProvider } from './observation-provider.js';
import { generateUUID } from '../utils/uuid.js';

export class ZeroADGameSession implements GameSession {
  readonly sessionId: string;
  readonly capabilities: GameCapabilities;

  private process: GameProcess;
  private ipcBridge: IPCBridge;
  private observationLoop: ObservationProvider;
  private logger: Logger;
  private config?: Record<string, unknown>;
  private started = false;
  private paused = false;

  readonly observationProvider: IObservationProvider;
  readonly commandExecutor: CommandExecutor;

  constructor(
    sessionId: string,
    capabilities: GameCapabilities,
    process: GameProcess,
    ipcBridge: IPCBridge,
    observationLoop: ObservationProvider,
    logger: Logger,
    config?: Record<string, unknown>
  ) {
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

  async start(): Promise<WorldState> {
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
    } catch (err) {
      this.logger.error('Failed to start game session', err);
      throw err;
    }
  }

  async pause(): Promise<void> {
    if (!this.started || this.paused) {
      return;
    }
    // 0 A.D. doesn't support pause (supportsPause: false)
    this.logger.warn('Pause not supported by 0 A.D.');
  }

  async resume(): Promise<void> {
    if (!this.started || !this.paused) {
      return;
    }
    // 0 A.D. doesn't support pause (supportsPause: false)
    this.logger.warn('Resume not supported by 0 A.D.');
  }

  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    try {
      await this.observationLoop.stop();
      await this.ipcBridge.disconnect();
      await this.process.stop();

      this.started = false;
      this.logger.info('Game session stopped', { sessionId: this.sessionId });
    } catch (err) {
      this.logger.error('Error stopping game session', err);
      throw err;
    }
  }

  async isActive(): Promise<boolean> {
    if (!this.started) {
      return false;
    }

    try {
      // Check if we can still observe the game
      const available = await this.observationProvider.isObservationAvailable();
      return available;
    } catch {
      return false;
    }
  }
}
