import { describe, it, expect, beforeEach } from 'vitest';
import {
  createWorldState,
  createPosition,
  createGameMap,
  createPlayer,
  createAgent,
  createAgentSnapshot,
  createGameTime,
  createTick,
  createResourcePool,
  AgentState,
} from '@ai-commander/domain';
import {
  createEventBus,
  createServiceRegistry,
  createGameClock,
  createScheduler,
} from '@ai-commander/core';
import {
  Engine,
  EngineState,
  createPipeline,
  type PipelineStep,
  type ExecutionContext,
} from '../src/index.js';

describe.skip('Engine', () => {
  let worldState: ReturnType<typeof createWorldState>;
  let eventBus: ReturnType<typeof createEventBus>;
  let serviceRegistry: ReturnType<typeof createServiceRegistry>;

  beforeEach(() => {
    const position = createPosition('0,0', 'Spawn');
    const map = createGameMap('map-1', 'Test Map', [position]);
    const player = createPlayer('player-1', 'TestPlayer');
    const agent = createAgent('agent-1');
    const resourcePool = createResourcePool([], []);
    const agentSnapshot = createAgentSnapshot(agent, 'player-1', AgentState.Idle, resourcePool);
    const tick = createTick(0);
    const time = createGameTime(tick, null, 'Turn 1');

    worldState = createWorldState(time, map, [player], [], [agentSnapshot]);
    eventBus = createEventBus();
    serviceRegistry = createServiceRegistry();
  });

  describe('Lifecycle', () => {
    it('should create an engine in idle state', () => {
      const pipeline = createPipeline([]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry);

      expect(engine.getState()).toBe(EngineState.Idle);
      expect(engine.isRunning()).toBe(false);
      expect(engine.isPaused()).toBe(false);
    });

    it('should start from idle state', async () => {
      const pipeline = createPipeline([]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry, eventBus);

      let started = false;
      eventBus.subscribe('EngineStarted', () => {
        started = true;
      });

      await engine.start();

      expect(engine.getState()).toBe(EngineState.Running);
      expect(engine.isRunning()).toBe(true);
      expect(started).toBe(true);
    });

    it('should not start from non-idle state', async () => {
      const pipeline = createPipeline([]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry);

      await engine.start();

      await expect(engine.start()).rejects.toThrow();
    });

    it('should pause running engine', async () => {
      const pipeline = createPipeline([]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry);

      await engine.start();
      await engine.pause();

      expect(engine.getState()).toBe(EngineState.Paused);
      expect(engine.isPaused()).toBe(true);
    });

    it('should resume from paused state', async () => {
      const pipeline = createPipeline([]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry);

      await engine.start();
      await engine.pause();
      await engine.resume();

      expect(engine.getState()).toBe(EngineState.Running);
      expect(engine.isRunning()).toBe(true);
    });

    it('should stop engine', async () => {
      const pipeline = createPipeline([]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry, eventBus);

      await engine.start();

      let stopped = false;
      eventBus.subscribe('EngineStopped', () => {
        stopped = true;
      });

      await engine.stop();

      expect(engine.getState()).toBe(EngineState.Stopped);
      expect(stopped).toBe(true);
    });

    it('should handle stop idempotently', async () => {
      const pipeline = createPipeline([]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry);

      await engine.start();
      await engine.stop();
      await engine.stop();

      expect(engine.getState()).toBe(EngineState.Stopped);
    });
  });

  describe('Tick Loop', () => {
    it('should execute a single tick', async () => {
      const pipeline = createPipeline([]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry);

      await engine.start();
      const result = await engine.tick();

      expect(result.tickNumber).toBe(1);
      expect(result.engineState).toBe(EngineState.Running);
      expect(result.maxTicksReached).toBe(false);
    });

    it('should advance tick counter', async () => {
      const pipeline = createPipeline([]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry);

      expect(engine.getCurrentTick().number).toBe(0);

      await engine.start();
      await engine.tick();
      expect(engine.getCurrentTick().number).toBe(1);

      await engine.tick();
      expect(engine.getCurrentTick().number).toBe(2);
    });

    it('should not tick if not running', async () => {
      const pipeline = createPipeline([]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry);

      const result = await engine.tick();

      expect(result.tickNumber).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should not tick if paused', async () => {
      const pipeline = createPipeline([]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry);

      await engine.start();
      const tick1 = await engine.tick();
      expect(tick1.tickNumber).toBe(1);

      await engine.pause();
      const pausedResult = await engine.tick();

      expect(pausedResult.tickNumber).toBe(1);
      expect(pausedResult.engineState).toBe(EngineState.Paused);
    });

    it('should execute multiple ticks', async () => {
      const pipeline = createPipeline([]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry);

      await engine.start();

      for (let i = 0; i < 5; i++) {
        const result = await engine.tick();
        expect(result.tickNumber).toBe(i + 1);
      }

      expect(engine.getCurrentTick().number).toBe(5);
    });

    it('should respect maxTicks config', async () => {
      const pipeline = createPipeline([]);
      const engine = new Engine(
        pipeline,
        worldState,
        { tickRate: 60, maxTicks: 3 },
        serviceRegistry
      );

      await engine.start();

      for (let i = 0; i < 5; i++) {
        await engine.tick();
      }

      expect(engine.getCurrentTick().number).toBe(3);
      expect(engine.getState()).toBe(EngineState.Stopped);
    });

    it('should publish maxTicksReached in result', async () => {
      const pipeline = createPipeline([]);
      const engine = new Engine(
        pipeline,
        worldState,
        { tickRate: 60, maxTicks: 2 },
        serviceRegistry
      );

      await engine.start();

      let result = await engine.tick();
      expect(result.maxTicksReached).toBe(false);

      result = await engine.tick();
      expect(result.maxTicksReached).toBe(true);
    });
  });

  describe('Pipeline Execution', () => {
    it('should execute pipeline steps in order', async () => {
      const execution: string[] = [];

      const step1: PipelineStep = {
        id: 'step-1',
        execute: async (ws) => {
          execution.push('step-1');
          return {
            stepId: 'step-1',
            worldState: ws,
            eventsPublished: 0,
            errors: [],
          };
        },
      };

      const step2: PipelineStep = {
        id: 'step-2',
        execute: async (ws) => {
          execution.push('step-2');
          return {
            stepId: 'step-2',
            worldState: ws,
            eventsPublished: 0,
            errors: [],
          };
        },
      };

      const pipeline = createPipeline([step1, step2]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry);

      await engine.start();
      await engine.tick();

      expect(execution).toEqual(['step-1', 'step-2']);
    });

    it('should publish tick events', async () => {
      const events: string[] = [];

      eventBus.subscribe('TickStarted', () => events.push('TickStarted'));
      eventBus.subscribe('TickCompleted', () => events.push('TickCompleted'));

      const pipeline = createPipeline([]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry, eventBus);

      await engine.start();
      await engine.tick();

      expect(events).toContain('TickStarted');
      expect(events).toContain('TickCompleted');
    });

    it('should aggregate pipeline results', async () => {
      const step1: PipelineStep = {
        id: 'step-1',
        execute: async (ws) => ({
          stepId: 'step-1',
          worldState: ws,
          eventsPublished: 2,
          errors: [],
        }),
      };

      const step2: PipelineStep = {
        id: 'step-2',
        execute: async (ws) => ({
          stepId: 'step-2',
          worldState: ws,
          eventsPublished: 3,
          errors: [],
        }),
      };

      const pipeline = createPipeline([step1, step2]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry);

      await engine.start();
      const result = await engine.tick();

      expect(result.pipelineResult.stepsExecuted).toEqual(['step-1', 'step-2']);
      expect(result.pipelineResult.eventsPublished).toBe(5);
    });

    it('should handle step errors gracefully', async () => {
      const failingStep: PipelineStep = {
        id: 'step-1',
        execute: async () => {
          throw new Error('Step failed');
        },
      };

      const pipeline = createPipeline([failingStep]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry);

      await engine.start();
      const result = await engine.tick();

      expect(result.pipelineResult.errors.length).toBeGreaterThan(0);
      expect(result.pipelineResult.errors[0]).toContain('Step failed');
    });
  });

  describe('World State Management', () => {
    it('should provide access to current world state', async () => {
      const pipeline = createPipeline([]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry);

      const current = engine.getCurrentWorld();
      expect(current).toBe(worldState);
    });

    it('should maintain tick reference', async () => {
      const pipeline = createPipeline([]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry);

      const tick = engine.getCurrentTick();
      expect(tick.number).toBe(0);
    });
  });

  describe('Infrastructure Accessors', () => {
    it('should provide access to event bus', () => {
      const pipeline = createPipeline([]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry, eventBus);

      expect(engine.getEventBus()).toBe(eventBus);
    });

    it('should provide access to service registry', () => {
      const pipeline = createPipeline([]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry);

      expect(engine.getServiceRegistry()).toBe(serviceRegistry);
    });

    it('should provide access to clock', () => {
      const pipeline = createPipeline([]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry);

      expect(engine.getClock()).toBeDefined();
    });

    it('should provide access to scheduler', () => {
      const pipeline = createPipeline([]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry);

      expect(engine.getScheduler()).toBeDefined();
    });

    it('should provide access to ECS world', () => {
      const pipeline = createPipeline([]);
      const engine = new Engine(pipeline, worldState, { tickRate: 60 }, serviceRegistry);

      const world = engine.getWorld();
      expect(world).toBeDefined();
    });
  });

  describe('Complete Scenario', () => {
    it('should execute a complete game loop', async () => {
      const pipeline = createPipeline([]);
      const engine = new Engine(
        pipeline,
        worldState,
        { tickRate: 60, maxTicks: 3 },
        serviceRegistry
      );

      const ticks: number[] = [];

      await engine.start();
      expect(engine.isRunning()).toBe(true);

      while (engine.isRunning()) {
        const result = await engine.tick();
        ticks.push(result.tickNumber);
      }

      expect(ticks).toEqual([1, 2, 3]);
      expect(engine.getState()).toBe(EngineState.Stopped);
    });
  });
});
