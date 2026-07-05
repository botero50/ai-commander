export interface StrategicPhase {
  readonly phaseNumber: number;
  readonly name: string;
  readonly targetTick: number;
  readonly objectives: readonly string[];
}

export interface LongTermPlan {
  readonly planId: string;
  readonly strategy: string;
  readonly phases: readonly StrategicPhase[];
  readonly estimatedDuration: number;
}

export class LongTermPlanner {
  createEconomicPlan(): LongTermPlan {
    return {
      planId: `plan_econ_${Date.now()}`,
      strategy: 'Economic',
      phases: [
        {
          phaseNumber: 1,
          name: 'Bootstrap',
          targetTick: 300,
          objectives: ['gather_initial_resources', 'build_workers'],
        },
        {
          phaseNumber: 2,
          name: 'Expansion',
          targetTick: 600,
          objectives: ['expand_territory', 'build_refineries'],
        },
        {
          phaseNumber: 3,
          name: 'Consolidation',
          targetTick: 1000,
          objectives: ['build_reserve_army', 'secure_territory'],
        },
      ],
      estimatedDuration: 1000,
    };
  }

  createAggressivePlan(): LongTermPlan {
    return {
      planId: `plan_agg_${Date.now()}`,
      strategy: 'Aggressive',
      phases: [
        {
          phaseNumber: 1,
          name: 'Rush',
          targetTick: 200,
          objectives: ['build_army', 'first_attack'],
        },
        {
          phaseNumber: 2,
          name: 'Pressure',
          targetTick: 500,
          objectives: ['continuous_attacks', 'weaken_opponent'],
        },
        {
          phaseNumber: 3,
          name: 'Finish',
          targetTick: 800,
          objectives: ['final_assault', 'victory'],
        },
      ],
      estimatedDuration: 800,
    };
  }

  getCurrentPhase(plan: LongTermPlan, tick: number): StrategicPhase | undefined {
    return plan.phases.find(p => tick < p.targetTick);
  }

  getProgress(plan: LongTermPlan, tick: number): number {
    return Math.min(1, tick / plan.estimatedDuration);
  }

  isPhaseComplete(phase: StrategicPhase, tick: number): boolean {
    return tick >= phase.targetTick;
  }

  adaptPlan(plan: LongTermPlan, adjustedDuration: number): LongTermPlan {
    const scaleFactor = adjustedDuration / plan.estimatedDuration;
    const newPhases = plan.phases.map(p => ({
      ...p,
      targetTick: Math.floor(p.targetTick * scaleFactor),
    }));

    return {
      ...plan,
      phases: newPhases,
      estimatedDuration: adjustedDuration,
    };
  }
}
