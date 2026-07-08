import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { BrainAdapter } from './brain-adapter.js';
import { createTick } from '@ai-commander/domain';
import type { WorldState } from '@ai-commander/domain';

const createMockWorldState = (tick: number, agentCount: number = 5): WorldState => {
  const agents = Array.from({ length: agentCount }, (_, i) => ({
    agentId: `agent-${i}` as any,
    controlledByPlayerId: 1 as any,
    snapshot: {
      attributes: {},
    },
    customData: {
      type: i < 3 ? 'unit' : 'building',
      owner: 'friendly',
      health: 100,
      position: { x: i * 10, y: i * 10 },
      name: `Agent ${i}`,
    },
  } as any));

  return {
    time: {
      currentTick: createTick(tick),
      elapsedTicks: tick,
      currentPhase: null,
      displayTime: `Tick ${tick}`,
    } as any,
    map: {
      id: 'test-map',
      name: 'Test Map',
      positions: [],
      width: 256,
      height: 256,
    } as any,
    players: [{ id: 1 as any, customData: {} } as any],
    teams: [],
    agents: agents as any,
    customData: {
      resources: [{ type: 'food', amount: 100 }],
      visibility: { explored: 50000, visible: 25000 },
    },
  } as any;
};

test('BrainAdapter - convert WorldState to WorldObservation', () => {
  const worldState = createMockWorldState(42, 5);
  const observation = BrainAdapter.worldStateToObservation(worldState, 'mission-1', 'agent-1');

  assert.equal(observation.tick, 42);
  assert.equal(observation.missionId, 'mission-1');
  assert.equal(observation.agentId, 'agent-1');
  assert(observation.agentName);
  assert(typeof observation.agentPosition.x === 'number');
  assert(typeof observation.agentPosition.y === 'number');
});

test('BrainAdapter - extract friendly units', () => {
  const worldState = createMockWorldState(1, 5);
  const observation = BrainAdapter.worldStateToObservation(worldState, 'mission-1', 'agent-1');

  assert(observation.friendlyUnits.length > 0);
  assert(observation.friendlyUnits.every((u) => u.id && u.position && typeof u.health === 'number'));
});

test('BrainAdapter - include structures', () => {
  const worldState = createMockWorldState(1, 5);
  const observation = BrainAdapter.worldStateToObservation(worldState, 'mission-1', 'agent-1');

  assert(observation.structures.length > 0);
  assert(observation.structures.every((s) => s.id && s.type && s.position && typeof s.health === 'number'));
});

test('BrainAdapter - include resources', () => {
  const worldState = createMockWorldState(1, 5);
  const observation = BrainAdapter.worldStateToObservation(worldState, 'mission-1', 'agent-1');

  assert(observation.resources.length > 0);
  assert(observation.resources.every((r) => r.type && typeof r.amount === 'number'));
});

test('BrainAdapter - visibility metrics', () => {
  const worldState = createMockWorldState(1, 5);
  const observation = BrainAdapter.worldStateToObservation(worldState, 'mission-1', 'agent-1');

  assert(typeof observation.visibility.explored === 'number');
  assert(typeof observation.visibility.visible === 'number');
  assert(typeof observation.visibility.totalMap === 'number');
});

test('BrainAdapter - get default goals', () => {
  const goals = BrainAdapter.getDefaultGoals();

  assert(goals.length > 0);
  assert(goals.every((g) => g.id && g.intent && g.priority && typeof g.feasibility === 'number'));
  assert(goals.some((g) => g.priority === 'high'));
  assert(goals.some((g) => g.priority === 'medium'));
});

test('BrainAdapter - get default commands', () => {
  const commands = BrainAdapter.getDefaultCommands();

  assert(commands.length > 0);
  assert(commands.every((c) => c.id && c.action && typeof c.expectedDuration === 'number'));
  assert(commands.some((c) => c.action === 'move'));
  assert(commands.some((c) => c.action === 'attack'));
});

test('BrainAdapter - get execution memory', () => {
  const memory = BrainAdapter.getExecutionMemory();

  assert(Array.isArray(memory.recentEvents));
  assert(Array.isArray(memory.recentDecisions));
  assert(memory.metrics);
  assert.equal(typeof memory.metrics.commandsExecuted, 'number');
});

test('BrainAdapter - convert brain decision to commands', () => {
  const decision = {
    reasoning: 'Strategic decision',
    selectedGoal: 'goal-attack',
    plan: ['Move units', 'Attack enemy'],
    commands: ['move:location1', 'attack:enemy2'],
    confidence: 0.95,
  };

  const commands = BrainAdapter.brainDecisionToCommands(decision, 'agent-1', 10);

  assert.equal(commands.length, 2);
  assert(commands.every((c) => c.id && c.agentId && c.actionType));
  assert(commands.every((c) => c.parameters.reasoning === decision.reasoning));
  assert(commands.every((c) => c.parameters.confidence === decision.confidence));
});

test('BrainAdapter - observation immutability', () => {
  const worldState = createMockWorldState(1, 3);
  const observation = BrainAdapter.worldStateToObservation(worldState, 'mission-1', 'agent-1');

  assert.throws(
    () => {
      (observation as any).tick = 999;
    },
    { message: /Cannot assign to read only property/ }
  );
});

test('BrainAdapter - empty agents state', () => {
  const worldState = createMockWorldState(1, 0);
  const observation = BrainAdapter.worldStateToObservation(worldState, 'mission-1', 'agent-1');

  assert.equal(observation.friendlyUnits.length, 0);
  assert.equal(observation.structures.length, 0);
});

test('BrainAdapter - decision with empty commands', () => {
  const decision = {
    reasoning: 'No decision',
    selectedGoal: 'goal-none',
    plan: [],
    commands: [],
    confidence: 0.0,
  };

  const commands = BrainAdapter.brainDecisionToCommands(decision, 'agent-1', 10);

  assert.equal(commands.length, 0);
});
