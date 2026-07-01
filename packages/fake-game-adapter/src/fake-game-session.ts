import type {
  GameSession,
  ObservationProvider,
  CommandExecutor,
  GameCapabilities,
} from '@ai-commander/adapter';
import { AdapterError, AdapterErrorCode } from '@ai-commander/adapter';
import type { WorldState } from '@ai-commander/domain';
import { FakeObservationProvider } from './fake-observation-provider.js';
import { FakeCommandExecutor } from './fake-command-executor.js';
import type { FakeWorldSnapshot } from './world/fake-world-state.js';
import { createInitialWorld, progressTick } from './world/fake-world-state.js';

/**
 * Fake game session.
 *
 * Manages a single in-memory game instance.
 * Lifecycle: start → pause/resume/execute → stop
 */
export class FakeGameSession implements GameSession {
  readonly sessionId: string;
  readonly observationProvider: ObservationProvider;
  readonly commandExecutor: CommandExecutor;
  readonly capabilities: GameCapabilities;

  private readonly capabilitiesValue: GameCapabilities = Object.freeze({
    supportsPause: true,
    supportsSaveState: true,
    supportsDeterministicMode: true,
    supportsReplay: true,
    supportsCompleteWorldState: true,
    supportsMultipleAgents: false,
    metadata: Object.freeze({
      description: 'Fake in-memory game for framework validation',
      'agent-count': '1',
      'map-size': 'infinite',
    }),
  });

  private world: FakeWorldSnapshot;
  private stateStack: FakeWorldSnapshot[] = [];
  private active: boolean = false;
  private paused: boolean = false;
  private observationProviderImpl: FakeObservationProvider;
  private commandExecutorImpl: FakeCommandExecutor;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.world = createInitialWorld();

    this.observationProviderImpl = new FakeObservationProvider(this.world);
    this.commandExecutorImpl = new FakeCommandExecutor(this.world);

    this.observationProvider = this.observationProviderImpl;
    this.commandExecutor = this.commandExecutorImpl;
    this.capabilities = this.capabilitiesValue;

    this.commandExecutorImpl.onWorldChange((newWorld) => {
      this.world = newWorld;
      this.observationProviderImpl.recordWorldState(newWorld);
    });
  }

  async isActive(): Promise<boolean> {
    return Promise.resolve(this.active);
  }

  async start(): Promise<WorldState> {
    if (this.active) {
      throw new AdapterError('Session already started', AdapterErrorCode.SessionStartFailed);
    }

    this.active = true;
    this.paused = false;
    this.world = createInitialWorld();
    this.stateStack = [];
    this.observationProviderImpl.markAvailable();
    this.commandExecutorImpl.markAvailable();

    return this.observationProviderImpl.getWorldState();
  }

  async pause(): Promise<void> {
    if (!this.active) {
      throw new AdapterError('Session is not active', AdapterErrorCode.SessionNotActive);
    }

    if (!this.capabilitiesValue.supportsPause) {
      throw new AdapterError('Pause is not supported', AdapterErrorCode.PauseFailed);
    }

    this.paused = true;
    return Promise.resolve();
  }

  async resume(): Promise<void> {
    if (!this.active) {
      throw new AdapterError('Session is not active', AdapterErrorCode.SessionNotActive);
    }

    if (!this.paused) {
      throw new AdapterError('Session is not paused', AdapterErrorCode.ResumeFailed);
    }

    this.paused = false;
    return Promise.resolve();
  }

  async saveState(): Promise<string> {
    if (!this.active) {
      throw new AdapterError('Session is not active', AdapterErrorCode.SessionNotActive);
    }

    if (!this.capabilitiesValue.supportsSaveState) {
      throw new AdapterError('Save state is not supported', AdapterErrorCode.SaveStateFailed);
    }

    this.stateStack.push(this.world);
    return Promise.resolve(
      JSON.stringify({
        tick: this.world.tick,
        savedAt: Date.now(),
      })
    );
  }

  async restoreState(_saveId: string): Promise<void> {
    if (!this.active) {
      throw new AdapterError('Session is not active', AdapterErrorCode.SessionNotActive);
    }

    if (!this.capabilitiesValue.supportsSaveState) {
      throw new AdapterError('Restore state is not supported', AdapterErrorCode.RestoreStateFailed);
    }

    if (this.stateStack.length === 0) {
      throw new AdapterError('No saved states available', AdapterErrorCode.RestoreStateFailed);
    }

    const previousWorld = this.stateStack.pop();
    if (previousWorld === undefined) {
      throw new AdapterError('Failed to restore state', AdapterErrorCode.RestoreStateFailed);
    }

    this.world = previousWorld;
    this.observationProviderImpl.recordWorldState(previousWorld);
    return Promise.resolve();
  }

  async stop(): Promise<void> {
    if (!this.active) {
      throw new AdapterError('Session is not active', AdapterErrorCode.SessionNotActive);
    }

    this.active = false;
    this.paused = false;
    this.observationProviderImpl.markUnavailable();
    this.commandExecutorImpl.markUnavailable();
    return Promise.resolve();
  }

  // Internal: Progress to next tick
  async progressTick(): Promise<void> {
    if (!this.active || this.paused) {
      throw new AdapterError(
        'Cannot progress tick: session not active or paused',
        AdapterErrorCode.SessionNotActive
      );
    }

    this.world = progressTick(this.world);
    this.observationProviderImpl.recordWorldState(this.world);
    return Promise.resolve();
  }
}
