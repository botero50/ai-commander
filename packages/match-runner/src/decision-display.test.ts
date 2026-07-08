import { describe, it, expect, vi } from 'vitest';
import {
  formatBrainDecision,
  DecisionDisplayFormatter,
  LiveDecisionManager,
  type DecisionDisplay,
} from './decision-display.js';
import type { BrainDecision, WorldObservation } from '@ai-commander/brain';

const mockObservation: WorldObservation = {
  tick: 100,
  timestamp: Date.now(),
  missionId: 'test',
  agentId: 'agent-1',
  agentName: 'TestAgent',
  agentPosition: { x: 100, y: 100 },
  agentHealth: 100,
  friendlyUnits: [
    { id: '1', name: 'unit1', type: 'soldier', position: { x: 110, y: 110 }, health: 100 },
    { id: '2', name: 'unit2', type: 'soldier', position: { x: 120, y: 120 }, health: 80 },
  ],
  enemyUnits: [{ id: '3', name: 'enemy1', type: 'soldier', position: { x: 200, y: 200 }, health: 100, threat: 0.8 }],
  resources: [
    { type: 'metal', amount: 500 },
    { type: 'energy', amount: 300 },
  ],
  structures: [],
  visibility: {
    explored: 1024,
    visible: 512,
    totalMap: 2048,
    visibleEnemyCount: 1,
    visibleResourceCount: 5,
  },
};

const mockDecision: BrainDecision = {
  reasoning: 'Attack seems viable',
  selectedGoal: 'attack',
  plan: ['gather force', 'attack'],
  commands: ['move', 'attack'],
  confidence: 0.75,
};

describe('Decision Display', () => {
  describe('formatBrainDecision', () => {
    it('should format decision correctly', () => {
      const display = formatBrainDecision(1, mockObservation, mockDecision, 1200, 100);

      expect(display.playerId).toBe(1);
      expect(display.tick).toBe(100);
      expect(display.commandCount).toBe(2);
      expect(display.latencyMs).toBe(1200);
      expect(display.confidence).toBe(75);
    });

    it('should map objective names', () => {
      const display = formatBrainDecision(1, mockObservation, mockDecision, 1200, 100);

      expect(display.currentObjective).toBe('⚔️ Attack Enemy');
    });

    it('should include observation summary', () => {
      const display = formatBrainDecision(1, mockObservation, mockDecision, 1200, 100);

      expect(display.observation.unitCount).toBe(2);
      expect(display.observation.enemyUnitCount).toBe(1);
      expect(display.observation.resourcesAvailable).toBe(800);
      expect(display.observation.mapExplored).toBe(50);
      expect(display.observation.mapVisible).toBe(25);
    });

    it('should format actions with icons', () => {
      const display = formatBrainDecision(1, mockObservation, mockDecision, 1200, 100);

      expect(display.selectedActions).toContain('👉 Move Units');
      expect(display.selectedActions).toContain('⚔️ Attack');
    });
  });

  describe('DecisionDisplayFormatter', () => {
    let display: DecisionDisplay;

    beforeEach(() => {
      display = formatBrainDecision(1, mockObservation, mockDecision, 1200, 100);
    });

    it('should format as status line', () => {
      const line = DecisionDisplayFormatter.toStatusLine(display);

      expect(line).toContain('⚔️ Attack Enemy');
      expect(line).toContain('1200ms');
      expect(line).toContain('75%');
    });

    it('should format as panel', () => {
      const panel = DecisionDisplayFormatter.toPanel(display);

      expect(panel).toContain('Observation');
      expect(panel).toContain('Current Objective');
      expect(panel).toContain('Selected Actions');
      expect(panel).toContain('Latency');
    });

    it('should format as JSON', () => {
      const json = DecisionDisplayFormatter.toJSON(display);
      const parsed = JSON.parse(json);

      expect(parsed.playerId).toBe(1);
      expect(parsed.commandCount).toBe(2);
    });

    it('should compare two decisions', () => {
      const display2 = formatBrainDecision(2, mockObservation, mockDecision, 1400, 100);
      const comparison = DecisionDisplayFormatter.compareDecisions(display, display2);

      expect(comparison).toContain('PLAYER 1');
      expect(comparison).toContain('PLAYER 2');
      expect(comparison).toContain('LIVE DECISION VIEW');
    });
  });

  describe('LiveDecisionManager', () => {
    let manager: LiveDecisionManager;

    beforeEach(() => {
      manager = new LiveDecisionManager();
    });

    it('should record decisions', () => {
      const display = formatBrainDecision(1, mockObservation, mockDecision, 1200, 100);
      manager.recordDecision(display);

      expect(manager.getDisplay(1)).toBe(display);
    });

    it('should emit when both players ready', () => {
      const callback = vi.fn();
      manager.onDecisionsReady(callback);

      const display1 = formatBrainDecision(1, mockObservation, mockDecision, 1200, 100);
      manager.recordDecision(display1);

      expect(callback).not.toHaveBeenCalled();

      const display2 = formatBrainDecision(2, mockObservation, mockDecision, 1400, 100);
      manager.recordDecision(display2);

      expect(callback).toHaveBeenCalled();
    });

    it('should get both displays', () => {
      const display1 = formatBrainDecision(1, mockObservation, mockDecision, 1200, 100);
      const display2 = formatBrainDecision(2, mockObservation, mockDecision, 1400, 100);

      manager.recordDecision(display1);
      manager.recordDecision(display2);

      const both = manager.getBothDisplays();
      expect(both).not.toBeNull();
      expect(both![0].playerId).toBe(1);
      expect(both![1].playerId).toBe(2);
    });

    it('should return null when not both ready', () => {
      const display1 = formatBrainDecision(1, mockObservation, mockDecision, 1200, 100);
      manager.recordDecision(display1);

      const both = manager.getBothDisplays();
      expect(both).toBeNull();
    });

    it('should reset state', () => {
      const display1 = formatBrainDecision(1, mockObservation, mockDecision, 1200, 100);
      manager.recordDecision(display1);

      manager.reset();

      expect(manager.getDisplay(1)).toBeUndefined();
    });

    it('should allow unsubscribe', () => {
      const callback = vi.fn();
      const unsubscribe = manager.onDecisionsReady(callback);

      const display1 = formatBrainDecision(1, mockObservation, mockDecision, 1200, 100);
      const display2 = formatBrainDecision(2, mockObservation, mockDecision, 1400, 100);

      manager.recordDecision(display1);
      manager.recordDecision(display2);

      expect(callback).toHaveBeenCalled();

      unsubscribe();
      manager.reset();

      const display3 = formatBrainDecision(1, mockObservation, mockDecision, 1200, 101);
      const display4 = formatBrainDecision(2, mockObservation, mockDecision, 1400, 101);

      manager.recordDecision(display3);
      manager.recordDecision(display4);

      // Callback should not be called again after unsubscribe
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
