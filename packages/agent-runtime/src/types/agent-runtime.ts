import type { Agent, WorldState } from '@ai-commander/domain';
import type { Goal } from '@ai-commander/goals';
import type { Plan } from '@ai-commander/planner';
import type { GameSession } from '@ai-commander/adapter';
import type { Planner } from '@ai-commander/planner';
import type { DecisionEngine } from '@ai-commander/decision';
import type { ExecutionContext } from '@ai-commander/engine';
import type { AgentStatus } from './agent-status.js';
import type { AgentMetrics } from './agent-metrics.js';

export interface AgentConfiguration {
  readonly agentId: Agent;
  readonly goal: Goal;
  readonly gameSession: GameSession;
  readonly planner: Planner;
  readonly decisionEngine: DecisionEngine;
  readonly executionContext: ExecutionContext;
}

export interface AgentRuntimeState {
  readonly agentId: Agent;
  readonly status: AgentStatus;
  readonly metrics: AgentMetrics;
  readonly currentPlan?: Plan;
  readonly currentGoal: Goal;
  readonly lastWorldState?: WorldState;
}

export interface AgentRuntime {
  readonly agentId: Agent;
  readonly status: AgentStatus;
  readonly metrics: AgentMetrics;

  initialize(): Promise<void>;
  tick(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  shutdown(): Promise<void>;

  getStatus(): AgentStatus;
  getMetrics(): AgentMetrics;
  getRuntimeState(): AgentRuntimeState;
}
