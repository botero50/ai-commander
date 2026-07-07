/**
 * Match Runner — Execute matches and collect replay/trace/metrics
 *
 * Orchestrates match execution:
 * 1. Initialize two brains (red vs blue player)
 * 2. Load initial world state from game adapter
 * 3. Run tick loop, alternating brain decisions
 * 4. Collect tick-by-tick trace
 * 5. Calculate outcome and metrics
 */

import type { Brain, BrainDecision, WorldObservation } from '@ai-commander/brain';

export interface MatchConfig {
  readonly redBrain: Brain;
  readonly blueBrain: Brain;
  readonly mapSeed: number;
  readonly maxTicks: number;
  readonly gameAdapterId: string;
}

export interface MatchMetrics {
  readonly matchId: string;
  readonly redPlayer: string;
  readonly bluePlayer: string;
  readonly mapSeed: number;
  readonly winner: 'red' | 'blue' | 'draw';
  readonly totalTicks: number;
  readonly duration: number; // milliseconds
  readonly redScore: number;
  readonly blueScore: number;
  readonly redTokensUsed: number;
  readonly redCost: number;
  readonly blueTokensUsed: number;
  readonly blueCost: number;
}

export interface MatchReplay {
  readonly config: MatchConfig;
  readonly metrics: MatchMetrics;
  readonly trace: ReadonlyArray<MatchTick>;
}

export interface MatchTick {
  readonly tickNumber: number;
  readonly timestamp: number;
  readonly redState: WorldObservation;
  readonly blueState: WorldObservation;
  readonly redDecision: BrainDecision;
  readonly blueDecision: BrainDecision;
  readonly redExecuted: ReadonlyArray<string>;
  readonly blueExecuted: ReadonlyArray<string>;
}

/**
 * Match Runner: Execute matches between two brains
 *
 * Returns full replay with trace (all ticks), metrics, and configuration.
 */
export class MatchRunner {
  static async run(config: MatchConfig): Promise<MatchReplay> {
    const startTime = Date.now();
    const matchId = `${config.redBrain.name}-vs-${config.blueBrain.name}-${config.mapSeed}-${startTime}`;

    const trace: MatchTick[] = [];
    let currentRedState = this.createInitialWorldObservation(config, 'red');
    let currentBlueState = this.createInitialWorldObservation(config, 'blue');

    const redMemory = { recentEvents: [], recentDecisions: [], metrics: {} };
    const blueMemory = { recentEvents: [], recentDecisions: [], metrics: {} };

    for (let tick = 0; tick < config.maxTicks; tick++) {
      // Red brain decision
      const redAvailableGoals = this.getAvailableGoals(currentRedState);
      const redAvailableCommands = this.getAvailableCommands(currentRedState);
      const redDecision = await config.redBrain.decide(
        currentRedState,
        redAvailableGoals,
        redAvailableCommands,
        redMemory
      );

      // Blue brain decision
      const blueAvailableGoals = this.getAvailableGoals(currentBlueState);
      const blueAvailableCommands = this.getAvailableCommands(currentBlueState);
      const blueDecision = await config.blueBrain.decide(
        currentBlueState,
        blueAvailableGoals,
        blueAvailableCommands,
        blueMemory
      );

      // Execute commands (simplified: just record which commands were selected)
      const redExecuted = redDecision.commands.slice(0, 3);
      const blueExecuted = blueDecision.commands.slice(0, 3);

      // Apply effects to world state (simplified)
      currentRedState = this.applyEffects(currentRedState, redExecuted);
      currentBlueState = this.applyEffects(currentBlueState, blueExecuted);

      // Record tick
      trace.push({
        tickNumber: tick,
        timestamp: Date.now(),
        redState: currentRedState,
        blueState: currentBlueState,
        redDecision,
        blueDecision,
        redExecuted,
        blueExecuted,
      });

      // Update memory
      redMemory.recentEvents.push({
        tick,
        action: redDecision.selectedGoal,
        outcome: 'executed',
      });
      blueMemory.recentEvents.push({
        tick,
        action: blueDecision.selectedGoal,
        outcome: 'executed',
      });

      // Check win condition (simplified)
      if (currentRedState.agent.health <= 0 || currentBlueState.agent.health <= 0) {
        break;
      }
    }

    const duration = Date.now() - startTime;
    const winner = this.determineWinner(currentRedState, currentBlueState);
    const redMetrics = (config.redBrain as any).getMetrics?.() || {
      totalTokensUsed: 0,
      totalCost: 0,
    };
    const blueMetrics = (config.blueBrain as any).getMetrics?.() || {
      totalTokensUsed: 0,
      totalCost: 0,
    };

    const metrics: MatchMetrics = {
      matchId,
      redPlayer: config.redBrain.name,
      bluePlayer: config.blueBrain.name,
      mapSeed: config.mapSeed,
      winner,
      totalTicks: trace.length,
      duration,
      redScore: currentRedState.agent.resources,
      blueScore: currentBlueState.agent.resources,
      redTokensUsed: redMetrics.totalTokensUsed,
      redCost: redMetrics.totalCost,
      blueTokensUsed: blueMetrics.totalTokensUsed,
      blueCost: blueMetrics.totalCost,
    };

    return {
      config,
      metrics,
      trace,
    };
  }

  private static createInitialWorldObservation(config: MatchConfig, player: string): WorldObservation {
    const baseId = Math.abs(config.mapSeed * 1664525 + 1013904223) >>> 0;
    const playerId = player === 'red' ? baseId : baseId ^ 0xdeadbeef;

    return {
      tick: 0,
      timestamp: Date.now(),
      missionId: `match-${config.mapSeed}`,
      agent: {
        playerId,
        position: player === 'red' ? { x: 0, y: 0 } : { x: 99, y: 99 },
        health: 100,
        resources: 50,
      },
      units: [],
      resources: [
        { type: 'minerals', amount: 50 + (config.mapSeed % 50) },
        { type: 'vespene', amount: 25 + (config.mapSeed % 25) },
      ],
      structures: [],
      visibility: { visibleEnemyCount: 0, visibleResourceCount: 2 },
    };
  }

  private static getAvailableGoals(state: WorldObservation) {
    return [
      {
        id: 'gather-resources',
        intent: 'Gather resources to build units',
        priority: 'high',
        feasibility: 0.8,
        expectedDuration: 5,
        estimatedValue: 50,
      },
      {
        id: 'defend-position',
        intent: 'Defend current position',
        priority: 'medium',
        feasibility: 0.9,
        expectedDuration: 3,
        estimatedValue: 30,
      },
      {
        id: 'scout-map',
        intent: 'Scout unexplored areas',
        priority: 'medium',
        feasibility: 0.7,
        expectedDuration: 4,
        estimatedValue: 20,
      },
    ];
  }

  private static getAvailableCommands(state: WorldObservation) {
    return [
      {
        id: 'move-north',
        action: 'move',
        target: { x: 0, y: -1 },
        expectedDuration: 1,
        expectedCost: 1,
        description: 'Move unit north',
      },
      {
        id: 'move-south',
        action: 'move',
        target: { x: 0, y: 1 },
        expectedDuration: 1,
        expectedCost: 1,
        description: 'Move unit south',
      },
      {
        id: 'gather',
        action: 'gather',
        target: { x: 0, y: 0 },
        expectedDuration: 3,
        expectedCost: 0,
        description: 'Gather nearby resources',
      },
    ];
  }

  private static applyEffects(state: WorldObservation, commands: ReadonlyArray<string>): WorldObservation {
    let newState = { ...state };
    for (const cmd of commands) {
      if (cmd.includes('move')) {
        // Simplified movement
        const sign = cmd.includes('north') ? -1 : cmd.includes('south') ? 1 : 0;
        newState = {
          ...newState,
          agent: {
            ...newState.agent,
            position: {
              x: newState.agent.position.x,
              y: Math.max(0, Math.min(99, newState.agent.position.y + sign)),
            },
          },
        };
      } else if (cmd.includes('gather')) {
        newState = {
          ...newState,
          agent: {
            ...newState.agent,
            resources: newState.agent.resources + 5,
          },
        };
      }
    }
    return newState;
  }

  private static determineWinner(redState: WorldObservation, blueState: WorldObservation): 'red' | 'blue' | 'draw' {
    const redScore = redState.agent.resources;
    const blueScore = blueState.agent.resources;

    if (redScore > blueScore) return 'red';
    if (blueScore > redScore) return 'blue';
    return 'draw';
  }
}
