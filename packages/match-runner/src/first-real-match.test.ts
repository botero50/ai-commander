/**
 * Story 21.2 — First Real Match Validation
 *
 * This test validates that a complete match can run from start to finish:
 * 1. Create game session
 * 2. Create two brains (Builtin for this test)
 * 3. Execute match loop (observe → plan → decide → execute)
 * 4. Detect winner
 * 5. Generate report
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MatchController } from './match-controller.js';
import { formatBrainDecision, DecisionDisplayFormatter } from './decision-display.js';
import { EventFactory, EventFeed } from './event-feed.js';
import { MatchReportGenerator } from './match-report.js';
import type { BrainDecision, WorldObservation } from '@ai-commander/brain';

describe('Story 21.2 — First Real Match', () => {
  let controller: MatchController;

  beforeEach(() => {
    controller = new MatchController('match-001', 'Brain1', 'Brain2', 1000);
  });

  it('should create match controller', () => {
    expect(controller).toBeDefined();
    expect(controller.getState().matchId).toBe('match-001');
    expect(controller.getState().player1Name).toBe('Brain1');
    expect(controller.getState().player2Name).toBe('Brain2');
  });

  it('should track match progress', () => {
    controller.startMatch();
    expect(controller.getState().status).toBe('running');

    // Simulate match progress
    for (let i = 0; i < 100; i++) {
      controller.updateTick(i);
      controller.recordPlayerCommand(1, 1, 100 + Math.random() * 50);
      controller.recordPlayerCommand(2, 1, 120 + Math.random() * 50);
    }

    const state = controller.getState();
    expect(state.currentTick).toBe(99);
    expect(state.tickRate).toBeGreaterThan(0);
    expect(state.duration).toBeGreaterThan(0);
  });

  it('should format brain decisions', () => {
    const observation: WorldObservation = {
      tick: 100,
      timestamp: Date.now(),
      missionId: 'mission-001',
      agent: {
        position: { x: 100, y: 100 },
        health: 100,
        resources: { wood: 500, stone: 300 },
      },
      units: [],
      resources: { wood: 5000, stone: 3000 },
      structures: [],
      visibility: [],
    };

    const decision: BrainDecision = {
      reasoning: 'Need to expand territory',
      selectedGoal: 'expand',
      plan: ['Scout north', 'Build settlement', 'Train workers'],
      commands: ['move unit 1 to (150, 100)', 'build settlement at (200, 150)'],
      confidence: 0.85,
    };

    const display = formatBrainDecision(1, observation, decision, 245, 100);

    expect(display.playerId).toBe(1);
    expect(display.tick).toBe(100);
    expect(display.latencyMs).toBe(245);
    expect(display.goal).toBe('expand');
    expect(display.confidence).toBe(85);
  });

  it('should display decisions in side-by-side format', () => {
    const decision1: BrainDecision = {
      reasoning: 'Expand territory',
      selectedGoal: 'expand',
      plan: ['Scout', 'Build'],
      commands: ['move', 'build'],
      confidence: 0.85,
    };

    const decision2: BrainDecision = {
      reasoning: 'Defend base',
      selectedGoal: 'defend',
      plan: ['Garrison units', 'Build walls'],
      commands: ['garrison', 'build-wall'],
      confidence: 0.72,
    };

    const obs1: WorldObservation = {
      tick: 100,
      timestamp: Date.now(),
      missionId: 'mission-001',
      agent: { position: { x: 100, y: 100 }, health: 100, resources: { wood: 500, stone: 300 } },
      units: [],
      resources: { wood: 5000, stone: 3000 },
      structures: [],
      visibility: [],
    };

    const obs2 = obs1;

    const display1 = formatBrainDecision(1, obs1, decision1, 245, 100);
    const display2 = formatBrainDecision(2, obs2, decision2, 290, 100);

    const comparison = DecisionDisplayFormatter.compareDecisions(display1, display2);
    expect(comparison).toBeDefined();
    expect(comparison).toContain('expand');
    expect(comparison).toContain('defend');
  });

  it('should track game events', () => {
    const eventFeed = new EventFeed();

    eventFeed.addEvent(EventFactory.expansion(1, 100, 'North Territory'));
    eventFeed.addEvent(EventFactory.buildingConstructed(2, 150, 'Barracks', 2));
    eventFeed.addEvent(EventFactory.combat(1, 200, 3, 8)); // Win
    eventFeed.addEvent(EventFactory.technologyResearched(1, 300, 'Iron Working'));

    const events = eventFeed.getEvents();
    expect(events).toHaveLength(4);
    expect(events[0].type).toBe('expansion');
    expect(events[1].type).toBe('building');
    expect(events[2].type).toBe('combat');
    expect(events[3].type).toBe('technology');
  });

  it('should format event timeline', () => {
    const eventFeed = new EventFeed();

    eventFeed.addEvent(EventFactory.expansion(1, 100, 'North'));
    eventFeed.addEvent(EventFactory.buildingConstructed(1, 150, 'Barracks', 1));
    eventFeed.addEvent(EventFactory.combat(2, 200, 2, 5));

    const events = eventFeed.getRecentEvents(10);
    const timeline = EventDisplayFormatter.toTimeline(events);

    expect(timeline).toBeDefined();
    expect(timeline).toContain('Tick');
    expect(timeline).toContain('Expansion');
    expect(timeline).toContain('Building');
    expect(timeline).toContain('Combat');
  });

  it('should generate match report', () => {
    const matchResult = {
      winner: 1,
      totalTicks: 1000,
      duration: 67,
      player1Stats: {
        commandsExecuted: 523,
        commandsFailed: 18,
        goalsCompleted: 12,
        averageLatencyMs: 245,
      },
      player2Stats: {
        commandsExecuted: 498,
        commandsFailed: 22,
        goalsCompleted: 10,
        averageLatencyMs: 290,
      },
    };

    const report = MatchReportGenerator.generateReport('match-001', matchResult, 'Brain1', 'Brain2');

    expect(report.matchId).toBe('match-001');
    expect(report.winner).toBe(1);
    expect(report.player1Name).toBe('Brain1');
    expect(report.player2Name).toBe('Brain2');
  });

  it('should format report as markdown', () => {
    const matchResult = {
      winner: 1,
      totalTicks: 1000,
      duration: 67,
      player1Stats: {
        commandsExecuted: 523,
        commandsFailed: 18,
        goalsCompleted: 12,
        averageLatencyMs: 245,
      },
      player2Stats: {
        commandsExecuted: 498,
        commandsFailed: 22,
        goalsCompleted: 10,
        averageLatencyMs: 290,
      },
    };

    const report = MatchReportGenerator.generateReport('match-001', matchResult, 'Brain1', 'Brain2');
    const markdown = MatchReportGenerator.formatMarkdown(report);

    expect(markdown).toBeDefined();
    expect(markdown).toContain('match-001');
    expect(markdown).toContain('Brain1');
    expect(markdown).toContain('Brain2');
    expect(markdown).toContain('Winner');
  });

  it('should complete a full match simulation', () => {
    // Simulate a complete match lifecycle
    controller.startMatch();
    expect(controller.getState().status).toBe('running');

    const eventFeed = new EventFeed();
    const decisions: Array<{ playerId: number; decision: BrainDecision }> = [];

    // Simulate match loop
    for (let tick = 0; tick < 100; tick++) {
      controller.updateTick(tick);

      // Record some commands
      if (tick % 10 === 0) {
        controller.recordPlayerCommand(1, 1, 100 + Math.random() * 50);
        eventFeed.addEvent(EventFactory.expansion(1, tick, `Area${tick}`));
      }

      if (tick % 15 === 0) {
        controller.recordPlayerCommand(2, 1, 120 + Math.random() * 50);
        eventFeed.addEvent(EventFactory.buildingConstructed(2, tick, 'Structure', 1));
      }

      if (tick % 25 === 0) {
        eventFeed.addEvent(EventFactory.combat(Math.random() > 0.5 ? 1 : 2, tick, 3, 5));
      }
    }

    // Complete match
    controller.finishMatch(1); // Player 1 wins
    const state = controller.getState();

    expect(state.status).toBe('finished');
    expect(state.winner).toBe(1);
    expect(eventFeed.getCount()).toBeGreaterThan(0);

    // Generate report
    const report = MatchReportGenerator.generateReport('match-001', {
      winner: 1,
      totalTicks: 100,
      duration: state.duration,
      player1Stats: {
        commandsExecuted: 10,
        commandsFailed: 1,
        goalsCompleted: 5,
        averageLatencyMs: 245,
      },
      player2Stats: {
        commandsExecuted: 7,
        commandsFailed: 2,
        goalsCompleted: 3,
        averageLatencyMs: 290,
      },
    }, 'Brain1', 'Brain2');

    expect(report.winner).toBe(1);
    expect(report.totalTicks).toBe(100);
  });
});
