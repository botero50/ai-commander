import { describe, it, expect, beforeEach } from 'vitest';
import { DecisionTimeline, type DecisionTimelineEntry } from './decision-timeline.js';
import type { DecisionEvent } from '../match/decision-overlay.js';
import type { TimelineSnapshot } from '../match/match-timeline.js';

describe('DecisionTimeline', () => {
  let timeline: DecisionTimeline;
  let baseTime: number;

  beforeEach(() => {
    timeline = new DecisionTimeline();
    baseTime = Date.now();
  });

  const createDecision = (
    tick: number,
    player: 'player1' | 'player2',
    brain: string,
    reasoning: string,
    commands: string[] = []
  ): DecisionEvent => ({
    tick,
    timestamp: baseTime + tick * 100,
    player,
    brainName: brain,
    reasoning,
    commands,
    commandCount: commands.length,
    durationMs: 250,
  });

  const createSnapshot = (tick: number): TimelineSnapshot => ({
    tick,
    timestamp: baseTime + tick * 100,
    gameState: {
      unitCount: 10 + tick,
      buildingCount: 5 + tick / 10,
      playerCount: 2,
      resourcesPerPlayer: [
        { wood: 100 + tick, stone: 50 },
        { wood: 100 + tick, stone: 50 },
      ],
    },
    decisions: [],
  });

  it('should add a decision to timeline', () => {
    const decision = createDecision(0, 'player1', 'Ollama-1', 'Expanding territory', ['move', 'train']);
    const snapshot = createSnapshot(0);

    timeline.addDecision(decision, snapshot);

    const entry = timeline.getDecision(0);
    expect(entry).not.toBeNull();
    expect(entry?.brain).toBe('Ollama-1');
    expect(entry?.player).toBe('Player 1');
  });

  it('should retrieve decision at specific tick', () => {
    timeline.addDecision(createDecision(5, 'player1', 'Brain1', 'Test'), createSnapshot(5));

    const entry = timeline.getDecision(5);
    expect(entry?.tick).toBe(5);
    expect(entry?.brain).toBe('Brain1');
  });

  it('should return null for non-existent decision', () => {
    const entry = timeline.getDecision(999);
    expect(entry).toBeNull();
  });

  it('should get decisions in range', () => {
    timeline.addDecision(createDecision(0, 'player1', 'Brain1', 'Decision 1'), createSnapshot(0));
    timeline.addDecision(createDecision(5, 'player1', 'Brain1', 'Decision 2'), createSnapshot(5));
    timeline.addDecision(createDecision(10, 'player1', 'Brain1', 'Decision 3'), createSnapshot(10));

    const decisions = timeline.getDecisionsInRange(0, 7);
    expect(decisions).toHaveLength(2);
    expect(decisions[0].tick).toBe(0);
    expect(decisions[1].tick).toBe(5);
  });

  it('should get all decisions sorted by tick', () => {
    timeline.addDecision(createDecision(10, 'player1', 'Brain1', 'Third'), createSnapshot(10));
    timeline.addDecision(createDecision(0, 'player1', 'Brain1', 'First'), createSnapshot(0));
    timeline.addDecision(createDecision(5, 'player1', 'Brain1', 'Second'), createSnapshot(5));

    const all = timeline.getAllDecisions();
    expect(all).toHaveLength(3);
    expect(all[0].tick).toBe(0);
    expect(all[1].tick).toBe(5);
    expect(all[2].tick).toBe(10);
  });

  it('should filter decisions by player', () => {
    timeline.addDecision(createDecision(0, 'player1', 'Brain1', 'P1'), createSnapshot(0));
    timeline.addDecision(createDecision(1, 'player2', 'Brain2', 'P2'), createSnapshot(1));
    timeline.addDecision(createDecision(2, 'player1', 'Brain1', 'P1-2'), createSnapshot(2));

    const p1Decisions = timeline.getDecisionsByPlayer('Player 1');
    const p2Decisions = timeline.getDecisionsByPlayer('Player 2');

    expect(p1Decisions).toHaveLength(2);
    expect(p2Decisions).toHaveLength(1);
  });

  it('should filter decisions by brain', () => {
    timeline.addDecision(createDecision(0, 'player1', 'Ollama-1', 'First'), createSnapshot(0));
    timeline.addDecision(createDecision(1, 'player2', 'Ollama-2', 'Second'), createSnapshot(1));
    timeline.addDecision(createDecision(2, 'player1', 'Ollama-1', 'Third'), createSnapshot(2));

    const ollama1 = timeline.getDecisionsByBrain('Ollama-1');
    const ollama2 = timeline.getDecisionsByBrain('Ollama-2');

    expect(ollama1).toHaveLength(2);
    expect(ollama2).toHaveLength(1);
    expect(ollama1[0].tick).toBe(0);
    expect(ollama1[1].tick).toBe(2);
  });

  it('should search decisions by reasoning keyword', () => {
    timeline.addDecision(createDecision(0, 'player1', 'Brain1', 'Expanding territory'), createSnapshot(0));
    timeline.addDecision(
      createDecision(1, 'player1', 'Brain1', 'Defending fortress'),
      createSnapshot(1)
    );
    timeline.addDecision(createDecision(2, 'player1', 'Brain1', 'Expanding army'), createSnapshot(2));

    const expandingDecisions = timeline.searchByReasoning('expand');
    expect(expandingDecisions).toHaveLength(2);
    expect(expandingDecisions[0].reasoning).toContain('Expanding');
    expect(expandingDecisions[1].reasoning).toContain('Expanding');
  });

  it('should handle command parsing from string array', () => {
    const decision = createDecision(
      0,
      'player1',
      'Brain1',
      'Training units',
      ['move-unit-to-10-20', 'train-infantry-barracks-5']
    );

    timeline.addDecision(decision, createSnapshot(0));
    const entry = timeline.getDecision(0);

    expect(entry?.commands.length).toBeGreaterThan(0);
  });

  it('should calculate statistics', () => {
    timeline.addDecision(createDecision(0, 'player1', 'Brain1', 'D1', ['a', 'b']), createSnapshot(0));
    timeline.addDecision(createDecision(5, 'player1', 'Brain1', 'D2', ['c']), createSnapshot(5));
    timeline.addDecision(createDecision(10, 'player1', 'Brain1', 'D3', ['d', 'e', 'f']), createSnapshot(10));

    const stats = timeline.getStatistics();

    expect(stats.totalDecisions).toBe(3);
    expect(stats.averageDuration).toBe(250); // All decisions have 250ms duration
    expect(stats.totalCommands).toBeGreaterThan(0);
    expect(stats.averageCommandsPerDecision).toBeGreaterThan(0);
  });

  it('should return empty statistics for empty timeline', () => {
    const stats = timeline.getStatistics();

    expect(stats.totalDecisions).toBe(0);
    expect(stats.averageDuration).toBe(0);
    expect(stats.totalCommands).toBe(0);
    expect(stats.averageCommandsPerDecision).toBe(0);
  });

  it('should get ticks with decisions', () => {
    timeline.addDecision(createDecision(0, 'player1', 'Brain1', 'D1'), createSnapshot(0));
    timeline.addDecision(createDecision(5, 'player1', 'Brain1', 'D2'), createSnapshot(5));
    timeline.addDecision(createDecision(10, 'player1', 'Brain1', 'D3'), createSnapshot(10));

    const ticks = timeline.getTicksWithDecisions();

    expect(ticks).toEqual([0, 5, 10]);
  });

  it('should preserve observation data in timeline entry', () => {
    const decision = createDecision(0, 'player1', 'Brain1', 'Test decision', []);
    const snapshot = createSnapshot(0);

    timeline.addDecision(decision, snapshot);
    const entry = timeline.getDecision(0);

    expect(entry?.observation.unitCount).toBe(10);
    expect(entry?.observation.buildingCount).toBeCloseTo(5);
    expect(entry?.observation.playerCount).toBe(2);
    expect(entry?.observation.resourcesPerPlayer[0].wood).toBe(100);
  });

  it('should convert player enum to readable label', () => {
    timeline.addDecision(createDecision(0, 'player1', 'Brain1', 'P1'), createSnapshot(0));
    timeline.addDecision(createDecision(1, 'player2', 'Brain2', 'P2'), createSnapshot(1));

    const p1 = timeline.getDecision(0);
    const p2 = timeline.getDecision(1);

    expect(p1?.player).toBe('Player 1');
    expect(p2?.player).toBe('Player 2');
  });
});
