/**
 * AI Status Service
 * Processes real-time AI decision data and emits status updates for broadcast display
 * Shows: provider, model, current action, objective, latency, confidence
 */

import type { DecisionEvent } from '../match/decision-overlay.js';
import type { TimelineEntry } from '../web/decision-timeline.js';
import { LiveDecisionTimeline } from '../commentary/live-decision-timeline.js';
import { DecisionOverlay } from '../match/decision-overlay.js';
import { ObjectiveInferenceEngine, type DecisionCategory } from './objective-inference.js';
import { extractBrainMetadata, type BrainMetadata } from './brain-metadata.js';

export interface AIStatus {
  playerId: 'player1' | 'player2';
  brainId: string;
  brainName: string;
  provider: string;
  model: string;

  // Current decision
  currentAction: string;
  currentCategory: DecisionCategory;
  actionSummary?: string;

  // Decision latency
  lastDecisionLatencyMs: number;
  averageDecisionLatencyMs: number;

  // Confidence
  confidence: number; // 0-1

  // Inferred objective
  currentObjective: string;
  objectiveConfidence: number; // 0-1

  // Metadata
  lastDecisionTick: number;
  lastDecisionTime: number;
  decisionCount: number;
}

export interface AIStatusState {
  tick: number;
  timestamp: number;
  players: [AIStatus, AIStatus];
}

type AIStatusSubscriber = (state: AIStatusState) => void;

/**
 * AI Status Service
 * Tracks real-time AI decision-making status for spectator display
 */
export class AIStatusService {
  private decisionOverlay: DecisionOverlay;
  private decisionTimeline: LiveDecisionTimeline;
  private brainMetadata: Map<string, BrainMetadata>;
  private subscribers: Set<AIStatusSubscriber> = new Set();

  // State tracking per player
  private statusPerPlayer: Map<'player1' | 'player2', AIStatus> = new Map();
  private latencyWindowPerPlayer: Map<'player1' | 'player2', number[]> = new Map();
  private objectiveEnginePerPlayer: Map<'player1' | 'player2', ObjectiveInferenceEngine> = new Map();
  private decisionCountPerPlayer: Map<'player1' | 'player2', number> = new Map();

  constructor(
    decisionOverlay: DecisionOverlay,
    decisionTimeline: LiveDecisionTimeline,
    brainMetadata?: Array<{ id: string; name: string; provider?: string; model?: string }>
  ) {
    this.decisionOverlay = decisionOverlay;
    this.decisionTimeline = decisionTimeline;

    // Initialize brain metadata lookup
    this.brainMetadata = new Map();
    if (brainMetadata) {
      for (const meta of brainMetadata) {
        const extracted = extractBrainMetadata(meta.id, meta.name, {
          provider: meta.provider,
          model: meta.model,
        });
        this.brainMetadata.set(meta.id, extracted);
      }
    }

    // Initialize per-player state
    for (const player of ['player1', 'player2'] as const) {
      this.latencyWindowPerPlayer.set(player, []);
      this.objectiveEnginePerPlayer.set(player, new ObjectiveInferenceEngine());
      this.decisionCountPerPlayer.set(player, 0);
      this.statusPerPlayer.set(player, this.createEmptyStatus(player));
    }

    this.subscribeToDecisions();
  }

  /**
   * Subscribe to status updates
   */
  subscribe(callback: AIStatusSubscriber): () => void {
    this.subscribers.add(callback);

    // Send current state immediately if available
    const player1Status = this.statusPerPlayer.get('player1');
    const player2Status = this.statusPerPlayer.get('player2');
    if (player1Status && player2Status) {
      callback({
        tick: player1Status.lastDecisionTick,
        timestamp: player1Status.lastDecisionTime,
        players: [player1Status, player2Status],
      });
    }

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Subscribe to decision overlay events
   */
  private subscribeToDecisions(): void {
    // Subscribe to decision overlay for latency and action updates
    this.decisionOverlay.subscribe((event: DecisionEvent) => {
      this.processDecisionEvent(event);
    });
  }

  /**
   * Process decision event and update status
   */
  private processDecisionEvent(event: DecisionEvent): void {
    const player = event.player;

    // Update decision count
    const currentCount = this.decisionCountPerPlayer.get(player) || 0;
    this.decisionCountPerPlayer.set(player, currentCount + 1);

    // Update latency window (keep last 10 decisions)
    const latencies = this.latencyWindowPerPlayer.get(player) || [];
    latencies.push(event.durationMs);
    if (latencies.length > 10) {
      latencies.shift();
    }
    this.latencyWindowPerPlayer.set(player, latencies);

    // Update objective inference
    const objectiveEngine = this.objectiveEnginePerPlayer.get(player);
    if (objectiveEngine && event.summary?.category) {
      objectiveEngine.recordDecision(event.summary.category);
    }

    // Get current objective inference
    const objective = objectiveEngine?.inferObjective() ?? {
      objective: 'Unknown',
      confidence: 0,
      evidence: [],
    };

    // Build updated status
    const status = this.statusPerPlayer.get(player) || this.createEmptyStatus(player);

    const updatedStatus: AIStatus = {
      playerId: player,
      brainId: this.getOrDefaultBrainId(player, event.brainName),
      brainName: event.brainName,
      provider: this.getBrainProvider(event.brainName),
      model: this.getBrainModel(event.brainName),
      currentAction: event.summary?.summary || `${event.commandCount} command${event.commandCount !== 1 ? 's' : ''}`,
      currentCategory: (event.summary?.category as DecisionCategory) || 'unknown',
      actionSummary: event.summary?.summary,
      lastDecisionLatencyMs: event.durationMs,
      averageDecisionLatencyMs: this.calculateAverageLatency(latencies),
      confidence: event.summary?.confidence ?? 0.5,
      currentObjective: objective.objective,
      objectiveConfidence: objective.confidence,
      lastDecisionTick: event.tick,
      lastDecisionTime: event.timestamp,
      decisionCount: currentCount + 1,
    };

    this.statusPerPlayer.set(player, updatedStatus);

    // Emit update
    this.emitStatusUpdate();
  }

  /**
   * Emit status update to all subscribers
   */
  private emitStatusUpdate(): void {
    const player1Status = this.statusPerPlayer.get('player1');
    const player2Status = this.statusPerPlayer.get('player2');

    if (!player1Status || !player2Status) {
      return;
    }

    const state: AIStatusState = {
      tick: Math.max(player1Status.lastDecisionTick, player2Status.lastDecisionTick),
      timestamp: Math.max(player1Status.lastDecisionTime, player2Status.lastDecisionTime),
      players: [player1Status, player2Status],
    };

    for (const subscriber of this.subscribers) {
      try {
        subscriber(state);
      } catch (err) {
        console.error('Error in AI status subscriber:', err);
      }
    }
  }

  /**
   * Calculate average latency from window
   */
  private calculateAverageLatency(latencies: number[]): number {
    if (latencies.length === 0) return 0;
    const sum = latencies.reduce((a, b) => a + b, 0);
    return Math.round(sum / latencies.length);
  }

  /**
   * Get brain provider from brain name or metadata
   */
  private getBrainProvider(brainName: string): string {
    const meta = this.brainMetadata.get(brainName);
    if (meta) {
      return meta.provider;
    }

    // Try to parse from brain name
    const parts = brainName.split('-');
    if (parts.length > 0) {
      const provider = parts[0].toLowerCase();
      if (provider === 'ollama') return 'Ollama';
      if (provider === 'openai') return 'OpenAI';
      if (provider === 'anthropic') return 'Anthropic';
      if (provider === 'google') return 'Google';
    }

    return 'Unknown';
  }

  /**
   * Get brain model from brain name or metadata
   */
  private getBrainModel(brainName: string): string {
    const meta = this.brainMetadata.get(brainName);
    if (meta) {
      return meta.model;
    }

    // Try to parse from brain name
    const parts = brainName.split('-');
    if (parts.length > 1) {
      return parts.slice(1).join('-');
    }

    return 'Unknown';
  }

  /**
   * Get or default brain ID
   */
  private getOrDefaultBrainId(player: 'player1' | 'player2', brainName: string): string {
    // Try to find brain ID in metadata by name
    for (const [id, meta] of this.brainMetadata.entries()) {
      if (meta.name === brainName) {
        return id;
      }
    }

    // Default: use brain name as ID
    return brainName;
  }

  /**
   * Create empty status for a player
   */
  private createEmptyStatus(player: 'player1' | 'player2'): AIStatus {
    return {
      playerId: player,
      brainId: 'unknown',
      brainName: 'Awaiting connection...',
      provider: 'Unknown',
      model: 'Unknown',
      currentAction: 'Initializing...',
      currentCategory: 'unknown',
      actionSummary: undefined,
      lastDecisionLatencyMs: 0,
      averageDecisionLatencyMs: 0,
      confidence: 0,
      currentObjective: 'Starting...',
      objectiveConfidence: 0,
      lastDecisionTick: 0,
      lastDecisionTime: 0,
      decisionCount: 0,
    };
  }

  /**
   * Get last status
   */
  getLastStatus(): AIStatusState | null {
    const player1 = this.statusPerPlayer.get('player1');
    const player2 = this.statusPerPlayer.get('player2');

    if (!player1 || !player2) {
      return null;
    }

    return {
      tick: Math.max(player1.lastDecisionTick, player2.lastDecisionTick),
      timestamp: Math.max(player1.lastDecisionTime, player2.lastDecisionTime),
      players: [player1, player2],
    };
  }

  /**
   * Destroy service
   */
  destroy(): void {
    this.subscribers.clear();
    this.objectiveEnginePerPlayer.forEach((engine) => engine.reset());
  }
}
