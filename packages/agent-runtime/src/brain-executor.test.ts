import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrainExecutor } from './brain-executor.js';
import type { Brain, BrainDecision, WorldObservation, GoalOption, CommandOption } from '@ai-commander/brain';

const mockBrain: Brain = {
  name: 'TestBrain',
  version: '1.0',
  decide: vi.fn().mockResolvedValue({
    reasoning: 'Test',
    selectedGoal: 'test-goal',
    plan: ['step1'],
    commands: ['cmd1'],
    confidence: 0.8,
  } as BrainDecision),
};

const mockObservation: WorldObservation = {
  tick: 0,
  timestamp: Date.now(),
  missionId: 'test',
  agentId: 'test',
  agentName: 'Test',
  agentPosition: { x: 0, y: 0 },
  agentHealth: 100,
  friendlyUnits: [],
  enemyUnits: [],
  resources: [],
  structures: [],
  visibility: { explored: 100, visible: 50, totalMap: 200, visibleEnemyCount: 0, visibleResourceCount: 0 },
};

const mockGoals: GoalOption[] = [
  { id: 'test-goal', intent: 'Test', priority: 'high', feasibility: 0.8, expectedDuration: 5, estimatedValue: 100 },
];

const mockCommands: CommandOption[] = [
  { id: 'cmd1', action: 'move', expectedDuration: 5, expectedCost: 0, description: 'Move' },
];

describe('BrainExecutor', () => {
  let executor: BrainExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    executor = new BrainExecutor(1, 'Player 1', mockBrain);
  });

  it('should initialize with correct player info', () => {
    expect(executor.getPlayerId()).toBe(1);
    expect(executor.getBrainName()).toBe('TestBrain');
  });

  it('should have isolated memory per executor', () => {
    const executor2 = new BrainExecutor(2, 'Player 2', mockBrain);
    const ctx1 = executor.getContext();
    const ctx2 = executor2.getContext();

    expect(ctx1.memory).not.toBe(ctx2.memory);
    expect(ctx1.decisions).not.toBe(ctx2.decisions);
  });

  it('should execute decision and track it', async () => {
    const decision = await executor.decide(mockObservation, mockGoals, mockCommands);

    expect(decision).toEqual({
      reasoning: 'Test',
      selectedGoal: 'test-goal',
      plan: ['step1'],
      commands: ['cmd1'],
      confidence: 0.8,
    });

    const context = executor.getContext();
    expect(context.totalInferences).toBe(1);
    expect(context.decisions).toHaveLength(1);
    expect(context.lastDecision).toBe(decision);
  });

  it('should track multiple decisions', async () => {
    await executor.decide(mockObservation, mockGoals, mockCommands);
    await executor.decide(mockObservation, mockGoals, mockCommands);
    await executor.decide(mockObservation, mockGoals, mockCommands);

    const context = executor.getContext();
    expect(context.totalInferences).toBe(3);
    expect(context.decisions).toHaveLength(3);
  });

  it('should calculate average latency', async () => {
    (mockBrain.decide as any).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({
        reasoning: 'Test',
        selectedGoal: 'test-goal',
        plan: [],
        commands: [],
        confidence: 0.8,
      }), 100))
    );

    await executor.decide(mockObservation, mockGoals, mockCommands);

    const context = executor.getContext();
    expect(context.averageLatencyMs).toBeGreaterThanOrEqual(100);
  });

  it('should handle decision errors gracefully', async () => {
    const error = new Error('Test error');
    (mockBrain.decide as any).mockRejectedValueOnce(error);

    const decision = await executor.decide(mockObservation, mockGoals, mockCommands);

    expect(decision.commands).toEqual([]);
    expect(decision.confidence).toBe(0.0);

    const context = executor.getContext();
    expect(context.lastError?.message).toBe('Test error');
  });

  it('should track events separately per executor', () => {
    executor.recordEvent('combat', 'Attacked unit', 10);

    const ctx = executor.getContext();
    expect(ctx.memory.recentEvents).toHaveLength(1);
    expect(ctx.memory.recentEvents[0].type).toBe('combat');
  });

  it('should update metrics correctly', () => {
    executor.updateMetrics(5, 1, 1, 0);

    let ctx = executor.getContext();
    expect(ctx.memory.metrics.commandsExecuted).toBe(5);
    expect(ctx.memory.metrics.commandsFailed).toBe(1);
    expect(ctx.memory.metrics.goalsCompleted).toBe(1);

    executor.updateMetrics(3, 0, 0, 1);
    ctx = executor.getContext();
    expect(ctx.memory.metrics.commandsExecuted).toBe(8);
    expect(ctx.memory.metrics.goalsAbandoned).toBe(1);
  });

  it('should reset all state', async () => {
    await executor.decide(mockObservation, mockGoals, mockCommands);
    executor.recordEvent('test', 'detail', 0);
    executor.updateMetrics(5, 1, 1, 0);

    executor.reset();

    const ctx = executor.getContext();
    expect(ctx.totalInferences).toBe(0);
    expect(ctx.decisions).toHaveLength(0);
    expect(ctx.memory.recentEvents).toHaveLength(0);
    expect(ctx.memory.metrics.commandsExecuted).toBe(0);
  });

  it('should keep only last 100 decisions', async () => {
    // Execute 150 decisions
    for (let i = 0; i < 150; i++) {
      await executor.decide(mockObservation, mockGoals, mockCommands);
    }

    const ctx = executor.getContext();
    expect(ctx.totalInferences).toBe(150);
    expect(ctx.decisions).toHaveLength(100); // Only last 100 kept
  });

  it('should maintain independent memory from brain', async () => {
    await executor.decide(mockObservation, mockGoals, mockCommands);
    const context = executor.getContext();

    // Memory should have updated decisions
    expect(context.memory.recentDecisions).toHaveLength(1);
    expect(context.memory.recentDecisions[0].goal).toBe('test-goal');
  });
});
