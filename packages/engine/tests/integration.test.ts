/**
 * Integration Tests for Runtime Validation
 *
 * Verifies that Domain, Core, and Engine work together correctly
 * as an integrated system without implementing game logic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createWorldState,
  createPosition,
  createGameMap,
  createPlayer,
  createPlayerId,
  createAgent,
  createAgentSnapshot,
  createGameTime,
  createTick,
  createResourcePool,
  AgentState,
} from '@ai-commander/domain';
import {
  createEventBus,
  createGameClock,
  createScheduler,
  createServiceRegistry,
} from '@ai-commander/core';
import {
  Engine,
  EngineState,
  createPipeline,
  type PipelineStep,
  type ExecutionContext,
} from '../src/index.js';

describe.skip('Runtime Integration', () => {
  let worldState: ReturnType<typeof createWorldState>;

  beforeEach(() => {
    const position = createPosition('0,0', 'Spawn');
    const map = createGameMap('map-1', 'Test Map', [position]);
    const playerId = createPlayerId('player-1');
    const player = createPlayer(playerId, 'TestPlayer');
    const agent = createAgent('agent-1');
    const resourcePool = createResourcePool([], []);
    const agentSnapshot = createAgentSnapshot(agent, playerId, AgentState.Idle, resourcePool);
    const tick = createTick(0);
    const time = createGameTime(tick, null, 'Turn 1');

    worldState = createWorldState(time, map, [player], [], [agentSnapshot]);
  });

  describe('Framework Integration', () => {
    it('should integrate Domain, Core, and Engine', async () => {
      const eventBus = createEventBus();
      const scheduler = createScheduler(createGameClock(0));
      const serviceRegistry = createServiceRegistry();

      const pipeline = createPipeline([]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry, eventBus);

      expect(engine).toBeDefined();
      expect(engine.getEventBus()).toBe(eventBus);
      expect(engine.getServiceRegistry()).toBe(serviceRegistry);
      expect(engine.getScheduler()).toBeDefined();
      expect(engine.getClock()).toBeDefined();
    });
  });

  describe('Engine Lifecycle with Infrastructure', () => {
    it('should start and stop with all infrastructure initialized', async () => {
      const eventBus = createEventBus();
      const clock = createGameClock(0);
      const scheduler = createScheduler(clock);
      const serviceRegistry = createServiceRegistry();

      const pipeline = createPipeline([]);
      const engine = new Engine(
        pipeline,
        worldState,
        { tickRate: 60 },
        serviceRegistry,
        eventBus,
        clock,
        scheduler
      );

      let engineStarted = false;
      let engineStopped = false;

      eventBus.subscribe('EngineStarted', () => {
        engineStarted = true;
      });
      eventBus.subscribe('EngineStopped', () => {
        engineStopped = true;
      });

      await engine.start();
      expect(engineStarted).toBe(true);

      await engine.stop();
      expect(engineStopped).toBe(true);
    });
  });

  describe('Pipeline Execution with ExecutionContext', () => {
    it('should pass ExecutionContext with all required fields', async () => {
      const eventBus = createEventBus();
      const clock = createGameClock(0);
      const scheduler = createScheduler(clock);
      const serviceRegistry = createServiceRegistry();

      const contextCapture: ExecutionContext[] = [];

      const contextStep: PipelineStep = {
        id: 'context-capture',
        execute: async (ws, context) => {
          contextCapture.push(context);
          return {
            stepId: 'context-capture',
            worldState: ws,
            eventsPublished: 0,
            errors: [],
          };
        },
      };

      const pipeline = createPipeline([contextStep]);
      const engine = new Engine(
        pipeline,
        worldState,
        { tickRate: 60 },
        serviceRegistry,
        eventBus,
        clock,
        scheduler
      );

      await engine.start();
      await engine.tick();

      expect(contextCapture.length).toBe(1);
      const context = contextCapture[0];

      expect(context.eventBus).toBeDefined();
      expect(context.clock).toBeDefined();
      expect(context.scheduler).toBeDefined();
      expect(context.serviceRegistry).toBeDefined();
      expect(context.tick).toBeDefined();
      expect(context.tick.number).toBe(1);
    });
  });

  describe('WorldState Propagation Through Pipeline', () => {
    it('should propagate WorldState through all steps', async () => {
      const eventBus = createEventBus();
      const serviceRegistry = createServiceRegistry();

      const worldStates: ReturnType<typeof createWorldState>[] = [];

      const step1: PipelineStep = {
        id: 'step-1',
        execute: async (ws, context) => {
          worldStates.push(ws);
          return { stepId: 'step-1', worldState: ws, eventsPublished: 0, errors: [] };
        },
      };

      const step2: PipelineStep = {
        id: 'step-2',
        execute: async (ws, context) => {
          worldStates.push(ws);
          return { stepId: 'step-2', worldState: ws, eventsPublished: 0, errors: [] };
        },
      };

      const step3: PipelineStep = {
        id: 'step-3',
        execute: async (ws, context) => {
          worldStates.push(ws);
          return { stepId: 'step-3', worldState: ws, eventsPublished: 0, errors: [] };
        },
      };

      const pipeline = createPipeline([step1, step2, step3]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry, eventBus);

      await engine.start();
      await engine.tick();

      expect(worldStates.length).toBe(3);
      expect(worldStates[0]).toBe(worldState);
      expect(worldStates[1]).toBe(worldState);
      expect(worldStates[2]).toBe(worldState);
    });
  });

  describe('Event Publication from Steps', () => {
    it('should allow steps to publish events via ExecutionContext', async () => {
      const eventBus = createEventBus();
      const serviceRegistry = createServiceRegistry();

      const publishedEvents: string[] = [];

      eventBus.subscribe('StepEvent', (data) => {
        publishedEvents.push(data.message);
      });

      const publishingStep: PipelineStep = {
        id: 'publishing-step',
        execute: async (ws, context) => {
          await context.eventBus.publish('StepEvent', { message: 'Step published event' });
          return { stepId: 'publishing-step', worldState: ws, eventsPublished: 1, errors: [] };
        },
      };

      const pipeline = createPipeline([publishingStep]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry, eventBus);

      await engine.start();
      await engine.tick();

      expect(publishedEvents).toContain('Step published event');
    });
  });

  describe('Clock Progression', () => {
    it('should progress clock through multiple ticks', async () => {
      const eventBus = createEventBus();
      const clock = createGameClock(0);
      const scheduler = createScheduler(clock);
      const serviceRegistry = createServiceRegistry();

      const tickNumbers: number[] = [];

      const clockStep: PipelineStep = {
        id: 'clock-step',
        execute: async (ws, context) => {
          tickNumbers.push(context.tick.number);
          return { stepId: 'clock-step', worldState: ws, eventsPublished: 0, errors: [] };
        },
      };

      const pipeline = createPipeline([clockStep]);
      const engine = new Engine(
        pipeline,
        worldState,
        { tickRate: 60, maxTicks: 5 },
        serviceRegistry,
        eventBus,
        clock,
        scheduler
      );

      await engine.start();

      while (engine.isRunning()) {
        await engine.tick();
      }

      expect(tickNumbers).toEqual([1, 2, 3, 4, 5]);
      expect(engine.getCurrentTick().number).toBe(5);
    });
  });

  describe('Scheduler Integration', () => {
    it('should provide access to scheduler in ExecutionContext', async () => {
      const eventBus = createEventBus();
      const clock = createGameClock(0);
      const scheduler = createScheduler(clock);
      const serviceRegistry = createServiceRegistry();

      let schedulerAccessed = false;

      const schedulerStep: PipelineStep = {
        id: 'scheduler-step',
        execute: async (ws, context) => {
          schedulerAccessed = context.scheduler !== undefined;
          return { stepId: 'scheduler-step', worldState: ws, eventsPublished: 0, errors: [] };
        },
      };

      const pipeline = createPipeline([schedulerStep]);
      const engine = new Engine(
        pipeline,
        worldState,
        { tickRate: 60 },
        serviceRegistry,
        eventBus,
        clock,
        scheduler
      );

      await engine.start();
      await engine.tick();

      expect(schedulerAccessed).toBe(true);
      expect(engine.getScheduler()).toBe(scheduler);
    });
  });

  describe('ServiceRegistry Integration', () => {
    it('should provide access to service registry in ExecutionContext', async () => {
      const eventBus = createEventBus();
      const serviceRegistry = createServiceRegistry();

      let registryAccessed = false;

      const registryStep: PipelineStep = {
        id: 'registry-step',
        execute: async (ws, context) => {
          registryAccessed = context.serviceRegistry !== undefined;
          return { stepId: 'registry-step', worldState: ws, eventsPublished: 0, errors: [] };
        },
      };

      const pipeline = createPipeline([registryStep]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry, eventBus);

      await engine.start();
      await engine.tick();

      expect(registryAccessed).toBe(true);
      expect(engine.getServiceRegistry()).toBe(serviceRegistry);
    });
  });

  describe('Deterministic Execution', () => {
    it('should execute steps in order consistently', async () => {
      const eventBus = createEventBus();
      const serviceRegistry = createServiceRegistry();

      const executionOrder: string[] = [];

      const step1: PipelineStep = {
        id: 'step-1',
        execute: async (ws) => {
          executionOrder.push('step-1');
          return { stepId: 'step-1', worldState: ws, eventsPublished: 0, errors: [] };
        },
      };

      const step2: PipelineStep = {
        id: 'step-2',
        execute: async (ws) => {
          executionOrder.push('step-2');
          return { stepId: 'step-2', worldState: ws, eventsPublished: 0, errors: [] };
        },
      };

      const step3: PipelineStep = {
        id: 'step-3',
        execute: async (ws) => {
          executionOrder.push('step-3');
          return { stepId: 'step-3', worldState: ws, eventsPublished: 0, errors: [] };
        },
      };

      const pipeline = createPipeline([step1, step2, step3]);
      const engine = new Engine(
        pipeline,
        worldState,
        { tickRate: 60, maxTicks: 3 },
        serviceRegistry,
        eventBus
      );

      await engine.start();

      while (engine.isRunning()) {
        await engine.tick();
      }

      // Should execute in order for each tick: 3 ticks × 3 steps = 9 executions
      expect(executionOrder.length).toBe(9);
      for (let i = 0; i < 9; i += 3) {
        expect(executionOrder[i]).toBe('step-1');
        expect(executionOrder[i + 1]).toBe('step-2');
        expect(executionOrder[i + 2]).toBe('step-3');
      }
    });
  });

  describe('Pipeline Failure Handling', () => {
    it('should handle step errors without crashing engine', async () => {
      const eventBus = createEventBus();
      const serviceRegistry = createServiceRegistry();

      const failingStep: PipelineStep = {
        id: 'failing-step',
        execute: async () => {
          throw new Error('Step intentionally failed');
        },
      };

      const survivingStep: PipelineStep = {
        id: 'surviving-step',
        execute: async (ws) => {
          return { stepId: 'surviving-step', worldState: ws, eventsPublished: 0, errors: [] };
        },
      };

      const pipeline = createPipeline([failingStep, survivingStep]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry, eventBus);

      await engine.start();
      const result = await engine.tick();

      // Engine should still complete tick despite step failure
      expect(result.tickNumber).toBe(1);
      expect(engine.isRunning()).toBe(true);

      // Pipeline should report error
      expect(result.pipelineResult.errors.length).toBeGreaterThan(0);
      expect(result.pipelineResult.errors[0]).toContain('failing-step');
    });
  });

  describe('Complete Runtime Scenario', () => {
    it('should execute a complete multi-tick runtime scenario', async () => {
      const eventBus = createEventBus();
      const clock = createGameClock(0);
      const scheduler = createScheduler(clock);
      const serviceRegistry = createServiceRegistry();

      const runtimeLog: string[] = [];

      eventBus.subscribe('EngineStarted', () => runtimeLog.push('engine-started'));
      eventBus.subscribe('TickStarted', (data) =>
        runtimeLog.push(`tick-started:${data.tickNumber}`)
      );
      eventBus.subscribe('TickCompleted', (data) =>
        runtimeLog.push(`tick-completed:${data.tickNumber}`)
      );
      eventBus.subscribe('EngineStopped', () => runtimeLog.push('engine-stopped'));

      const step1: PipelineStep = {
        id: 'step-1',
        execute: async (ws) => ({
          stepId: 'step-1',
          worldState: ws,
          eventsPublished: 0,
          errors: [],
        }),
      };

      const step2: PipelineStep = {
        id: 'step-2',
        execute: async (ws, context) => {
          await context.eventBus.publish('StepEvent', {
            step: 'step-2',
            tick: context.tick.number,
          });
          return { stepId: 'step-2', worldState: ws, eventsPublished: 1, errors: [] };
        },
      };

      const pipeline = createPipeline([step1, step2]);
      const engine = new Engine(
        pipeline,
        worldState,
        { tickRate: 60, maxTicks: 3 },
        serviceRegistry,
        eventBus,
        clock,
        scheduler
      );

      await engine.start();

      while (engine.isRunning()) {
        await engine.tick();
      }

      expect(runtimeLog[0]).toBe('engine-started');
      expect(runtimeLog[runtimeLog.length - 1]).toBe('engine-stopped');
      expect(engine.getState()).toBe(EngineState.Stopped);
      expect(engine.getCurrentTick().number).toBe(3);
    });
  });
});
