/**
 * Live AI Decision Display — Show what AI is currently thinking
 *
 * Displays (without exposing chain-of-thought):
 * - Current observation summary
 * - Current objective (selected goal)
 * - Selected action (command)
 * - Execution latency
 * - Confidence level
 * - Decision status (executing, waiting, error)
 */

import type { BrainDecision, WorldObservation } from '@ai-commander/brain';

export type DecisionPhase = 'observing' | 'analyzing' | 'planning' | 'executing' | 'waiting' | 'error';

export interface ObservationSummary {
  readonly tick: number;
  readonly unitCount: number;
  readonly enemyUnitCount: number;
  readonly resourcesAvailable: number;
  readonly mapExplored: number; // percentage
  readonly mapVisible: number; // percentage
}

export interface DecisionDisplay {
  readonly playerId: number;
  readonly tick: number;
  readonly phase: DecisionPhase;
  readonly observation: ObservationSummary;
  readonly currentObjective: string; // human-readable goal
  readonly selectedActions: readonly string[]; // up to 3 actions
  readonly commandCount: number;
  readonly latencyMs: number;
  readonly confidence: number; // 0-100
  readonly timestamp: number;
}

/**
 * Convert raw brain decision to display format
 */
export function formatBrainDecision(
  playerId: number,
  observation: WorldObservation,
  decision: BrainDecision,
  latencyMs: number,
  tick: number
): DecisionDisplay {
  const objectiveMap: Record<string, string> = {
    expand: '🗺️ Expand Territory',
    defend: '🛡️ Defend Base',
    attack: '⚔️ Attack Enemy',
    gather: '💎 Gather Resources',
    scout: '🔍 Scout Map',
    fallback: '⏸️ Fallback',
    none: '⏳ Waiting',
  };

  const actionMap: Record<string, string> = {
    move: '👉 Move Units',
    attack: '⚔️ Attack',
    build: '🏗️ Build Structure',
    gather: '💎 Gather',
    repair: '🔧 Repair',
    defend: '🛡️ Defend',
    scout: '🔍 Scout',
    stop: '⏹️ Stop',
  };

  const objective = objectiveMap[decision.selectedGoal] || decision.selectedGoal;

  const actions = decision.commands
    .slice(0, 3)
    .map((cmd) => {
      // Try to match against known action types
      for (const [key, label] of Object.entries(actionMap)) {
        if (cmd.includes(key)) {
          return label;
        }
      }
      return cmd;
    });

  const exploredPercent = Math.round((observation.visibility.explored / observation.visibility.totalMap) * 100);
  const visiblePercent = Math.round((observation.visibility.visible / observation.visibility.totalMap) * 100);

  return {
    playerId,
    tick,
    phase: 'executing',
    observation: {
      tick: observation.tick,
      unitCount: observation.friendlyUnits.length,
      enemyUnitCount: observation.enemyUnits.length,
      resourcesAvailable: observation.resources.reduce((sum, r) => sum + r.amount, 0),
      mapExplored: exploredPercent,
      mapVisible: visiblePercent,
    },
    currentObjective: objective,
    selectedActions: actions,
    commandCount: decision.commands.length,
    latencyMs,
    confidence: Math.round(decision.confidence * 100),
    timestamp: Date.now(),
  };
}

/**
 * Format decision for human display
 */
export class DecisionDisplayFormatter {
  /**
   * Format as concise single-line status
   */
  static toStatusLine(display: DecisionDisplay): string {
    const statusEmoji = {
      observing: '👁️',
      analyzing: '🧠',
      planning: '📋',
      executing: '⚡',
      waiting: '⏳',
      error: '❌',
    };

    return `${statusEmoji[display.phase]} ${display.currentObjective} • ${display.selectedActions[0] || 'Idle'} • ${display.latencyMs}ms • ${display.confidence}%`;
  }

  /**
   * Format as detailed panel
   */
  static toPanel(display: DecisionDisplay): string {
    const lines: string[] = [];

    lines.push(`=== Player ${display.playerId} Decision (Tick ${display.tick}) ===`);
    lines.push('');

    lines.push(`📊 Observation:`);
    lines.push(`   Units: ${display.observation.unitCount} | Enemy: ${display.observation.enemyUnitCount}`);
    lines.push(`   Resources: ${display.observation.resourcesAvailable} | Map: ${display.observation.mapExplored}% explored`);
    lines.push('');

    lines.push(`🎯 Current Objective: ${display.currentObjective}`);
    lines.push(`   Confidence: ${display.confidence}%`);
    lines.push('');

    lines.push(`📋 Selected Actions (${display.commandCount} total):`);
    display.selectedActions.forEach((action, i) => {
      lines.push(`   ${i + 1}. ${action}`);
    });
    lines.push('');

    lines.push(`⏱️ Latency: ${display.latencyMs}ms`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Format as JSON
   */
  static toJSON(display: DecisionDisplay): string {
    return JSON.stringify(display, null, 2);
  }

  /**
   * Comparison view (two players side by side)
   */
  static compareDecisions(display1: DecisionDisplay, display2: DecisionDisplay): string {
    const lines: string[] = [];

    lines.push('╔════════════════════════════════════════════════════════════════════╗');
    lines.push('║                        LIVE DECISION VIEW                          ║');
    lines.push('╠════════════════════════════════════════════════════════════════════╣');
    lines.push('║                                                                    ║');
    lines.push(`║ PLAYER 1: ${display1.currentObjective.padEnd(40)}${display1.latencyMs}ms   ║`);
    lines.push(`║ ${display1.selectedActions[0]?.padEnd(52) || 'Idle'.padEnd(52)}║`);
    lines.push(`║ Confidence: ${display1.confidence}% | Units: ${display1.observation.unitCount.toString().padStart(2)}                           ║`);
    lines.push('║                                                                    ║');
    lines.push('╠════════════════════════════════════════════════════════════════════╣');
    lines.push('║                                                                    ║');
    lines.push(`║ PLAYER 2: ${display2.currentObjective.padEnd(40)}${display2.latencyMs}ms   ║`);
    lines.push(`║ ${display2.selectedActions[0]?.padEnd(52) || 'Idle'.padEnd(52)}║`);
    lines.push(`║ Confidence: ${display2.confidence}% | Units: ${display2.observation.unitCount.toString().padStart(2)}                           ║`);
    lines.push('║                                                                    ║');
    lines.push('╚════════════════════════════════════════════════════════════════════╝');

    return lines.join('\n');
  }
}

/**
 * Manager for live decision display
 */
export class LiveDecisionManager {
  private decisions = new Map<number, DecisionDisplay>();
  private callbacks = new Set<(displays: [DecisionDisplay, DecisionDisplay]) => void>();

  /**
   * Update decision for a player
   */
  recordDecision(display: DecisionDisplay): void {
    this.decisions.set(display.playerId, display);

    // If we have both players' decisions, notify
    if (this.decisions.size === 2) {
      const p1 = this.decisions.get(1)!;
      const p2 = this.decisions.get(2)!;
      this.callbacks.forEach((cb) => cb([p1, p2]));
    }
  }

  /**
   * Subscribe to decision updates
   */
  onDecisionsReady(callback: (displays: [DecisionDisplay, DecisionDisplay]) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Get latest display for a player
   */
  getDisplay(playerId: number): DecisionDisplay | undefined {
    return this.decisions.get(playerId);
  }

  /**
   * Get both latest displays
   */
  getBothDisplays(): [DecisionDisplay, DecisionDisplay] | null {
    const p1 = this.decisions.get(1);
    const p2 = this.decisions.get(2);

    if (p1 && p2) {
      return [p1, p2];
    }
    return null;
  }

  /**
   * Clear decisions for next tick
   */
  reset(): void {
    this.decisions.clear();
  }
}
