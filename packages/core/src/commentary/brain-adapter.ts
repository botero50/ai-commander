import { WorldState, Command, createCommand, createActionId, createTick } from '@ai-commander/domain';

// Type-safe Brain interface imports (loaded dynamically to avoid rootDir issues)
interface WorldObservation {
  readonly tick: number;
  readonly timestamp: number;
  readonly missionId: string;
  readonly agentId: string;
  readonly agentName: string;
  readonly agentPosition: { readonly x: number; readonly y: number };
  readonly agentHealth: number;
  readonly friendlyUnits: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly type: string;
    readonly position: { readonly x: number; readonly y: number };
    readonly health: number;
  }>;
  readonly enemyUnits: ReadonlyArray<{
    readonly id: string;
    readonly type: string;
    readonly position: { readonly x: number; readonly y: number };
    readonly health: number;
    readonly threat: number;
  }>;
  readonly resources: ReadonlyArray<{
    readonly type: string;
    readonly amount: number;
  }>;
  readonly structures: ReadonlyArray<{
    readonly id: string;
    readonly type: string;
    readonly position: { readonly x: number; readonly y: number };
    readonly health: number;
    readonly owner: 'friendly' | 'enemy';
  }>;
  readonly visibility: {
    readonly explored: number;
    readonly visible: number;
    readonly totalMap: number;
    readonly visibleEnemyCount: number;
    readonly visibleResourceCount: number;
  };
}

interface GoalOption {
  readonly id: string;
  readonly intent: string;
  readonly priority: 'high' | 'medium' | 'low';
  readonly feasibility: number;
  readonly expectedDuration: number;
  readonly estimatedValue: number;
}

interface CommandOption {
  readonly id: string;
  readonly action: string;
  readonly target?: { readonly x: number; readonly y: number } | string;
  readonly expectedDuration: number;
  readonly expectedCost: number;
  readonly description: string;
}

interface ExecutionMemory {
  readonly recentEvents: ReadonlyArray<{
    readonly tick: number;
    readonly type: string;
    readonly detail: string;
  }>;
  readonly recentDecisions: ReadonlyArray<{
    readonly tick: number;
    readonly goal: string;
    readonly commands: string[];
    readonly outcome: string;
  }>;
  readonly metrics: {
    readonly commandsExecuted: number;
    readonly commandsFailed: number;
    readonly goalsCompleted: number;
    readonly goalsAbandoned: number;
  };
}

interface BrainDecision {
  readonly reasoning: string;
  readonly selectedGoal: string;
  readonly plan: readonly string[];
  readonly commands: readonly string[];
  readonly confidence: number;
}

/**
 * Converts framework WorldState to Brain SDK WorldObservation.
 * Adapts domain model to Brain's expected observation format while maintaining immutability.
 */
export class BrainAdapter {
  static worldStateToObservation(worldState: WorldState, missionId: string, agentId: string): WorldObservation {
    const primaryAgent = worldState.agents[0];
    const agentIdStr = primaryAgent?.agentId ? String(primaryAgent.agentId) : agentId;

    return {
      tick: worldState.time.currentTick.number,
      timestamp: Date.now(),
      missionId,
      agentId,
      agentName: `Agent-${agentId}`,
      agentPosition: (primaryAgent?.customData as any)?.position ?? { x: 0, y: 0 },
      agentHealth: (primaryAgent?.customData as any)?.health ?? 100,
      friendlyUnits: worldState.agents
        .filter((a) => (a.customData as any)?.owner === 'friendly')
        .map((a) => ({
          id: String(a.agentId),
          name: (a.customData as any)?.name ?? String(a.agentId),
          type: (a.customData as any)?.type ?? 'unit',
          position: (a.customData as any)?.position ?? { x: 0, y: 0 },
          health: (a.customData as any)?.health ?? 100,
        })),
      enemyUnits: worldState.agents
        .filter((a) => (a.customData as any)?.owner === 'enemy')
        .map((a) => ({
          id: String(a.agentId),
          type: (a.customData as any)?.type ?? 'unit',
          position: (a.customData as any)?.position ?? { x: 0, y: 0 },
          health: (a.customData as any)?.health ?? 100,
          threat: (a.customData as any)?.threat ?? 0,
        })),
      resources: (worldState.customData as any)?.resources ?? [],
      structures: worldState.agents
        .filter((a) => (a.customData as any)?.type === 'building')
        .map((a) => ({
          id: String(a.agentId),
          type: (a.customData as any)?.subType ?? 'structure',
          position: (a.customData as any)?.position ?? { x: 0, y: 0 },
          health: (a.customData as any)?.health ?? 100,
          owner: (a.customData as any)?.owner ?? 'friendly',
        })),
      visibility: {
        explored: (worldState.customData as any)?.visibility?.explored ?? 0,
        visible: (worldState.customData as any)?.visibility?.visible ?? 0,
        totalMap: (worldState.map?.width ?? 256) * (worldState.map?.height ?? 256),
        visibleEnemyCount: worldState.agents.filter((a) => (a.customData as any)?.owner === 'enemy').length,
        visibleResourceCount: (worldState.customData as any)?.resources?.length ?? 0,
      },
    };
  }

  /**
   * Returns default goal options for the current state.
   * Framework-provided, no provider-specific logic.
   */
  static getDefaultGoals(): readonly GoalOption[] {
    return [
      {
        id: 'goal-attack',
        intent: 'Destroy enemy units and structures',
        priority: 'high',
        feasibility: 0.8,
        expectedDuration: 60000,
        estimatedValue: 100,
      },
      {
        id: 'goal-defend',
        intent: 'Protect friendly units and structures',
        priority: 'high',
        feasibility: 0.9,
        expectedDuration: 30000,
        estimatedValue: 80,
      },
      {
        id: 'goal-gather',
        intent: 'Collect resources from the map',
        priority: 'medium',
        feasibility: 0.7,
        expectedDuration: 45000,
        estimatedValue: 60,
      },
    ];
  }

  /**
   * Returns default command options for the current state.
   * Framework-provided, no provider-specific logic.
   */
  static getDefaultCommands(): readonly CommandOption[] {
    return [
      {
        id: 'cmd-move',
        action: 'move',
        expectedDuration: 5000,
        expectedCost: 0,
        description: 'Move units to target location',
      },
      {
        id: 'cmd-attack',
        action: 'attack',
        expectedDuration: 8000,
        expectedCost: 0,
        description: 'Attack enemy units',
      },
      {
        id: 'cmd-gather',
        action: 'gather',
        expectedDuration: 10000,
        expectedCost: 0,
        description: 'Gather resources',
      },
    ];
  }

  /**
   * Returns execution memory for context.
   * Minimal initial state, expanded in future stories.
   */
  static getExecutionMemory(): ExecutionMemory {
    return {
      recentEvents: [],
      recentDecisions: [],
      metrics: {
        commandsExecuted: 0,
        commandsFailed: 0,
        goalsCompleted: 0,
        goalsAbandoned: 0,
      },
    };
  }

  /**
   * Converts Brain decision to framework Commands.
   * Maintains type safety and immutability of framework Command objects.
   */
  static brainDecisionToCommands(
    decision: BrainDecision,
    agentId: string,
    tick: number
  ): Command[] {
    const maxPriority = Math.min(100, Math.max(0, Math.floor(decision.confidence * 100)));
    return decision.commands.map((cmdStr, index) =>
      createCommand(
        createActionId(`brain-cmd-${tick}-${index}`),
        agentId as any,
        cmdStr.split(':')[0] || 'move',
        {
          description: cmdStr,
          reasoning: decision.reasoning,
          confidence: decision.confidence,
        },
        createTick(tick),
        maxPriority
      )
    );
  }
}
