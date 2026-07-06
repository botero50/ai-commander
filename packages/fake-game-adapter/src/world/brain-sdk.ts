/**
 * Brain SDK - Standard interface for autonomous decision makers
 *
 * A Brain receives complete world observation and returns reasoned decisions.
 * All brains use identical input/output contract regardless of provider.
 */

import type { FakeWorldSnapshot } from './fake-world-state.js';

export type CommandType = 'move' | 'gather' | 'deposit' | 'produce' | 'train' | 'scout' | 'attack';

export interface Command {
  readonly type: CommandType;
  readonly unitId?: string;
  readonly targetX?: number;
  readonly targetY?: number;
  readonly unitType?: 'worker' | 'infantry' | 'ranged' | 'tank';
}

export interface Goal {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly priority: number; // 0-100, higher = more urgent
  readonly deadline?: number; // tick by which goal should be complete
  readonly reward: number; // points if achieved
}

export interface AvailableAction {
  readonly action: string;
  readonly description: string;
  readonly precondition: string; // e.g., "has-resources", "has-workers"
  readonly cost?: number; // resource cost
  readonly estimatedDuration: number; // ticks
}

export interface BrainMemory {
  readonly lastObservation?: FakeWorldSnapshot;
  readonly previousDecisions: ReadonlyArray<{
    goal: string;
    commands: ReadonlyArray<Command>;
    tick: number;
    outcome: string;
  }>;
  readonly knownStrategies: ReadonlyArray<{
    name: string;
    successRate: number;
    lastUsed: number;
  }>;
  readonly opponentModels: ReadonlyMap<string, {
    strategy: string;
    strength: number;
  }>;
}

export interface BrainInput {
  readonly world: FakeWorldSnapshot;
  readonly availableGoals: ReadonlyArray<Goal>;
  readonly availableActions: ReadonlyArray<AvailableAction>;
  readonly memory: BrainMemory;
  readonly executionHistory: ReadonlyArray<{
    tick: number;
    commandsIssued: number;
    successRate: number;
  }>;
}

export interface BrainReasoning {
  readonly thought: string;
  readonly analysis: string;
  readonly riskAssessment: string;
  readonly confidence: number; // 0-100
}

export interface BrainPlan {
  readonly immediateGoal: string;
  readonly steps: ReadonlyArray<string>;
  readonly alternativePlans: ReadonlyArray<string>;
  readonly estimatedDuration: number; // ticks
}

export interface BrainOutput {
  readonly reasoning: BrainReasoning;
  readonly selectedGoal: string;
  readonly plan: BrainPlan;
  readonly commands: ReadonlyArray<Command>;
  readonly metadata: {
    readonly thinkingTimeMs: number;
    readonly modelUsed: string;
    readonly tokensUsed?: number;
    readonly confidence: number;
  };
}

/**
 * Brain interface - all decision makers must implement this
 */
export interface Brain {
  readonly name: string;
  readonly version: string;

  /**
   * Make a decision given world state and available options
   */
  decide(input: BrainInput): Promise<BrainOutput>;

  /**
   * Update memory with match outcome
   */
  updateMemory(observation: FakeWorldSnapshot, executed: ReadonlyArray<Command>, succeeded: boolean): void;

  /**
   * Reset brain state (e.g., between matches)
   */
  reset(): void;
}

/**
 * Built-in Brain using AI Commander's existing planner
 * This brain uses the existing strategic intelligence and decision-making systems
 */
export class BuiltinBrain implements Brain {
  readonly name = 'builtin-ai-commander';
  readonly version = '1.0';
  private memory: BrainMemory = {
    previousDecisions: Object.freeze([]),
    knownStrategies: Object.freeze([]),
    opponentModels: new Map(),
  };

  async decide(input: BrainInput): Promise<BrainOutput> {
    const startTime = performance.now();
    const world = input.world;

    // Analyze current situation
    const thought = this.analyzeSituation(world);
    const analysis = this.analyzeResources(world);
    const riskAssessment = this.assessRisk(world);

    // Determine primary goal
    const selectedGoal = this.selectGoal(input.availableGoals, world);

    // Create plan
    const plan = this.createPlan(selectedGoal, world, input.availableActions);

    // Generate commands
    const commands = this.generateCommands(selectedGoal, world);

    const thinkingTime = performance.now() - startTime;
    const confidence = Math.min(
      100,
      75 + (world.workers.length > 0 ? 10 : 0) + (world.militaryUnits.length > 0 ? 10 : 0)
    );

    return {
      reasoning: {
        thought,
        analysis,
        riskAssessment,
        confidence,
      },
      selectedGoal,
      plan,
      commands,
      metadata: {
        thinkingTimeMs: thinkingTime,
        modelUsed: this.name,
        confidence,
      },
    };
  }

  updateMemory(observation: FakeWorldSnapshot, executed: ReadonlyArray<Command>, succeeded: boolean): void {
    this.memory = {
      ...this.memory,
      lastObservation: observation,
    };
  }

  reset(): void {
    this.memory = {
      previousDecisions: Object.freeze([]),
      knownStrategies: Object.freeze([]),
      opponentModels: new Map(),
    };
  }

  private analyzeSituation(world: FakeWorldSnapshot): string {
    if (world.knownEnemies.length > 0) {
      return `Enemy contact detected: ${world.knownEnemies.length} known enemies. Strategic priority: defense.`;
    }
    if (world.playerResources < 50) {
      return `Resource scarcity detected. Strategic priority: gather resources.`;
    }
    if (world.workers.length < 3) {
      return `Workforce understaffed. Strategic priority: produce workers.`;
    }
    return 'Situation stable. Opportunity for expansion.';
  }

  private analyzeResources(world: FakeWorldSnapshot): string {
    const resourceRate = world.workers.length * 10; // each worker gathers 10/tick
    const militaryStrength = world.militaryUnits.length;
    const timeToFirstWorker = world.playerResources < 50 ? Math.ceil((50 - world.playerResources) / resourceRate) : 0;

    return `Resources: ${world.playerResources} available, ${resourceRate} per tick rate. ` +
           `Workforce: ${world.workers.length} workers. ` +
           `Military: ${militaryStrength} units. ` +
           (timeToFirstWorker > 0 ? `Time to next worker: ~${timeToFirstWorker} ticks.` : '');
  }

  private assessRisk(world: FakeWorldSnapshot): string {
    if (world.knownEnemies.length >= 5) {
      return 'CRITICAL: Severe enemy threat. Recommend immediate military response.';
    }
    if (world.knownEnemies.length >= 2) {
      return 'HIGH: Enemy presence. Maintain defensive posture.';
    }
    if (world.workers.length === 0) {
      return 'CRITICAL: No workers. Economic collapse imminent.';
    }
    if (world.playerResources < 30 && world.workers.length < 2) {
      return 'HIGH: Economic stress. Limited recovery options.';
    }
    return 'STABLE: No immediate threats.';
  }

  private selectGoal(goals: ReadonlyArray<Goal>, world: FakeWorldSnapshot): string {
    if (world.knownEnemies.length > 0) {
      const defenseGoal = goals.find((g) => g.name.includes('defense'));
      if (defenseGoal) return defenseGoal.id;
    }

    if (world.playerResources < 50) {
      const gatherGoal = goals.find((g) => g.name.includes('gather'));
      if (gatherGoal) return gatherGoal.id;
    }

    // Return highest priority goal
    return goals.reduce((best, current) => (current.priority > best.priority ? current : best), goals[0])?.id || 'default';
  }

  private createPlan(goal: string, world: FakeWorldSnapshot, actions: ReadonlyArray<AvailableAction>): BrainPlan {
    const steps: string[] = [];

    if (goal.includes('gather') || goal === 'gather') {
      steps.push('Move workers to resource deposit');
      steps.push('Gather resources from deposits');
      steps.push('Return to base with resources');
      steps.push('Deposit resources at base');
    } else if (goal.includes('produce') || goal === 'produce') {
      steps.push('Accumulate 50 resources');
      steps.push('Train new worker at base');
    } else if (goal.includes('military') || goal === 'military') {
      steps.push('Accumulate 100 resources');
      steps.push('Train military unit');
      steps.push('Position unit defensively');
    } else if (goal.includes('defense')) {
      steps.push('Position military units defensively');
      steps.push('Scout for enemy movements');
      steps.push('Prepare counterattack');
    } else {
      steps.push('Continue current operations');
      steps.push('Scan for opportunities');
    }

    return {
      immediateGoal: goal,
      steps: Object.freeze(steps),
      alternativePlans: Object.freeze(['Defensive hold', 'Economic focus', 'Scout expansion']),
      estimatedDuration: steps.length * 50, // rough estimate
    };
  }

  private generateCommands(goal: string, world: FakeWorldSnapshot): ReadonlyArray<Command> {
    const commands: Command[] = [];

    // Always move idle workers to resources
    for (const worker of world.workers) {
      if (!worker.busy && world.playerResources < 100) {
        // Move to nearest resource
        const targetX = worker.x < 20 ? 20 : 30;
        const targetY = worker.y < 20 ? 20 : 30;
        const dx = Math.sign(targetX - worker.x);
        const dy = Math.sign(targetY - worker.y);

        if (dx !== 0 || dy !== 0) {
          commands.push({
            type: 'move',
            unitId: `worker-${worker.id}`,
            targetX: worker.x + dx,
            targetY: worker.y + dy,
          });
        }
      }
    }

    // If we have resources, produce worker or military
    if (world.playerResources >= 100 && goal.includes('military')) {
      commands.push({
        type: 'train',
        unitType: 'infantry',
      });
    } else if (world.playerResources >= 50 && world.workers.length < 5) {
      commands.push({
        type: 'produce',
      });
    }

    // Scout if we have military
    if (world.militaryUnits.length > 0 && world.knownEnemies.length === 0) {
      commands.push({
        type: 'scout',
        unitId: `military-0`,
      });
    }

    return Object.freeze(commands);
  }
}

/**
 * Brain registry for managing available brains
 */
export class BrainRegistry {
  private brains = new Map<string, Brain>();

  register(id: string, brain: Brain): void {
    this.brains.set(id, brain);
  }

  get(id: string): Brain | undefined {
    return this.brains.get(id);
  }

  list(): ReadonlyArray<{ id: string; name: string; version: string }> {
    const list: Array<{ id: string; name: string; version: string }> = [];
    for (const [id, brain] of this.brains) {
      list.push({ id, name: brain.name, version: brain.version });
    }
    return Object.freeze(list);
  }

  reset(): void {
    for (const brain of this.brains.values()) {
      brain.reset();
    }
  }
}

/**
 * Global brain registry
 */
export const globalBrainRegistry = new BrainRegistry();

// Register built-in brain
const builtinBrain = new BuiltinBrain();
globalBrainRegistry.register('builtin', builtinBrain);
