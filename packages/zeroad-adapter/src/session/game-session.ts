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
import { PlaybackController } from './playback-controller.js';
import { LiveDecisionTimeline } from '../commentary/live-decision-timeline.js';
import { DecisionOverlay } from '../match/decision-overlay.js';
import { LiveCommentary } from '../commentary/live-commentary.js';
import type { GameStateSnapshot } from '../commentary/live-commentary.js';
import { GameStateHUD } from '../hud/game-state-hud.js';

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
  private playbackController: PlaybackController | null = null;
  private decisionTimeline: LiveDecisionTimeline | null = null;
  private commentaryService: LiveCommentary | null = null;
  private gameStateHUD: GameStateHUD | null = null;
  private decisionOverlay: DecisionOverlay;
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
    this.decisionOverlay = new DecisionOverlay();

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

      // Initialize playback controller for live observation
      try {
        this.playbackController = new PlaybackController(this.eventFeed);

        // Subscribe to playback state changes to update observation loop
        this.eventFeed.subscribe((type, data) => {
          if (type === 'playback:paused') {
            (this.observationLoop as any).setPaused(true);
          } else if (type === 'playback:resumed') {
            (this.observationLoop as any).setPaused(false);
          } else if (type === 'playback:speed_changed') {
            (this.observationLoop as any).setPlaybackSpeed(data.newSpeed);
          }
        });

        this.logger.info('Playback controller initialized');

        // Initialize live decision timeline for spectator UI
        this.decisionTimeline = new LiveDecisionTimeline(this.decisionOverlay);
        this.logger.info('Decision timeline initialized');

        // Initialize live commentary service for esports-style narration
        const dramaticMomentDetector = (callback: (moment: any) => void) => {
          return this.eventFeed.subscribe((type, data) => {
            if (type === 'dramatic:moment') {
              callback(data);
            }
          });
        };

        const gameStateProvider = () => {
          try {
            const worldState = (this.observationLoop as any).getLastObservation?.();
            if (!worldState) return null;

            return {
              tick: worldState.tick,
              players: worldState.players.map((p: any) => ({
                id: p.id as 'player1' | 'player2',
                food: p.food,
                wood: p.wood,
                stone: p.stone,
                metal: p.metal,
                populationCurrent: p.populationCurrent,
                populationMax: p.populationMax,
                unitCount: p.units?.length ?? 0,
                buildingCount: p.buildings?.length ?? 0,
              })),
            } as GameStateSnapshot;
          } catch {
            return null;
          }
        };

        this.commentaryService = new LiveCommentary(
          this.decisionOverlay,
          dramaticMomentDetector,
          gameStateProvider,
          this.logger
        );
        this.commentaryService.start();
        this.logger.info('Live commentary service initialized');

        // Initialize game state HUD for live broadcast display
        this.gameStateHUD = new GameStateHUD(this.observationLoop as any);
        this.logger.info('Game state HUD initialized');
      } catch (playbackErr) {
        this.logger.warn('Failed to initialize playback controller', playbackErr);
        // Continue without playback controls
      }

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

        // Wire cinematic camera to playback controller
        if (this.playbackController) {
          this.playbackController.setCinematicCamera(this.cinematicCamera);
        }

        // Connect dramatic moments to cinematic responses and playback controller
        this.cameraManager.onDramaticMoment((moment) => {
          // Register with playback controller for navigation
          if (this.playbackController) {
            this.playbackController.registerDramaticMoment(moment);
          }

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
      // Stop decision timeline
      if (this.decisionTimeline) {
        this.decisionTimeline.destroy();
        this.decisionTimeline = null;
      }

      // Stop live commentary service
      if (this.commentaryService) {
        this.commentaryService.destroy();
        this.commentaryService = null;
      }

      // Stop game state HUD
      if (this.gameStateHUD) {
        this.gameStateHUD.destroy();
        this.gameStateHUD = null;
      }

      // Stop playback controller
      this.playbackController = null;

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
   * Get playback controller (if started)
   * For pause/resume, speed control, moment navigation
   */
  getPlaybackController(): PlaybackController | null {
    return this.playbackController;
  }

  /**
   * Get decision overlay
   * For recording brain decisions during match
   */
  getDecisionOverlay(): DecisionOverlay {
    return this.decisionOverlay;
  }

  /**
   * Get decision timeline (if started)
   * For spectator UI real-time decision display
   */
  getDecisionTimeline(): LiveDecisionTimeline | null {
    return this.decisionTimeline;
  }

  /**
   * Get live commentary service (if started)
   * For esports-style narration of gameplay
   */
  getCommentaryService(): LiveCommentary | null {
    return this.commentaryService;
  }

  /**
   * Get game state HUD service (if started)
   * For real-time broadcast display of resources, military, population
   */
  getGameStateHUD(): GameStateHUD | null {
    return this.gameStateHUD;
  }

  /**
   * Get event feed for subscribing to camera/game events
   */
  getEventFeed(): EventFeed {
    return this.eventFeed;
  }
}
