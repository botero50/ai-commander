/**
 * Decision Timeline
 *
 * Format and display decision history with observation → reasoning → command flow.
 * - Map decisions to timeline frames
 * - Extract observation snapshots
 * - Format reasoning and commands for display
 */

import type { DecisionEvent } from '../match/decision-overlay.js';
import type { TimelineSnapshot } from '../match/match-timeline.js';

/**
 * Observation data at a tick
 */
export interface ObservationData {
  readonly tick: number;
  readonly unitCount: number;
  readonly buildingCount: number;
  readonly playerCount: number;
  readonly resourcesPerPlayer: Array<Record<string, number>>;
}

/**
 * Formatted command in a decision
 */
export interface FormattedCommand {
  readonly id: string;
  readonly action: string;
  readonly target?: string;
  readonly parameters?: Record<string, unknown>;
}

/**
 * Formatted decision timeline entry
 */
export interface DecisionTimelineEntry {
  readonly tick: number;
  readonly timestamp: number;
  readonly player: 'Player 1' | 'Player 2';
  readonly brain: string;
  readonly observation: ObservationData;
  readonly reasoning: string;
  readonly commands: readonly FormattedCommand[];
  readonly duration: number; // milliseconds
  readonly commandCount: number;
}

/**
 * Format a raw command string into structured commands
 */
function parseCommands(commandString: string): FormattedCommand[] {
  // If it's a JSON array, parse it
  if (commandString.startsWith('[')) {
    try {
      const parsed = JSON.parse(commandString);
      if (Array.isArray(parsed)) {
        return parsed.map((cmd, i) => ({
          id: `cmd-${i}`,
          action: typeof cmd === 'string' ? cmd : cmd.action || 'unknown',
          target: typeof cmd === 'object' ? cmd.target : undefined,
          parameters: typeof cmd === 'object' && cmd.parameters ? cmd.parameters : undefined,
        }));
      }
    } catch {
      // Fall through to string parsing
    }
  }

  // Parse as space-separated commands
  const commands = commandString
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return commands.map((cmd, i) => ({
    id: `cmd-${i}`,
    action: cmd,
  }));
}

/**
 * Decision timeline manager
 */
export class DecisionTimeline {
  private entries: Map<number, DecisionTimelineEntry> = new Map();

  /**
   * Add decision to timeline
   */
  addDecision(
    decision: DecisionEvent,
    observation: TimelineSnapshot
  ): void {
    const commands = this.parseCommandList(decision.commands);

    const entry: DecisionTimelineEntry = {
      tick: decision.tick,
      timestamp: decision.timestamp,
      player: decision.player === 'player1' ? 'Player 1' : 'Player 2',
      brain: decision.brainName,
      observation: {
        tick: observation.tick,
        unitCount: observation.gameState.unitCount,
        buildingCount: observation.gameState.buildingCount,
        playerCount: observation.gameState.playerCount,
        resourcesPerPlayer: [...observation.gameState.resourcesPerPlayer],
      },
      reasoning: decision.reasoning || '',
      commands,
      duration: decision.durationMs,
      commandCount: commands.length,
    };

    this.entries.set(decision.tick, entry);
  }

  /**
   * Parse command list from decision
   */
  private parseCommandList(commands: readonly string[] | string): FormattedCommand[] {
    if (Array.isArray(commands)) {
      return commands.map((cmd, i) => parseCommands(cmd).map((c) => ({ ...c, id: `${i}-${c.id}` }))).flat();
    }

    return parseCommands(commands as string);
  }

  /**
   * Get decision at tick
   */
  getDecision(tick: number): DecisionTimelineEntry | null {
    return this.entries.get(tick) || null;
  }

  /**
   * Get decisions in range
   */
  getDecisionsInRange(startTick: number, endTick: number): DecisionTimelineEntry[] {
    const results: DecisionTimelineEntry[] = [];

    for (let tick = startTick; tick <= endTick; tick++) {
      const entry = this.entries.get(tick);
      if (entry) {
        results.push(entry);
      }
    }

    return results;
  }

  /**
   * Get all decisions
   */
  getAllDecisions(): DecisionTimelineEntry[] {
    return Array.from(this.entries.values()).sort((a, b) => a.tick - b.tick);
  }

  /**
   * Get decisions by player
   */
  getDecisionsByPlayer(player: 'Player 1' | 'Player 2'): DecisionTimelineEntry[] {
    return this.getAllDecisions().filter((d) => d.player === player);
  }

  /**
   * Get decisions by brain
   */
  getDecisionsByBrain(brainName: string): DecisionTimelineEntry[] {
    return this.getAllDecisions().filter((d) => d.brain === brainName);
  }

  /**
   * Search decisions by reasoning keyword
   */
  searchByReasoning(keyword: string): DecisionTimelineEntry[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.getAllDecisions().filter((d) => d.reasoning.toLowerCase().includes(lowerKeyword));
  }

  /**
   * Get decision statistics
   */
  getStatistics(): {
    readonly totalDecisions: number;
    readonly averageDuration: number;
    readonly totalCommands: number;
    readonly averageCommandsPerDecision: number;
  } {
    const decisions = this.getAllDecisions();

    if (decisions.length === 0) {
      return {
        totalDecisions: 0,
        averageDuration: 0,
        totalCommands: 0,
        averageCommandsPerDecision: 0,
      };
    }

    const totalDuration = decisions.reduce((sum, d) => sum + d.duration, 0);
    const totalCommands = decisions.reduce((sum, d) => sum + d.commandCount, 0);

    return {
      totalDecisions: decisions.length,
      averageDuration: Math.round(totalDuration / decisions.length),
      totalCommands,
      averageCommandsPerDecision: Math.round((totalCommands / decisions.length) * 100) / 100,
    };
  }

  /**
   * Get ticks with decisions
   */
  getTicksWithDecisions(): number[] {
    return Array.from(this.entries.keys()).sort((a, b) => a - b);
  }
}
