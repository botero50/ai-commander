/**
 * Spectator Coordinator
 * Manages multiple spectators, state synchronization, and viewing experience
 */

import { GameState } from '../state/state-types.js';

export interface SpectatorSession {
  spectatorId: string;
  name: string;
  role: 'viewer' | 'caster' | 'analyst' | 'admin';
  joinedAt: number;
  lastUpdate: number;
  viewportMode: 'free_camera' | 'follow_player' | 'strategic' | 'cinematic';
  focusedPlayerId?: number;
  isActive: boolean;
  bandwidth: number; // Mbps
  latency: number; // ms
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

export interface ViewportState {
  spectatorId: string;
  position: { x: number; z: number };
  zoom: number; // 0.5-3.0
  rotation: number; // degrees
  focusedEntity?: { type: 'player' | 'unit' | 'building'; id: number };
  timestamp: number;
}

export interface BroadcastState {
  broadcastId: string;
  isLive: boolean;
  spectatorCount: number;
  activeSpectators: string[];
  casterSpectators: string[];
  targetViewport?: ViewportState;
  eventQueue: BroadcastEvent[];
  recordingActive: boolean;
}

export interface BroadcastEvent {
  eventId: string;
  type: string; // 'unit_moved', 'building_constructed', 'battle_occurred', etc.
  timestamp: number;
  position?: { x: number; z: number };
  severity: number; // 1-10
  description: string;
}

export interface SpectatorViewUpdate {
  spectatorId: string;
  gameState: GameState;
  broadcastState: BroadcastState;
  viewportState: ViewportState;
  syncTimestamp: number;
}

/**
 * Coordinates multiple spectators and synchronizes viewing experience
 */
export class SpectatorCoordinator {
  private broadcastId: string;
  private sessions: Map<string, SpectatorSession> = new Map();
  private viewports: Map<string, ViewportState> = new Map();
  private broadcastState: BroadcastState;
  private eventQueue: BroadcastEvent[] = [];
  private maxEventQueue: number = 1000;
  private syncInterval: number = 100; // ms

  constructor(broadcastId: string) {
    this.broadcastId = broadcastId;
    this.broadcastState = {
      broadcastId,
      isLive: false,
      spectatorCount: 0,
      activeSpectators: [],
      casterSpectators: [],
      eventQueue: [],
      recordingActive: false,
    };
  }

  /**
   * Register new spectator session
   */
  registerSpectator(
    spectatorId: string,
    name: string,
    role: 'viewer' | 'caster' | 'analyst' | 'admin',
    bandwidth: number = 10
  ): SpectatorSession {
    const session: SpectatorSession = {
      spectatorId,
      name,
      role,
      joinedAt: Date.now(),
      lastUpdate: Date.now(),
      viewportMode: 'free_camera',
      isActive: true,
      bandwidth,
      latency: 50,
      quality: bandwidth > 5 ? 'high' : 'medium',
    };

    this.sessions.set(spectatorId, session);
    this.broadcastState.spectatorCount = this.sessions.size;
    this.broadcastState.activeSpectators.push(spectatorId);

    if (role === 'caster' || role === 'analyst') {
      this.broadcastState.casterSpectators.push(spectatorId);
    }

    return session;
  }

  /**
   * Remove spectator session
   */
  removeSpectator(spectatorId: string): void {
    const session = this.sessions.get(spectatorId);
    if (!session) return;

    this.sessions.delete(spectatorId);
    this.viewports.delete(spectatorId);

    this.broadcastState.spectatorCount = this.sessions.size;
    this.broadcastState.activeSpectators = this.broadcastState.activeSpectators.filter(
      (id) => id !== spectatorId
    );
    this.broadcastState.casterSpectators = this.broadcastState.casterSpectators.filter(
      (id) => id !== spectatorId
    );
  }

  /**
   * Update spectator viewport
   */
  updateViewport(
    spectatorId: string,
    position: { x: number; z: number },
    zoom: number,
    rotation: number = 0,
    focusedEntity?: { type: 'player' | 'unit' | 'building'; id: number }
  ): ViewportState {
    const viewport: ViewportState = {
      spectatorId,
      position: { x: Math.max(0, Math.min(200, position.x)), z: Math.max(0, Math.min(200, position.z)) },
      zoom: Math.max(0.5, Math.min(3.0, zoom)),
      rotation: rotation % 360,
      focusedEntity,
      timestamp: Date.now(),
    };

    this.viewports.set(spectatorId, viewport);

    // Broadcast admin/caster viewports to other viewers
    const session = this.sessions.get(spectatorId);
    if (session && (session.role === 'admin' || session.role === 'caster')) {
      this.broadcastState.targetViewport = viewport;
    }

    return viewport;
  }

  /**
   * Set viewport mode for spectator
   */
  setViewportMode(spectatorId: string, mode: 'free_camera' | 'follow_player' | 'strategic' | 'cinematic'): void {
    const session = this.sessions.get(spectatorId);
    if (!session) return;

    session.viewportMode = mode;
    session.lastUpdate = Date.now();
  }

  /**
   * Follow specific player
   */
  followPlayer(spectatorId: string, playerId: number): void {
    const session = this.sessions.get(spectatorId);
    if (!session) return;

    session.viewportMode = 'follow_player';
    session.focusedPlayerId = playerId;
    session.lastUpdate = Date.now();
  }

  /**
   * Record broadcast event
   */
  recordEvent(
    type: string,
    timestamp: number,
    position?: { x: number; z: number },
    severity: number = 5,
    description: string = ''
  ): BroadcastEvent {
    const event: BroadcastEvent = {
      eventId: `event_${this.eventQueue.length}_${timestamp}`,
      type,
      timestamp,
      position,
      severity: Math.max(1, Math.min(10, severity)),
      description,
    };

    this.eventQueue.push(event);
    this.broadcastState.eventQueue = this.eventQueue.slice(-100); // Keep last 100

    // Trim old events if needed
    if (this.eventQueue.length > this.maxEventQueue) {
      this.eventQueue = this.eventQueue.slice(-this.maxEventQueue);
    }

    return event;
  }

  /**
   * Start broadcast
   */
  startBroadcast(recordingActive: boolean = false): void {
    this.broadcastState.isLive = true;
    this.broadcastState.recordingActive = recordingActive;
  }

  /**
   * Stop broadcast
   */
  stopBroadcast(): void {
    this.broadcastState.isLive = false;
    this.broadcastState.recordingActive = false;
  }

  /**
   * Get broadcast state
   */
  getBroadcastState(): BroadcastState {
    return { ...this.broadcastState };
  }

  /**
   * Get spectator session
   */
  getSession(spectatorId: string): SpectatorSession | null {
    const session = this.sessions.get(spectatorId);
    return session ? { ...session } : null;
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): SpectatorSession[] {
    return Array.from(this.sessions.values()).map((s) => ({ ...s }));
  }

  /**
   * Get viewport for spectator
   */
  getViewport(spectatorId: string): ViewportState | null {
    const viewport = this.viewports.get(spectatorId);
    return viewport ? { ...viewport } : null;
  }

  /**
   * Generate view update for spectator
   */
  generateViewUpdate(spectatorId: string, gameState: GameState): SpectatorViewUpdate {
    const session = this.sessions.get(spectatorId);
    if (!session) {
      throw new Error(`Spectator ${spectatorId} not found`);
    }

    let viewport = this.viewports.get(spectatorId);

    // If no custom viewport, generate default based on viewport mode
    if (!viewport) {
      if (session.viewportMode === 'follow_player' && session.focusedPlayerId) {
        const player = gameState.players.find((p) => p.id === session.focusedPlayerId);
        viewport = {
          spectatorId,
          position: player ? { x: player.id * 50, z: 100 } : { x: 100, z: 100 },
          zoom: 1.5,
          rotation: 0,
          timestamp: Date.now(),
        };
      } else {
        // Default strategic view (centered, wide zoom)
        viewport = {
          spectatorId,
          position: { x: 100, z: 100 },
          zoom: 1.0,
          rotation: 0,
          timestamp: Date.now(),
        };
      }
    }

    session.lastUpdate = Date.now();

    return {
      spectatorId,
      gameState,
      broadcastState: this.broadcastState,
      viewportState: viewport,
      syncTimestamp: Date.now(),
    };
  }

  /**
   * Adjust quality based on bandwidth
   */
  adjustQuality(spectatorId: string, bandwidth: number): void {
    const session = this.sessions.get(spectatorId);
    if (!session) return;

    session.bandwidth = bandwidth;
    if (bandwidth < 2) {
      session.quality = 'low';
    } else if (bandwidth < 5) {
      session.quality = 'medium';
    } else if (bandwidth < 20) {
      session.quality = 'high';
    } else {
      session.quality = 'ultra';
    }

    session.lastUpdate = Date.now();
  }

  /**
   * Adjust latency (simulate network conditions)
   */
  updateLatency(spectatorId: string, latency: number): void {
    const session = this.sessions.get(spectatorId);
    if (!session) return;

    session.latency = Math.max(0, latency);
  }

  /**
   * Get event history
   */
  getEventHistory(sinceTimestamp?: number): BroadcastEvent[] {
    if (!sinceTimestamp) {
      return [...this.eventQueue];
    }

    return this.eventQueue.filter((e) => e.timestamp >= sinceTimestamp);
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalSpectators: number;
    activeSpectators: number;
    casters: number;
    avgBandwidth: number;
    avgLatency: number;
    totalEvents: number;
  } {
    const sessions = Array.from(this.sessions.values());
    const activeSessions = sessions.filter((s) => s.isActive);
    const casters = sessions.filter((s) => s.role === 'caster' || s.role === 'analyst');

    const totalBandwidth = sessions.reduce((sum, s) => sum + s.bandwidth, 0);
    const totalLatency = sessions.reduce((sum, s) => sum + s.latency, 0);

    return {
      totalSpectators: this.sessions.size,
      activeSpectators: activeSessions.length,
      casters: casters.length,
      avgBandwidth: sessions.length > 0 ? totalBandwidth / sessions.length : 0,
      avgLatency: sessions.length > 0 ? totalLatency / sessions.length : 0,
      totalEvents: this.eventQueue.length,
    };
  }

  /**
   * Reset coordinator
   */
  reset(): void {
    this.sessions.clear();
    this.viewports.clear();
    this.eventQueue = [];
    this.broadcastState = {
      broadcastId: this.broadcastId,
      isLive: false,
      spectatorCount: 0,
      activeSpectators: [],
      casterSpectators: [],
      eventQueue: [],
      recordingActive: false,
    };
  }
}
