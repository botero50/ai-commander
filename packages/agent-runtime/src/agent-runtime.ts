import type { AgentConfiguration, AgentRuntime, AgentRuntimeState } from './types/agent-runtime.js';
import type { AgentMetrics } from './types/agent-metrics.js';
import type { DecisionContext, DecisionPolicy } from '@ai-commander/decision';
import type { PlanningPolicy } from '@ai-commander/planner';
import type { Agent } from '@ai-commander/domain';
import { AgentStatus } from './types/agent-status.js';
import { MetricsCollector } from './agent-metrics.js';

export class DefaultAgentRuntime implements AgentRuntime {
  readonly agentId: Agent;
  private currentStatus: AgentStatus = AgentStatus.Initializing;
  private metricsCollector: MetricsCollector;
  private config: AgentConfiguration;
  private active = false;
  private paused = false;

  constructor(config: AgentConfiguration) {
    this.config = config;
    this.agentId = config.agentId;
    this.metricsCollector = new MetricsCollector();
  }

  get status(): AgentStatus {
    return this.currentStatus;
  }

  get metrics(): AgentMetrics {
    return this.metricsCollector.getMetrics();
  }

  async initialize(): Promise<void> {
    if (this.active) {
      throw new Error('Agent is already initialized');
    }

    this.currentStatus = AgentStatus.Initializing;

    try {
      const session = this.config.gameSession;
      await session.start();

      this.active = true;
      this.paused = false;
      this.currentStatus = AgentStatus.Idle;
    } catch (error) {
      this.currentStatus = AgentStatus.Failed;
      throw error;
    }
  }

  async tick(): Promise<void> {
    if (!this.active) {
      throw new Error('Agent is not active. Call initialize() first');
    }

    if (this.paused) {
      throw new Error('Agent is paused. Call resume() first');
    }

    this.metricsCollector.recordTick();

    try {
      const session = this.config.gameSession;
      const observationProvider = session.observationProvider;

      if (!(await observationProvider.isObservationAvailable())) {
        this.metricsCollector.recordError();
        return;
      }

      const worldState = await observationProvider.getWorldState();

      const planningStartTime = Date.now();
      const planningPolicy: PlanningPolicy = {};
      const planningRequest = {
        goal: this.config.goal,
        worldState,
        policy: planningPolicy,
      };

      const planningResult = await this.config.planner.plan(planningRequest);
      const planningDuration = Date.now() - planningStartTime;
      this.metricsCollector.recordPlanning(planningDuration);

      if (planningResult.errors.length > 0 || !planningResult.plan) {
        this.metricsCollector.recordError();
        this.currentStatus = AgentStatus.Idle;
        return;
      }

      const plan = planningResult.plan;
      this.currentStatus = AgentStatus.Deciding;

      const decisionStartTime = Date.now();
      const decisionPolicy: DecisionPolicy = {};
      const decisionContext: DecisionContext = {
        executionContext: this.config.executionContext,
        policy: decisionPolicy,
      };
      const decisionRequest = {
        agentId: this.config.agentId,
        worldState,
        plan,
        context: decisionContext,
        metadata: {},
      };

      const decisionResult = await this.config.decisionEngine.decide(decisionRequest);
      const decisionDuration = Date.now() - decisionStartTime;
      this.metricsCollector.recordDecision(decisionDuration);

      if (decisionResult.errors.length > 0 || !decisionResult.command) {
        this.metricsCollector.recordError();
        this.currentStatus = AgentStatus.Idle;
        return;
      }

      const command = decisionResult.command;
      this.currentStatus = AgentStatus.Executing;

      const commandExecutor = session.commandExecutor;

      if (!(await commandExecutor.isExecutionAvailable())) {
        this.metricsCollector.recordError();
        this.currentStatus = AgentStatus.Idle;
        return;
      }

      const executionResult = await commandExecutor.executeCommand(command);
      this.metricsCollector.recordCommandExecution(executionResult.success);

      if (!executionResult.success) {
        this.metricsCollector.recordError();
      }

      this.currentStatus = AgentStatus.Idle;
    } catch (error) {
      this.metricsCollector.recordError();
      this.currentStatus = AgentStatus.Failed;
      throw error;
    }
  }

  async pause(): Promise<void> {
    if (!this.active) {
      throw new Error('Agent is not active');
    }

    if (this.paused) {
      throw new Error('Agent is already paused');
    }

    this.paused = true;
    this.currentStatus = AgentStatus.Paused;
  }

  async resume(): Promise<void> {
    if (!this.active) {
      throw new Error('Agent is not active');
    }

    if (!this.paused) {
      throw new Error('Agent is not paused');
    }

    this.paused = false;
    this.currentStatus = AgentStatus.Idle;
  }

  async shutdown(): Promise<void> {
    if (!this.active) {
      return;
    }

    try {
      await this.config.gameSession.stop();
      this.active = false;
      this.paused = false;
      this.currentStatus = AgentStatus.Stopped;
    } catch (error) {
      this.currentStatus = AgentStatus.Failed;
      throw error;
    }
  }

  getStatus(): AgentStatus {
    return this.currentStatus;
  }

  getMetrics(): AgentMetrics {
    return this.metricsCollector.getMetrics();
  }

  getRuntimeState(): AgentRuntimeState {
    return Object.freeze({
      agentId: this.config.agentId,
      status: this.currentStatus,
      metrics: this.metricsCollector.getMetrics(),
      currentGoal: this.config.goal,
    });
  }
}

export function createAgentRuntime(config: AgentConfiguration): AgentRuntime {
  return new DefaultAgentRuntime(config);
}
