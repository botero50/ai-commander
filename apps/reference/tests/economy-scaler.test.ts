import { describe, it, expect } from 'vitest';
import { EconomyScaler } from '../src/economy-scaler.ts';
import type { WorldState } from '@ai-commander/domain';

describe('EconomyScaler', () => {
  const scaler = new EconomyScaler();

  const createMockWorldState = (overrides: any = {}): WorldState => ({
    time: { tick: 0, timestamp: 0 },
    map: { width: 100, height: 100, terrain: [] },
    players: [{ id: 'p1', name: 'Player' }],
    teams: [],
    agents: overrides.agents || [],
    customData: overrides.customData || {},
  });

  it('should count total workers from world state', () => {
    const worldState = createMockWorldState({
      agents: [
        { agentId: 'w1', customData: { type: 'worker' } },
        { agentId: 'w2', customData: { type: 'worker' } },
        { agentId: 'u1', customData: { type: 'unit' } },
      ],
    });

    const snapshot = scaler.observeEconomy(worldState);
    expect(snapshot.totalWorkers).toBe(2);
  });

  it('should count active gathering workers', () => {
    const worldState = createMockWorldState({
      agents: [
        { agentId: 'w1', customData: { type: 'worker', status: 'gathering' } },
        { agentId: 'w2', customData: { type: 'worker', status: 'idle' } },
        { agentId: 'w3', customData: { type: 'worker', status: 'gathering' } },
      ],
    });

    const snapshot = scaler.observeEconomy(worldState);
    expect(snapshot.activeGatheringWorkers).toBe(2);
    expect(snapshot.idleWorkers).toBe(1);
  });

  it('should count available resource fields', () => {
    const worldState = createMockWorldState({
      customData: {
        fields: [
          { id: 'f1', amount: 100 },
          { id: 'f2', amount: 50 },
          { id: 'f3', amount: 0 },
        ],
        resources: 200,
      },
    });

    const snapshot = scaler.observeEconomy(worldState);
    expect(snapshot.availableFieldCount).toBe(2);
  });

  it('should extract current resources from world state', () => {
    const worldState = createMockWorldState({
      customData: { resources: 500 },
    });

    const snapshot = scaler.observeEconomy(worldState);
    expect(snapshot.currentResources).toBe(500);
  });

  it('should decide to produce when efficiency is good and deficit exists', () => {
    const worldState = createMockWorldState({
      agents: [
        { agentId: 'w1', customData: { type: 'worker', status: 'gathering' } },
        { agentId: 'w2', customData: { type: 'worker', status: 'idle' } },
      ],
      customData: {
        fields: [
          { id: 'f1', amount: 100 },
          { id: 'f2', amount: 100 },
          { id: 'f3', amount: 100 },
        ],
        resources: 200,
      },
    });

    const snapshot = scaler.observeEconomy(worldState);
    const decision = scaler.decideProduction(snapshot);

    expect(decision.shouldProduce).toBe(true);
    expect(decision.optimalWorkerCount).toBeGreaterThan(snapshot.totalWorkers);
  });

  it('should not produce when insufficient resources', () => {
    const worldState = createMockWorldState({
      agents: [
        { agentId: 'w1', customData: { type: 'worker', status: 'gathering' } },
      ],
      customData: {
        fields: [{ id: 'f1', amount: 100 }],
        resources: 50,
      },
    });

    const snapshot = scaler.observeEconomy(worldState);
    const decision = scaler.decideProduction(snapshot);

    expect(decision.shouldProduce).toBe(false);
    expect(decision.reason).toContain('insufficient_resources');
  });

  it('should not produce when at maximum workers', () => {
    const workers = Array(50)
      .fill(null)
      .map((_, i) => ({
        agentId: `w${i}`,
        customData: { type: 'worker', status: 'gathering' },
      }));

    const worldState = createMockWorldState({
      agents: workers,
      customData: {
        fields: [{ id: 'f1', amount: 100 }],
        resources: 10000,
      },
    });

    const snapshot = scaler.observeEconomy(worldState);
    const decision = scaler.decideProduction(snapshot);

    expect(decision.shouldProduce).toBe(false);
    expect(decision.reason).toContain('economy_saturated');
  });

  it('should not produce when efficiency is low', () => {
    const worldState = createMockWorldState({
      agents: [
        { agentId: 'w1', customData: { type: 'worker', status: 'idle' } },
        { agentId: 'w2', customData: { type: 'worker', status: 'idle' } },
        { agentId: 'w3', customData: { type: 'worker', status: 'idle' } },
      ],
      customData: {
        fields: [{ id: 'f1', amount: 100 }],
        resources: 500,
      },
    });

    const snapshot = scaler.observeEconomy(worldState);
    const decision = scaler.decideProduction(snapshot);

    expect(decision.shouldProduce).toBe(false);
    expect(decision.reason).toContain('low_efficiency');
  });

  it('should determine optimal worker count based on available fields', () => {
    const worldState = createMockWorldState({
      agents: [{ agentId: 'w1', customData: { type: 'worker', status: 'gathering' } }],
      customData: {
        fields: [
          { id: 'f1', amount: 100 },
          { id: 'f2', amount: 100 },
          { id: 'f3', amount: 100 },
          { id: 'f4', amount: 100 },
          { id: 'f5', amount: 100 },
        ],
        resources: 1000,
      },
    });

    const snapshot = scaler.observeEconomy(worldState);
    const optimalCount = scaler.determineOptimalWorkerCount(snapshot);

    expect(optimalCount).toBeGreaterThan(snapshot.totalWorkers);
  });

  it('should handle empty world state gracefully', () => {
    const worldState = createMockWorldState();

    const snapshot = scaler.observeEconomy(worldState);

    expect(snapshot.totalWorkers).toBe(0);
    expect(snapshot.activeGatheringWorkers).toBe(0);
    expect(snapshot.availableFieldCount).toBe(0);
    expect(snapshot.efficiency).toBe(0);
  });
});
