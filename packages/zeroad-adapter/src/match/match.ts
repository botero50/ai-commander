import { WorldState } from '@ai-commander/domain';
import { GameSession } from '@ai-commander/adapter';
import { Logger } from '../config/logger.js';
import { ZeroADAdapter } from '../adapter.js';
import { MatchConfig, MatchMetadata } from './match-config.js';
import { generateUUID } from '../utils/uuid.js';

export class Match {
  readonly matchId: string;
  private adapter: ZeroADAdapter;
  private session: GameSession | null = null;
  private logger: Logger;
  private metadata: MatchMetadata;
  private currentTick: number = 0;
  private tickHistory: Map<number, WorldState> = new Map();

  constructor(adapter: ZeroADAdapter, config: MatchConfig, logger: Logger) {
    this.matchId = `match-${generateUUID()}`;
    this.adapter = adapter;
    this.logger = logger;
    this.metadata = {
      matchId: this.matchId,
      createdAt: Date.now(),
      config,
      status: 'created',
    };

    this.logger.info('Match created', {
      matchId: this.matchId,
      config: {
        mapName: config.mapName,
        numberOfPlayers: config.numberOfPlayers,
        turnDurationMs: config.turnDurationMs,
      },
    });
  }

  async start(): Promise<WorldState> {
    if (this.metadata.status !== 'created') {
      throw new Error(`Cannot start match in ${this.metadata.status} status`);
    }

    try {
      const sessionConfig = this.metadata.config as unknown as Record<string, unknown>;
      this.session = await this.adapter.createSession(sessionConfig);
      const initialState = await this.session.observationProvider.getWorldState();

      this.currentTick = initialState.time.currentTick.number;
      this.tickHistory.set(this.currentTick, initialState);

      this.metadata.status = 'started';
      this.metadata.startedAt = Date.now();

      this.logger.info('Match started', {
        matchId: this.matchId,
        initialTick: this.currentTick,
      });

      return initialState;
    } catch (err) {
      this.logger.error('Failed to start match', err);
      throw err;
    }
  }

  async stop(): Promise<void> {
    if (this.session) {
      try {
        await this.session.stop();
      } catch (err) {
        this.logger.warn('Error stopping session', err);
      }
    }

    if (this.metadata.status !== 'ended') {
      this.metadata.status = 'ended';
      this.metadata.endedAt = Date.now();
    }

    this.logger.info('Match stopped', { matchId: this.matchId });
  }

  async getCurrentWorldState(): Promise<WorldState | null> {
    if (!this.session) {
      return null;
    }

    try {
      const state = await this.session.observationProvider.getWorldState();
      if (state) {
        this.currentTick = state.time.currentTick.number;
        this.tickHistory.set(this.currentTick, state);
      }
      return state;
    } catch (err) {
      this.logger.error('Failed to get world state', err);
      return null;
    }
  }

  getMetadata(): MatchMetadata {
    return { ...this.metadata };
  }

  getCurrentTick(): number {
    return this.currentTick;
  }

  getTickHistory(): number[] {
    return Array.from(this.tickHistory.keys()).sort((a, b) => a - b);
  }

  getWorldStateAt(tick: number): WorldState | undefined {
    return this.tickHistory.get(tick);
  }

  isActive(): boolean {
    return this.metadata.status === 'started';
  }

  getSession(): GameSession | null {
    return this.session;
  }
}
