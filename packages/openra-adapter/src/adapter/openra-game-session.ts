import type { GameSession } from '@ai-commander/adapter';
import type { GameCapabilities } from '@ai-commander/adapter';
import type { WorldState } from '@ai-commander/domain';
import { OpenRAObservationProvider } from '../observation/openra-observation-provider.js';
import { OpenRACommandExecutor } from '../command/openra-command-executor.js';

/**
 * OpenRA game session.
 *
 * Composition of ObservationProvider and CommandExecutor.
 * Manages the lifecycle of a single game instance.
 */
export class OpenRAGameSession implements GameSession {
  readonly sessionId: string;
  readonly capabilities: GameCapabilities;
  readonly observationProvider: OpenRAObservationProvider;
  readonly commandExecutor: OpenRACommandExecutor;

  private isSessionActive: boolean = false;
  private stateAccessor: (() => Promise<any>) | null = null;
  private orderSubmitter: ((order: any) => Promise<boolean>) | null = null;
  private stateChecker: (() => Promise<boolean>) | null = null;

  constructor(
    sessionId: string,
    capabilities: GameCapabilities,
    stateAccessor: () => Promise<any>,
    orderSubmitter: (order: any) => Promise<boolean>,
    stateChecker: () => Promise<boolean>
  ) {
    this.sessionId = sessionId;
    this.capabilities = capabilities;
    this.stateAccessor = stateAccessor;
    this.orderSubmitter = orderSubmitter;
    this.stateChecker = stateChecker;

    // Create providers
    this.observationProvider = new OpenRAObservationProvider(stateAccessor);
    this.commandExecutor = new OpenRACommandExecutor(0, orderSubmitter, stateChecker);
  }

  async start(): Promise<WorldState> {
    if (this.isSessionActive) {
      throw new Error('Session is already active');
    }

    if (!this.stateAccessor || !this.stateChecker) {
      throw new Error('Session was not properly initialized');
    }

    // Verify game is available
    const available = await this.stateChecker();
    if (!available) {
      throw new Error('Game is not available for session start');
    }

    // Get initial world state
    const initialState = await this.observationProvider.getWorldState();

    this.isSessionActive = true;
    return initialState;
  }

  async pause(): Promise<void> {
    if (!this.isSessionActive) {
      throw new Error('Session is not active');
    }

    if (!this.capabilities.supportsPause) {
      throw new Error('Game does not support pause');
    }

    // OpenRA supports pause through its menu/API
    // For now, this is a no-op as pause requires game API access
    // which would be implemented at a lower level
  }

  async resume(): Promise<void> {
    if (!this.isSessionActive) {
      throw new Error('Session is not active');
    }

    if (!this.capabilities.supportsPause) {
      throw new Error('Game does not support resume');
    }

    // OpenRA resume implementation would go here
    // For now, this is a no-op
  }

  async saveState(): Promise<string> {
    if (!this.isSessionActive) {
      throw new Error('Session is not active');
    }

    if (!this.capabilities.supportsSaveState) {
      throw new Error('Game does not support state saving');
    }

    // OpenRA supports save state through its replay system
    // For now, this is a placeholder
    const saveId = `save-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    return saveId;
  }

  async restoreState(saveId: string): Promise<void> {
    if (!this.isSessionActive) {
      throw new Error('Session is not active');
    }

    if (!this.capabilities.supportsSaveState) {
      throw new Error('Game does not support state restoration');
    }

    if (!saveId) {
      throw new Error('Invalid save ID');
    }

    // OpenRA state restoration would go here
    // For now, this is a placeholder
  }

  async stop(): Promise<void> {
    if (!this.isSessionActive) {
      throw new Error('Session is not active');
    }

    // Clear references to prevent further use
    this.stateAccessor = null;
    this.orderSubmitter = null;
    this.stateChecker = null;
    this.isSessionActive = false;
  }

  async isActive(): Promise<boolean> {
    if (!this.isSessionActive) {
      return false;
    }

    if (!this.stateChecker) {
      return false;
    }

    try {
      return await this.stateChecker();
    } catch {
      return false;
    }
  }
}
