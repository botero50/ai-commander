/**
 * Story 57.1 — Broadcast Data Bridge
 *
 * Pipes real SessionEventBus events to broadcast overlay.
 * Transforms game events into broadcast-ready data format.
 *
 * Data Flow:
 *   SessionEventBus (real game events)
 *     ↓
 *   BroadcastDataBridge (transforms)
 *     ↓
 *   Broadcast Overlay (displays on stream)
 */

import { EventEmitter } from 'events';
import { Logger } from '../config/logger.js';
import type { SessionEventBus } from '../session/session-events.js';

export interface BroadcastPlayerStats {
  playerId: number;
  playerName: string;
  resources: {
    wood: number;
    stone: number;
    food: number;
    metal?: number;
  };
  units: number;
  buildings: number;
  population: number;
  militaryValue: number;
}

export interface BroadcastObservation {
  tick: number;
  timestamp: string;
  players: BroadcastPlayerStats[];
}

export interface BroadcastDecision {
  tick: number;
  playerId: number;
  playerName: string;
  decision: {
    objective: string;
    confidence: number;
  };
  latency: number;
}

export interface BroadcastCommand {
  tick: number;
  playerId: number;
  playerName: string;
  action: string;
  target?: string;
}

export interface BroadcastVictory {
  winner: {
    id: number;
    name: string;
  };
  losers: Array<{
    id: number;
    name: string;
  }>;
  duration: number; // seconds
  reason: string;
}

export interface BroadcastData {
  matchId: string;
  type: 'observation' | 'decision' | 'command' | 'victory' | 'match-start' | 'match-end';
  data: BroadcastObservation | BroadcastDecision | BroadcastCommand | BroadcastVictory | Record<string, any>;
  timestamp: string;
}

export class BroadcastDataBridge extends EventEmitter {
  private logger: Logger;
  private eventBus: SessionEventBus | null = null;
  private matchId: string = '';
  private playerCount: number = 0;
  private lastObservation: BroadcastObservation | null = null;

  constructor(logger?: Logger) {
    super();
    this.logger = logger || new Logger('info', 'BroadcastDataBridge');
  }

  /**
   * Connect bridge to SessionEventBus
   */
  connectEventBus(eventBus: SessionEventBus, matchId: string, playerCount: number): void {
    this.eventBus = eventBus;
    this.matchId = matchId;
    this.playerCount = playerCount;

    this.logger.info('Broadcast bridge connected to event bus', {
      matchId,
      playerCount,
    });

    // Listen to match start
    eventBus.on('match:started', (event: any) => {
      this.handleMatchStart(event);
    });

    // Listen to observations
    eventBus.on('observation:received', (event: any) => {
      this.handleObservation(event);
    });

    // Listen to decisions
    eventBus.on('decision:completed', (event: any) => {
      this.handleDecision(event);
    });

    // Listen to commands
    eventBus.on('command:executed', (event: any) => {
      this.handleCommand(event);
    });

    // Listen to match end
    eventBus.on('match:ended', (event: any) => {
      this.handleMatchEnd(event);
    });
  }

  /**
   * Disconnect from event bus
   */
  disconnect(): void {
    if (this.eventBus) {
      this.eventBus.removeAllListeners('match:started');
      this.eventBus.removeAllListeners('observation:received');
      this.eventBus.removeAllListeners('decision:completed');
      this.eventBus.removeAllListeners('command:executed');
      this.eventBus.removeAllListeners('match:ended');
      this.eventBus = null;
    }
    this.logger.info('Broadcast bridge disconnected');
  }

  /**
   * Handle match start event
   */
  private handleMatchStart(event: any): void {
    const broadcastData: BroadcastData = {
      matchId: event.matchId || this.matchId,
      type: 'match-start',
      data: {
        map: event.map || 'unknown',
        players: (event.players || []).map((p: any, idx: number) => ({
          id: p.id || idx + 1,
          name: p.name || `Player ${idx + 1}`,
          civilization: p.civilization || 'Unknown',
        })),
        countdown: 3,
      },
      timestamp: new Date().toISOString(),
    };

    this.emit('data', broadcastData);
    this.logger.debug('Match start event bridged');
  }

  /**
   * Handle observation event (real game state)
   */
  private handleObservation(event: any): void {
    const obs = event.observation || {};

    const broadcastObs: BroadcastObservation = {
      tick: event.tick || 0,
      timestamp: event.timestamp || new Date().toISOString(),
      players: [
        {
          playerId: event.playerId || 1,
          playerName: event.playerName || 'Player 1',
          resources: {
            wood: obs.resources?.wood || 300,
            stone: obs.resources?.stone || 200,
            food: obs.resources?.food || 250,
            metal: obs.resources?.metal || 0,
          },
          units: obs.units || 10,
          buildings: obs.buildings || 5,
          population: obs.population || 15,
          militaryValue: this.calculateMilitaryValue(obs),
        },
      ],
    };

    const broadcastData: BroadcastData = {
      matchId: this.matchId,
      type: 'observation',
      data: broadcastObs,
      timestamp: new Date().toISOString(),
    };

    this.lastObservation = broadcastObs;
    this.emit('data', broadcastData);
  }

  /**
   * Handle decision event (AI action)
   */
  private handleDecision(event: any): void {
    const decision = event.decision || {};

    const broadcastDecision: BroadcastDecision = {
      tick: event.tick || 0,
      playerId: event.playerId || 1,
      playerName: event.playerName || 'Player',
      decision: {
        objective: decision.objective || 'Execute strategy',
        confidence: decision.confidence || 0.75,
      },
      latency: event.latency || 0,
    };

    const broadcastData: BroadcastData = {
      matchId: this.matchId,
      type: 'decision',
      data: broadcastDecision,
      timestamp: new Date().toISOString(),
    };

    this.emit('data', broadcastData);
  }

  /**
   * Handle command event (action execution)
   */
  private handleCommand(event: any): void {
    const command = event.command || {};

    const broadcastCommand: BroadcastCommand = {
      tick: event.tick || 0,
      playerId: event.playerId || 1,
      playerName: event.playerName || 'Player',
      action: command.action || 'unknown',
      target: command.target,
    };

    const broadcastData: BroadcastData = {
      matchId: this.matchId,
      type: 'command',
      data: broadcastCommand,
      timestamp: new Date().toISOString(),
    };

    this.emit('data', broadcastData);
  }

  /**
   * Handle match end event (victory)
   */
  private handleMatchEnd(event: any): void {
    const duration = event.duration?.seconds || 0;

    const broadcastVictory: BroadcastVictory = {
      winner: {
        id: event.winner?.id || 1,
        name: event.winner?.name || 'Unknown',
      },
      losers: (event.runners || []).map((r: any) => ({
        id: r.id || 2,
        name: r.name || 'Defeated',
      })),
      duration,
      reason: this.determineVictoryReason(event),
    };

    const broadcastData: BroadcastData = {
      matchId: this.matchId,
      type: 'match-end',
      data: broadcastVictory,
      timestamp: new Date().toISOString(),
    };

    this.emit('data', broadcastData);
    this.logger.debug('Match end event bridged');

    // Emit delayed match-end to allow overlay animation
    setTimeout(() => {
      this.emit('data', {
        matchId: this.matchId,
        type: 'victory',
        data: broadcastVictory,
        timestamp: new Date().toISOString(),
      });
    }, 2000);
  }

  /**
   * Subscribe to broadcast data stream
   */
  onBroadcastData(callback: (data: BroadcastData) => void): void {
    this.on('data', callback);
  }

  /**
   * Get last known game state
   */
  getLastObservation(): BroadcastObservation | null {
    return this.lastObservation;
  }

  /**
   * Calculate military value from observation
   */
  private calculateMilitaryValue(obs: any): number {
    // Rough estimate: military units count
    const militaryUnits = obs.militaryUnits || Math.floor((obs.units || 0) * 0.3);
    return militaryUnits * 10; // Each unit worth 10 points
  }

  /**
   * Determine why victory occurred
   */
  private determineVictoryReason(event: any): string {
    const stats = event.statistics || {};

    if (stats.militaryValue && stats.militaryValue > 100) {
      return 'Military dominance';
    } else if (stats.totalCommands && stats.totalCommands > 500) {
      return 'Superior economy and expansion';
    } else {
      return 'Opponent defeated';
    }
  }

  /**
   * Export bridge as JSON (for testing)
   */
  toJSON(): Record<string, any> {
    return {
      matchId: this.matchId,
      playerCount: this.playerCount,
      connected: this.eventBus !== null,
      lastObservation: this.lastObservation,
    };
  }
}

/**
 * Factory function for creating bridge
 */
export function createBroadcastDataBridge(logger?: Logger): BroadcastDataBridge {
  return new BroadcastDataBridge(logger);
}
