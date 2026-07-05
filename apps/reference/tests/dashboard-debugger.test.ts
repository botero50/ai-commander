/**
 * Dashboard Debugger Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DashboardDebugger, formatTickInspection } from '../src/dashboard-debugger.js';
import type { ExecutionTrace } from '../src/execution-trace.js';
import type { RuntimeMetrics } from '../src/runtime-metrics.js';

describe('DashboardDebugger', () => {
  let debugger_: DashboardDebugger;
  let mockTrace: ExecutionTrace;
  let mockMetrics: RuntimeMetrics;

  beforeEach(() => {
    debugger_ = new DashboardDebugger();

    mockTrace = Object.freeze({
      missionId: 'debug-test',
      targetX: 3,
      targetY: 2,
      startTime: Date.now(),
      endTime: Date.now() + 5000,
      status: 'completed',
      events: [
        {
          timestamp: Date.now(),
          tick: 1,
          eventType: 'mission_tick',
          data: {},
        },
        {
          timestamp: Date.now() + 1000,
          tick: 1,
          eventType: 'plan_generated',
          data: { goal: 'move-to-3-2', planId: 'plan-1', steps: 5 },
        },
        {
          timestamp: Date.now() + 2000,
          tick: 1,
          eventType: 'decision_selected',
          data: { command: { action: 'move-east' }, confidence: 0.95 },
        },
        {
          timestamp: Date.now() + 3000,
          tick: 1,
          eventType: 'command_executed',
          data: { action: 'move-east' },
        },
        {
          timestamp: Date.now() + 4000,
          tick: 2,
          eventType: 'mission_tick',
          data: {},
        },
      ],
    });

    mockMetrics = {
      missionId: 'debug-test',
      status: 'completed',
      missionDurationMs: 5000,
      initializationTimeMs: 100,
      shutdownTimeMs: 50,
      executionTimeMs: 4850,
      totalEvents: 5,
      lifecycleEvents: 1,
      reasoningEvents: 2,
      executionEvents: 1,
      totalTicks: 2,
      plannerInvocations: 1,
      plansGenerated: 1,
      planErrors: 0,
      decisionEngineInvocations: 1,
      decisionsSelected: 1,
      decisionErrors: 0,
      commandsExecuted: 1,
      successfulCommands: 1,
      failedCommands: 0,
      commandSuccessRate: 1.0,
      worldStateUpdates: 2,
      goalsCreated: 1,
      averageTickDurationMs: 2500,
      averageCommandsPerTick: 0.5,
      averageDecisionsPerTick: 0.5,
    } as RuntimeMetrics;

    debugger_.initialize(mockTrace, mockMetrics);
  });

  describe('Tick Selection', () => {
    it('should start in live mode', () => {
      const state = debugger_.getState();
      expect(state.mode).toBe('live');
    });

    it('should switch to inspection mode when selecting a tick', () => {
      debugger_.selectTick(1);
      const state = debugger_.getState();
      expect(state.mode).toBe('inspection');
      expect(state.selectedTick).toBe(1);
    });

    it('should disable auto-follow when selecting a tick', () => {
      debugger_.selectTick(1);
      const state = debugger_.getState();
      expect(state.autoFollow).toBe(false);
    });

    it('should get inspection for selected tick', () => {
      debugger_.selectTick(1);
      const inspection = debugger_.getSelectedTickInspection();
      expect(inspection).toBeDefined();
      expect(inspection?.tick).toBe(1);
      expect(inspection?.planning?.goal).toBe('move-to-3-2');
    });
  });

  describe('Tick Navigation', () => {
    it('should navigate to next tick', () => {
      debugger_.selectTick(1);
      debugger_.nextTick();
      const state = debugger_.getState();
      expect(state.selectedTick).toBe(2);
    });

    it('should navigate to previous tick', () => {
      debugger_.selectTick(2);
      debugger_.previousTick();
      const state = debugger_.getState();
      expect(state.selectedTick).toBe(1);
    });

    it('should jump to first tick', () => {
      debugger_.firstTick();
      const state = debugger_.getState();
      expect(state.selectedTick).toBe(1);
    });

    it('should jump to latest tick', () => {
      debugger_.latestTick();
      const state = debugger_.getState();
      expect(state.selectedTick).toBe(2);
    });

    it('should jump to specific tick', () => {
      debugger_.jumpToTick(2);
      const state = debugger_.getState();
      expect(state.selectedTick).toBe(2);
    });

    it('should not navigate past last tick', () => {
      debugger_.latestTick();
      debugger_.nextTick();
      const state = debugger_.getState();
      expect(state.selectedTick).toBe(2); // Still at last
    });
  });

  describe('Tick Comparison', () => {
    it('should switch to comparison mode', () => {
      debugger_.compareTicks(1, 2);
      const state = debugger_.getState();
      expect(state.mode).toBe('comparison');
    });

    it('should set comparison ticks', () => {
      debugger_.compareTicks(1, 2);
      const state = debugger_.getState();
      expect(state.comparisonTickA).toBe(1);
      expect(state.comparisonTickB).toBe(2);
    });

    it('should get comparison results', () => {
      debugger_.compareTicks(1, 2);
      const comparison = debugger_.getComparison();
      expect(comparison).toBeDefined();
      expect(comparison?.tickA).toBe(1);
      expect(comparison?.tickB).toBe(2);
    });

    it('should disable auto-follow in comparison mode', () => {
      debugger_.compareTicks(1, 2);
      const state = debugger_.getState();
      expect(state.autoFollow).toBe(false);
    });
  });

  describe('Resume Live Execution', () => {
    it('should return to live mode', () => {
      debugger_.selectTick(1);
      debugger_.resumeLive();
      const state = debugger_.getState();
      expect(state.mode).toBe('live');
    });

    it('should clear selection', () => {
      debugger_.selectTick(1);
      debugger_.resumeLive();
      const state = debugger_.getState();
      expect(state.selectedTick).toBeNull();
    });

    it('should re-enable auto-follow', () => {
      debugger_.selectTick(1);
      debugger_.resumeLive();
      const state = debugger_.getState();
      expect(state.autoFollow).toBe(true);
    });

    it('should clear comparison', () => {
      debugger_.compareTicks(1, 2);
      debugger_.resumeLive();
      const state = debugger_.getState();
      expect(state.comparisonTickA).toBeNull();
      expect(state.comparisonTickB).toBeNull();
    });
  });

  describe('State Change Events', () => {
    it('should notify on state changes', () => {
      let changedState = null;
      const unsubscribe = debugger_.onStateChange((state) => {
        changedState = state;
      });

      debugger_.selectTick(1);
      expect(changedState).toBeDefined();
      expect((changedState as any)?.selectedTick).toBe(1);

      unsubscribe();
    });

    it('should support multiple listeners', () => {
      let count = 0;
      const unsubscribe1 = debugger_.onStateChange(() => {
        count++;
      });
      const unsubscribe2 = debugger_.onStateChange(() => {
        count++;
      });

      debugger_.selectTick(1);
      expect(count).toBe(2);

      unsubscribe1();
      unsubscribe2();
    });

    it('should unsubscribe correctly', () => {
      let count = 0;
      const unsubscribe = debugger_.onStateChange(() => {
        count++;
      });

      debugger_.selectTick(1);
      expect(count).toBe(1);

      unsubscribe();
      debugger_.selectTick(2);
      expect(count).toBe(1); // No additional call
    });
  });

  describe('Export', () => {
    it('should export mission as JSON', () => {
      const json = debugger_.exportJson();
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.missionId).toBe('debug-test');
      expect(parsed.ticks).toBeDefined();
    });

    it('should export mission as offline HTML', () => {
      const html = debugger_.exportHtml();
      expect(html).toBeDefined();
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('debug-test');
      expect(html).toContain('Tick 1');
    });

    it('exported HTML should be viewable offline', () => {
      const html = debugger_.exportHtml();
      // All CSS and JS should be inline
      expect(html).toContain('<style>');
      expect(html).not.toContain('<link rel');
      expect(html).not.toContain('<script src');
    });
  });

  describe('Format Tick Inspection', () => {
    it('should format inspection as readable text', () => {
      debugger_.selectTick(1);
      const inspection = debugger_.getSelectedTickInspection();
      if (!inspection) throw new Error('No inspection');

      const formatted = formatTickInspection(inspection);
      expect(formatted).toContain('TICK 1');
      expect(formatted).toContain('move-to-3-2');
      expect(formatted).toContain('move-east');
    });
  });
});
