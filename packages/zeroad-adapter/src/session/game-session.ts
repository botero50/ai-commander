import { GameSession, GameCapabilities, ObservationProvider as IObservationProvider, CommandExecutor } from '@ai-commander/adapter';
import { WorldState, Command } from '@ai-commander/domain';
import { GameProcess } from '../types/game-process.js';
import { IPCBridge } from '../types/ipc-bridge.js';
import { Logger } from '../config/logger.js';
import { ObservationProvider } from '../observation/observation-provider.js';
import { ZeroADCommandExecutor } from './command-executor.js';
import { ZeroADObservationProvider } from './observation-provider.js';
import { generateUUID } from '../utils/uuid.js';
import { AutomaticCameraManager } from '../camera/automatic-camera-manager.js';
import { CinematicModeManager } from '../camera/cinematic-mode-manager.js';
import { CINEMATIC_CONFIG } from '../camera/camera-config.js';
import { EventFeed } from '../match/event-feed.js';

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
  private cameraManager: AutomaticCameraManager | null = null;
  private cinematicCamera: CinematicModeManager | null = null;
  private eventFeed: EventFeed;

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
    this.eventFeed = new EventFeed();

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

      // Initialize camera managers for spectator experience
      try {
        // Automatic camera (follows interesting locations)
        this.cameraManager = new AutomaticCameraManager(
          this.commandExecutor as any,
          this.observationProvider as any,
          this.eventFeed
        );
        this.cameraManager.start();
        this.logger.info('Automatic camera manager started');

        // Cinematic camera (director-controlled movements)
        this.cinematicCamera = new CinematicModeManager(CINEMATIC_CONFIG);
        this.cinematicCamera.subscribe((event, data) => {
          this.eventFeed.broadcast(`cinematic:${event}`, data);
        });

        // Connect dramatic moments to cinematic responses
        this.cameraManager.onDramaticMoment((moment) => {
          // In cinematic mode, respond to dramatic moments
          if (this.cinematicCamera?.getMode() === 'cinematic') {
            this.cinematicCamera
              .focusOnLocation(moment.position.x, moment.position.z, 0.7)
              .catch((err) => {
                this.logger.warn('Failed to focus on dramatic moment', err);
              });
          }
        });

        this.logger.info('Cinematic camera manager started');
      } catch (cameraErr) {
        this.logger.warn('Failed to start camera managers', cameraErr);
        // Continue without camera, don't fail entire session
      }

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
      // Stop camera managers first
      if (this.cameraManager) {
        this.cameraManager.stop();
        this.cameraManager = null;
      }

      if (this.cinematicCamera) {
        this.cinematicCamera.clear();
        this.cinematicCamera = null;
      }

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

  /**
   * Get automatic camera manager (if started)
   * Follows interesting locations automatically
   */
  getAutomaticCamera(): AutomaticCameraManager | null {
    return this.cameraManager;
  }

  /**
   * Get automatic camera manager (if started)
   * Alias for backwards compatibility
   */
  getCameraManager(): AutomaticCameraManager | null {
    return this.cameraManager;
  }

  /**
   * Get cinematic camera manager (if started)
   * For director-controlled camera movements
   */
  getCinematicCamera(): CinematicModeManager | null {
    return this.cinematicCamera;
  }

  /**
   * Get event feed for subscribing to camera/game events
   */
  getEventFeed(): EventFeed {
    return this.eventFeed;
  }
}
