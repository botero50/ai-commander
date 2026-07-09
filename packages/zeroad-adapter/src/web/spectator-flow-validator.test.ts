import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpectatorFlowValidator, createStandardSpectatorFlow } from './spectator-flow-validator.js';

describe('SpectatorFlowValidator', () => {
  let validator: SpectatorFlowValidator;

  beforeEach(() => {
    validator = new SpectatorFlowValidator();
  });

  describe('Step Execution', () => {
    it('should execute passing step successfully', async () => {
      const steps = [
        {
          name: 'Test Step',
          description: 'A test step',
          action: async () => {
            // Pass immediately
          },
          validateResult: async () => true,
        },
      ];

      const report = await validator.validateFullFlow(steps);

      expect(report.totalSteps).toBe(1);
      expect(report.passedSteps).toBe(1);
      expect(report.failedSteps).toBe(0);
      expect(report.results[0].passed).toBe(true);
    });

    it('should handle failing step', async () => {
      const steps = [
        {
          name: 'Failing Step',
          description: 'A step that fails',
          action: async () => {
            throw new Error('Step failed');
          },
          validateResult: async () => false,
        },
      ];

      const report = await validator.validateFullFlow(steps);

      expect(report.passedSteps).toBe(0);
      expect(report.failedSteps).toBe(1);
      expect(report.results[0].passed).toBe(false);
      expect(report.results[0].error).toContain('Step failed');
    });

    it('should handle optional steps', async () => {
      const steps = [
        {
          name: 'Optional Step',
          description: 'An optional step',
          action: async () => {
            throw new Error('Optional step failed');
          },
          validateResult: async () => false,
          isOptional: true,
        },
      ];

      const report = await validator.validateFullFlow(steps);

      expect(report.skippedSteps).toBe(1);
      expect(report.failedSteps).toBe(0);
    });

    it('should measure step duration', async () => {
      const steps = [
        {
          name: 'Slow Step',
          description: 'A slow step',
          action: async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
          },
          validateResult: async () => true,
        },
      ];

      const report = await validator.validateFullFlow(steps);

      expect(report.results[0].duration).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Multiple Steps', () => {
    it('should execute multiple steps in order', async () => {
      const executionOrder: string[] = [];

      const steps = [
        {
          name: 'Step 1',
          description: 'First step',
          action: async () => executionOrder.push('1'),
          validateResult: async () => true,
        },
        {
          name: 'Step 2',
          description: 'Second step',
          action: async () => executionOrder.push('2'),
          validateResult: async () => true,
        },
        {
          name: 'Step 3',
          description: 'Third step',
          action: async () => executionOrder.push('3'),
          validateResult: async () => true,
        },
      ];

      await validator.validateFullFlow(steps);

      expect(executionOrder).toEqual(['1', '2', '3']);
    });

    it('should continue after individual step failure', async () => {
      const executionOrder: string[] = [];

      const steps = [
        {
          name: 'Step 1',
          description: 'First step',
          action: async () => executionOrder.push('1'),
          validateResult: async () => true,
        },
        {
          name: 'Step 2',
          description: 'Failing step',
          action: async () => executionOrder.push('2'),
          validateResult: async () => false,
        },
        {
          name: 'Step 3',
          description: 'Third step',
          action: async () => executionOrder.push('3'),
          validateResult: async () => true,
        },
      ];

      await validator.validateFullFlow(steps);

      expect(executionOrder).toEqual(['1', '2', '3']);
      expect(validator['results'].length).toBe(3);
    });
  });

  describe('Issue Recording', () => {
    it('should record critical issues', async () => {
      validator.recordIssue('critical', 'Critical issue');
      validator.recordIssue('critical', 'Another critical');

      const steps = [
        {
          name: 'Test',
          description: 'Test',
          action: async () => {},
          validateResult: async () => true,
        },
      ];

      const report = await validator.validateFullFlow(steps);

      expect((report as any).issues).toHaveLength(2);
      expect((report as any).issues[0].severity).toBe('critical');
    });

    it('should record issues with different severities', async () => {
      validator.recordIssue('critical', 'Critical');
      validator.recordIssue('high', 'High');
      validator.recordIssue('medium', 'Medium');
      validator.recordIssue('low', 'Low');

      const steps = [
        {
          name: 'Test',
          description: 'Test',
          action: async () => {},
          validateResult: async () => true,
        },
      ];

      const report = await validator.validateFullFlow(steps);

      expect(report.issues).toHaveLength(4);
      expect(report.issues.map((i) => i.severity)).toEqual(['critical', 'high', 'medium', 'low']);
    });
  });

  describe('Recommendations', () => {
    it('should record recommendations', async () => {
      validator.addRecommendation('Fix issue A');
      validator.addRecommendation('Improve performance');

      const steps = [
        {
          name: 'Test',
          description: 'Test',
          action: async () => {},
          validateResult: async () => true,
        },
      ];

      const report = await validator.validateFullFlow(steps);

      expect(report.recommendations).toHaveLength(2);
      expect(report.recommendations[0]).toBe('Fix issue A');
    });
  });

  describe('Report Generation', () => {
    it('should generate summary for passing flow', async () => {
      const steps = [
        {
          name: 'Step 1',
          description: 'First step',
          action: async () => {},
          validateResult: async () => true,
        },
        {
          name: 'Step 2',
          description: 'Second step',
          action: async () => {},
          validateResult: async () => true,
        },
      ];

      const report = await validator.validateFullFlow(steps);
      const summary = validator.getSummary(report);

      expect(summary).toContain('✅ PASS');
      expect(summary).toContain('Passed: 2');
      expect(summary).toContain('Failed: 0');
    });

    it('should generate summary for failing flow', async () => {
      const steps = [
        {
          name: 'Failing Step',
          description: 'A failing step',
          action: async () => {
            throw new Error('Test error');
          },
          validateResult: async () => false,
        },
      ];

      const report = await validator.validateFullFlow(steps);
      const summary = validator.getSummary(report);

      expect(summary).toContain('❌ FAIL');
      expect(summary).toContain('Failed: 1');
      expect(summary).toContain('FAILED STEPS');
    });

    it('should include issues in summary', async () => {
      validator.recordIssue('critical', 'Test issue');

      const steps = [
        {
          name: 'Test',
          description: 'Test',
          action: async () => {},
          validateResult: async () => true,
        },
      ];

      const report = await validator.validateFullFlow(steps);
      const summary = validator.getSummary(report);

      expect(summary).toContain('ISSUES:');
      expect(summary).toContain('CRITICAL:');
      expect(summary).toContain('Test issue');
    });

    it('should include recommendations in summary', async () => {
      validator.addRecommendation('Test recommendation');

      const steps = [
        {
          name: 'Test',
          description: 'Test',
          action: async () => {},
          validateResult: async () => true,
        },
      ];

      const report = await validator.validateFullFlow(steps);
      const summary = validator.getSummary(report);

      expect(summary).toContain('RECOMMENDATIONS:');
      expect(summary).toContain('Test recommendation');
    });
  });

  describe('Standard Spectator Flow', () => {
    it('should create standard flow with all steps', () => {
      const flow = createStandardSpectatorFlow();

      expect(flow.length).toBeGreaterThan(10);
      expect(flow.map((s) => s.name)).toContain('Initialize Application');
      expect(flow.map((s) => s.name)).toContain('Connect to Match Data');
      expect(flow.map((s) => s.name)).toContain('Load Match Metadata');
      expect(flow.map((s) => s.name)).toContain('Load Game State');
      expect(flow.map((s) => s.name)).toContain('Render HUD');
    });

    it('should have unique step names', () => {
      const flow = createStandardSpectatorFlow();
      const names = flow.map((s) => s.name);

      expect(new Set(names).size).toBe(names.length);
    });

    it('should have descriptions for all steps', () => {
      const flow = createStandardSpectatorFlow();

      flow.forEach((step) => {
        expect(step.description).toBeTruthy();
        expect(step.description.length).toBeGreaterThan(0);
      });
    });

    it('should have valid action and validator for all steps', () => {
      const flow = createStandardSpectatorFlow();

      flow.forEach((step) => {
        expect(typeof step.action).toBe('function');
        expect(typeof step.validateResult).toBe('function');
      });
    });
  });

  describe('Flow Timing', () => {
    it('should track total flow duration', async () => {
      const steps = [
        {
          name: 'Step 1',
          description: 'First',
          action: async () => await new Promise((resolve) => setTimeout(resolve, 50)),
          validateResult: async () => true,
        },
        {
          name: 'Step 2',
          description: 'Second',
          action: async () => await new Promise((resolve) => setTimeout(resolve, 50)),
          validateResult: async () => true,
        },
      ];

      const report = await validator.validateFullFlow(steps);

      expect(report.totalDuration).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle sync errors in action', async () => {
      const steps = [
        {
          name: 'Sync Error Step',
          description: 'Step with sync error',
          action: async () => {
            throw new Error('Sync error');
          },
          validateResult: async () => false,
        },
      ];

      const report = await validator.validateFullFlow(steps);

      expect(report.failedSteps).toBe(1);
      expect(report.results[0].error).toContain('Sync error');
    });

    it('should handle async errors in validation', async () => {
      const steps = [
        {
          name: 'Async Error Step',
          description: 'Step with async validation error',
          action: async () => {},
          validateResult: async () => {
            throw new Error('Validation error');
          },
        },
      ];

      const report = await validator.validateFullFlow(steps);

      expect(report.failedSteps).toBe(1);
      expect(report.results[0].error).toContain('Validation error');
    });

    it('should handle string errors', async () => {
      const steps = [
        {
          name: 'String Error Step',
          description: 'Step that throws string',
          action: async () => {
            // eslint-disable-next-line no-throw-literal
            throw 'String error';
          },
          validateResult: async () => false,
        },
      ];

      const report = await validator.validateFullFlow(steps);

      expect(report.failedSteps).toBe(1);
      expect(report.results[0].error).toContain('String error');
    });
  });
});
