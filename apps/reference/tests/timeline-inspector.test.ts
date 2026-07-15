/**
 * Timeline Inspector Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TimelineInspector } from '../src/timeline-inspector.ts';
import type { ExecutionTrace } from '../src/execution-trace.ts';
import type { RuntimeMetrics } from '../src/runtime-metrics.ts';

describe('TimelineInspector', () => {
  let inspector: TimelineInspector;
  let mockTrace: ExecutionTrace;
  let mockMetrics: RuntimeMetrics;

  beforeEach(() => {
    inspector = new TimelineInspector();

    mockTrace = Object.freeze({
      missionId: 'test-mission',
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
          data: { tick: 1 },
        },
        {
          timestamp: Date.now() + 1000,
          tick: 1,
          eventType: 'plan_generated',
          data: { goal: 'move-to-target', planId: 'plan-1', steps: 5 },
        },
        {
          timestamp: Date.now() + 2000,
          tick: 1,
          eventType: 'decision_selected',
          data: {
            command: { action: 'move-east' },
            confidence: 0.95,
            engineType: 'reference',
          },
        },
        {
          timestamp: Date.now() + 3000,
          tick: 1,
          eventType: 'command_executed',
          data: { action: 'move-east', success: true },
        },
        {
          timestamp: Date.now() + 4000,
          tick: 2,
          eventType: 'mission_tick',
          data: { tick: 2 },
        },
      ],
    });

    mockMetrics = Object.freeze({
      missionId: 'test-mission',
      status: 'completed',
      missionDurationMs: 5000,
      initializationTimeMs: 100,
      shutdownTimeMs: 50,
      executionTimeMs: 4850,
      totalEvents: 5,
      lifecycleEvents: 2,
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
    });

    inspector.initialize(mockTrace, mockMetrics);
  });

  describe('Tick Selection', () => {
    it('should inspect a specific tick', () => {
      const inspection = inspector.inspectTick(1);
      expect(inspection).toBeDefined();
      expect(inspection?.tick).toBe(1);
    });

    it('should extract planning information', () => {
      const inspection = inspector.inspectTick(1);
      expect(inspection?.planning).toBeDefined();
      expect(inspection?.planning?.goal).toBe('move-to-target');
      expect(inspection?.planning?.steps).toBe(5);
    });

    it('should extract decision information', () => {
      const inspection = inspector.inspectTick(1);
      expect(inspection?.decision).toBeDefined();
      expect(inspection?.decision?.command).toBe('move-east');
      expect(inspection?.decision?.confidence).toBe(0.95);
    });

    it('should extract execution information', () => {
      const inspection = inspector.inspectTick(1);
      expect(inspection?.execution).toBeDefined();
      expect(inspection?.execution?.success).toBe(true);
      expect(inspection?.execution?.commandAction).toBe('move-east');
    });

    it('should return null for non-existent tick', () => {
      const inspection = inspector.inspectTick(999);
      expect(inspection).toBeNull();
    });

    it('should cache inspections', () => {
      const first = inspector.inspectTick(1);
      const second = inspector.inspectTick(1);
      expect(first).toBe(second); // Same object reference
    });
  });

  describe('Timeline Navigation', () => {
    it('should get all ticks', () => {
      const ticks = inspector.getAllTicks();
      expect(ticks).toContain(1);
      expect(ticks).toContain(2);
      expect(ticks.length).toBe(2);
    });

    it('should sort ticks chronologically', () => {
      const ticks = inspector.getAllTicks();
      expect(ticks[0]).toBe(1);
      expect(ticks[1]).toBe(2);
    });
  });

  describe('Timeline Search', () => {
    it('should search by event type', () => {
      const results = inspector.search('decision');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].tick).toBe(1);
    });

    it('should search by goal name', () => {
      const results = inspector.search('move-to-target');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search by command', () => {
      const results = inspector.search('move-east');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty for no matches', () => {
      const results = inspector.search('nonexistent-query');
      expect(results).toEqual([]);
    });
  });

  describe('Timeline Filtering', () => {
    it('should filter by event type', () => {
      const ticks = inspector.filter({
        types: ['decision_selected'],
      });
      expect(ticks.length).toBeGreaterThan(0);
    });

    it('should filter by tick range', () => {
      const ticks = inspector.filter({
        fromTick: 1,
        toTick: 1,
      });
      expect(ticks).toContain(1);
      expect(ticks).not.toContain(2);
    });

    it('should combine filters', () => {
      const ticks = inspector.filter({
        types: ['mission_tick'],
        fromTick: 1,
        toTick: 1,
      });
      expect(ticks.length).toBeGreaterThan(0);
    });
  });

  describe('Timeline Comparison', () => {
    it('should compare two ticks', () => {
      const comparison = inspector.compare(1, 2);
      expect(comparison).toBeDefined();
      expect(comparison.tickA).toBe(1);
      expect(comparison.tickB).toBe(2);
    });

    it('should detect observation differences', () => {
      const comparison = inspector.compare(1, 2);
      expect(comparison.observationDiff).toBeDefined();
    });

    it('should detect decision differences', () => {
      const comparison = inspector.compare(1, 2);
      expect(comparison.decisionDiff).toBeDefined();
    });

    it('should return null details for non-existent ticks', () => {
      const comparison = inspector.compare(999, 888);
      expect(comparison.observationDiff.details).toBe('Missing data');
    });
  });

  describe('Export', () => {
    it('should export as JSON', () => {
      const json = inspector.exportAsJson();
      expect(json).toBeDefined();
      expect(json).toContain('test-mission');
      expect(json).toContain('completed');

      const parsed = JSON.parse(json);
      expect(parsed.missionId).toBe('test-mission');
      expect(parsed.ticks).toBeDefined();
    });

    it('should export as HTML', () => {
      const html = inspector.exportAsHtml();
      expect(html).toBeDefined();
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('test-mission');
      expect(html).toContain('Tick 1');
      expect(html).toContain('move-to-target');
    });

    it('exported HTML should be standalone', () => {
      const html = inspector.exportAsHtml();
      // Verify all CSS is inline (no external resources)
      expect(html).toContain('<style>');
      expect(html).not.toContain('<link rel="stylesheet"');
      // Verify all JS is inline (no external scripts)
      expect(html).not.toContain('<script src=');
    });
  });

  describe('Immutability', () => {
    it('should return frozen tick inspections', () => {
      const inspection = inspector.inspectTick(1);
      expect(() => {
        (inspection as any).tick = 999;
      }).toThrow();
    });

    it('should return frozen comparisons', () => {
      const comparison = inspector.compare(1, 2);
      expect(() => {
        (comparison as any).tickA = 999;
      }).toThrow();
    });
  });
});
