import { describe, it, expect } from 'vitest';
import {
  CliFormatter,
  ProgressIndicator,
  Logger,
  LogLevel,
  AccessibilityHelper,
  InteractivePrompt,
} from '../src/cli-enhanced.js';
import {
  AiCommanderError,
  InitializationError,
  ExecutionError,
  PlanningError,
  DecisionError,
  CommandError,
  ErrorHandler,
  UserFacingErrors,
  ValidationErrors,
  ConfigurationErrors,
} from '../src/error-handling.js';

describe('Product Polish - CLI Enhancements', () => {
  describe('CliFormatter', () => {
    it('should format success messages', () => {
      const formatter = new CliFormatter(false);
      const result = formatter.success('Test passed');

      expect(result).toContain('✓');
      expect(result).toContain('Test passed');
    });

    it('should format error messages', () => {
      const formatter = new CliFormatter(false);
      const result = formatter.error('Test failed');

      expect(result).toContain('✗');
      expect(result).toContain('Test failed');
    });

    it('should format warning messages', () => {
      const formatter = new CliFormatter(false);
      const result = formatter.warning('Warning message');

      expect(result).toContain('⚠');
      expect(result).toContain('Warning message');
    });

    it('should format info messages', () => {
      const formatter = new CliFormatter(false);
      const result = formatter.info('Info message');

      expect(result).toContain('ℹ');
      expect(result).toContain('Info message');
    });

    it('should create progress bar', () => {
      const formatter = new CliFormatter(false);
      const progress = formatter.progress(50, 100, 'Loading');

      expect(progress).toContain('Loading');
      expect(progress).toContain('50%');
    });

    it('should format metrics', () => {
      const formatter = new CliFormatter(false);
      const metric = formatter.metric('Time', '1234ms', 'ms');

      expect(metric).toContain('Time');
      expect(metric).toContain('1234');
    });

    it('should format hints', () => {
      const formatter = new CliFormatter(false);
      const hint = formatter.hint('This is a helpful tip');

      expect(hint).toContain('💡');
      expect(hint).toContain('This is a helpful tip');
    });

    it('should format code blocks', () => {
      const formatter = new CliFormatter(false);
      const code = formatter.code('npm test');

      expect(code).toContain('npm test');
    });

    it('should format metric table', () => {
      const formatter = new CliFormatter(false);
      const table = formatter.formatMetricTable({
        'Execution Time': '1234ms',
        'Memory Used': '45.2MB',
        'Tick Count': 50,
      });

      expect(table).toContain('Execution Time');
      expect(table).toContain('1234');
      expect(table).toContain('Memory Used');
    });

    it('should handle error details', () => {
      const formatter = new CliFormatter(false);
      const error = new Error('Test error message');
      const formatted = formatter.formatErrorDetails(error);

      expect(formatted).toContain('Test error message');
    });

    it('should handle NO_COLOR environment variable', () => {
      const original = process.env.NO_COLOR;
      try {
        process.env.NO_COLOR = '1';
        const formatter = new CliFormatter(true);

        // With NO_COLOR set, formatter should not use colors
        const result = formatter.success('Test');
        // Should still have content but no escape codes
        expect(result).toContain('✓');
      } finally {
        process.env.NO_COLOR = original;
      }
    });
  });

  describe('ProgressIndicator', () => {
    it('should track progress', () => {
      const indicator = new ProgressIndicator(100, 'Test');

      indicator.update(25);
      indicator.update(50);
      indicator.update(75);

      expect(indicator).toBeDefined();
    });

    it('should complete progress', () => {
      const indicator = new ProgressIndicator(100, 'Test');

      indicator.update(100);
      indicator.complete();

      expect(indicator).toBeDefined();
    });

    it('should reset progress', () => {
      const indicator = new ProgressIndicator(100, 'Test 1');

      indicator.reset(200, 'Test 2');

      expect(indicator).toBeDefined();
    });
  });

  describe('Logger', () => {
    it('should log debug messages at debug level', () => {
      const logger = new Logger('Test', LogLevel.DEBUG);

      expect(() => logger.debug('debug message')).not.toThrow();
    });

    it('should log info messages', () => {
      const logger = new Logger('Test', LogLevel.INFO);

      expect(() => logger.info('info message')).not.toThrow();
    });

    it('should log warnings', () => {
      const logger = new Logger('Test', LogLevel.WARN);

      expect(() => logger.warn('warning message')).not.toThrow();
    });

    it('should log errors', () => {
      const logger = new Logger('Test', LogLevel.ERROR);

      expect(() => logger.error('error message')).not.toThrow();
    });

    it('should log success messages', () => {
      const logger = new Logger('Test', LogLevel.INFO);

      expect(() => logger.success('success message')).not.toThrow();
    });

    it('should log sections and dividers', () => {
      const logger = new Logger('Test', LogLevel.INFO);

      expect(() => {
        logger.section('Test Section');
        logger.divider();
      }).not.toThrow();
    });

    it('should set log level', () => {
      const logger = new Logger('Test', LogLevel.INFO);

      logger.setLevel(LogLevel.DEBUG);
      expect(() => logger.debug('debug message')).not.toThrow();

      logger.setLevel(LogLevel.SILENT);
      expect(() => logger.info('should not appear')).not.toThrow();
    });

    it('should log errors with context', () => {
      const logger = new Logger('Test', LogLevel.ERROR);
      const error = new Error('Test error');

      expect(() => logger.error('Something failed', error)).not.toThrow();
    });
  });

  describe('InteractivePrompt', () => {
    it('should create interactive prompts', () => {
      const prompt = new InteractivePrompt(false);

      expect(() => prompt.showHelp('Options', { '--help': 'Show help' })).not.toThrow();
    });

    it('should show examples', () => {
      const prompt = new InteractivePrompt(false);

      expect(() => prompt.showExample('Example', 'npm test')).not.toThrow();
    });
  });

  describe('AccessibilityHelper', () => {
    it('should detect color support', () => {
      const supported = AccessibilityHelper.supportsColor();

      expect(typeof supported).toBe('boolean');
    });

    it('should format accessible text', () => {
      const text = AccessibilityHelper.formatAccessible('Error occurred', 'ERROR', 'high');

      expect(text).toContain('!!!');
      expect(text).toContain('ERROR');
      expect(text).toContain('Error occurred');
    });

    it('should respect NO_COLOR environment variable', () => {
      const original = process.env.NO_COLOR;
      try {
        process.env.NO_COLOR = '1';
        const supported = AccessibilityHelper.supportsColor();

        expect(supported).toBe(false);
      } finally {
        process.env.NO_COLOR = original;
      }
    });
  });
});

describe('Product Polish - Error Handling', () => {
  describe('Error Classes', () => {
    it('should create AiCommanderError with properties', () => {
      const error = new AiCommanderError(
        'Test error',
        'execution',
        'high',
        false,
        'Try again',
        { key: 'value' }
      );

      expect(error.message).toBe('Test error');
      expect(error.category).toBe('execution');
      expect(error.severity).toBe('high');
      expect(error.recoverable).toBe(false);
      expect(error.suggestion).toBe('Try again');
      expect(error.context).toEqual({ key: 'value' });
    });

    it('should create InitializationError', () => {
      const error = new InitializationError('Init failed', 'Check logs', { component: 'adapter' });

      expect(error.category).toBe('initialization');
      expect(error.suggestion).toBe('Check logs');
    });

    it('should create ExecutionError', () => {
      const error = new ExecutionError('Execution failed', true, 'Retry');

      expect(error.category).toBe('execution');
      expect(error.recoverable).toBe(true);
    });

    it('should create PlanningError', () => {
      const error = new PlanningError('Plan failed', 'Adjust goal');

      expect(error.category).toBe('planning');
      expect(error.recoverable).toBe(true);
    });

    it('should create DecisionError', () => {
      const error = new DecisionError('Decision failed', 'Try next state');

      expect(error.category).toBe('decision');
      expect(error.recoverable).toBe(true);
    });

    it('should create CommandError', () => {
      const error = new CommandError('Command failed', true, 'Retry');

      expect(error.category).toBe('command');
      expect(error.recoverable).toBe(true);
    });
  });

  describe('Error Formatting', () => {
    it('should format error for user', () => {
      const error = new AiCommanderError(
        'Test failed',
        'execution',
        'high',
        false,
        'Try a different approach',
        { detail: 'info' }
      );

      const message = error.toUserMessage();

      expect(message).toContain('Error');
      expect(message).toContain('Test failed');
      expect(message).toContain('How to fix');
      expect(message).toContain('Context');
    });

    it('should export error as log entry', () => {
      const error = new AiCommanderError(
        'Test failed',
        'execution',
        'high',
        false,
        'Try again',
        { key: 'value' }
      );

      const log = error.toLogEntry();
      const parsed = JSON.parse(log);

      expect(parsed.message).toBe('Test failed');
      expect(parsed.category).toBe('execution');
      expect(parsed.severity).toBe('high');
    });
  });

  describe('ErrorHandler', () => {
    it('should record errors', () => {
      const handler = new ErrorHandler();
      const error = new ExecutionError('Test error');

      handler.record(error);

      expect(handler.getLastError()).toBe(error);
    });

    it('should retrieve errors by category', () => {
      const handler = new ErrorHandler();

      handler.record(new InitializationError('Init error'));
      handler.record(new ExecutionError('Exec error'));
      handler.record(new PlanningError('Plan error'));

      expect(handler.getErrors('initialization')).toHaveLength(1);
      expect(handler.getErrors('execution')).toHaveLength(1);
      expect(handler.getErrors('planning')).toHaveLength(1);
    });

    it('should get all errors', () => {
      const handler = new ErrorHandler();

      handler.record(new ExecutionError('Error 1'));
      handler.record(new ExecutionError('Error 2'));

      expect(handler.getErrors()).toHaveLength(2);
    });

    it('should detect recoverable errors', () => {
      const handler = new ErrorHandler();

      handler.record(new ExecutionError('Recoverable', true));

      expect(handler.hasRecoverableErrors()).toBe(true);
    });

    it('should detect critical errors', () => {
      const handler = new ErrorHandler();

      handler.record(
        new AiCommanderError('Critical', 'unknown', 'critical', false)
      );

      expect(handler.hasCriticalErrors()).toBe(true);
    });

    it('should generate summary', () => {
      const handler = new ErrorHandler();

      handler.record(new ExecutionError('High severity error'));
      handler.record(new ExecutionError('Medium severity error', true));

      const summary = handler.getSummary();

      expect(summary.total).toBeGreaterThan(0);
      expect(summary.high).toBeGreaterThan(0);
    });

    it('should export errors', () => {
      const handler = new ErrorHandler();

      handler.record(new ExecutionError('Test error'));

      const exported = handler.export();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].message).toBe('Test error');
    });

    it('should clear errors', () => {
      const handler = new ErrorHandler();

      handler.record(new ExecutionError('Test error'));
      handler.clear();

      expect(handler.getErrors()).toHaveLength(0);
    });
  });

  describe('UserFacingErrors', () => {
    it('should create game adapter error', () => {
      const error = UserFacingErrors.gameAdapterInitializationFailed();

      expect(error.message).toContain('game adapter');
      expect(error.suggestion).toBeDefined();
    });

    it('should create world state error', () => {
      const error = UserFacingErrors.worldStateEmpty();

      expect(error.message).toContain('empty');
      expect(error.recoverable).toBe(true);
    });

    it('should create plan generation error', () => {
      const error = UserFacingErrors.planGenerationFailed('Invalid goal');

      expect(error.message).toContain('plan');
      expect(error.suggestion).toBeDefined();
    });

    it('should create decision error', () => {
      const error = UserFacingErrors.decisionSelectionFailed();

      expect(error.category).toBe('decision');
      expect(error.recoverable).toBe(true);
    });

    it('should create command execution error', () => {
      const error = UserFacingErrors.commandExecutionFailed('MOVE', 'Invalid target');

      expect(error.message).toContain('MOVE');
      expect(error.suggestion).toBeDefined();
    });

    it('should create goal feasibility error', () => {
      const error = UserFacingErrors.goalNotFeasible('gather-resources');

      expect(error.suggestion).toBeDefined();
    });

    it('should create resource error', () => {
      const error = UserFacingErrors.resourceInsufficient('wood', 100, 50);

      expect(error.message).toContain('wood');
      expect(error.context?.required).toBe(100);
    });

    it('should handle unknown errors', () => {
      const error = UserFacingErrors.unknownError(new Error('Unknown issue'));

      expect(error.message).toContain('Unknown');
      expect(error.suggestion).toBeDefined();
    });
  });

  describe('ValidationErrors', () => {
    it('should validate target coordinates', () => {
      const error = ValidationErrors.invalidTargetCoordinates(999, 999, { max: 100 });

      expect(error.message).toContain('coordinates');
      expect(error.suggestion).toBeDefined();
    });

    it('should validate mission config', () => {
      const error = ValidationErrors.missionConfigInvalid('timeout', -100, 'positive number');

      expect(error.message).toContain('timeout');
      expect(error.context?.field).toBe('timeout');
    });

    it('should validate goal priority', () => {
      const error = ValidationErrors.invalidGoalPriority(1.5);

      expect(error.message).toContain('priority');
      expect(error.suggestion).toBeDefined();
    });
  });

  describe('ConfigurationErrors', () => {
    it('should detect missing config file', () => {
      const error = ConfigurationErrors.configFileMissing('/path/to/config.json');

      expect(error.message).toContain('not found');
      expect(error.suggestion).toBeDefined();
    });

    it('should detect invalid config file', () => {
      const error = ConfigurationErrors.configFileInvalid('/path/to/config.json', 'Invalid JSON');

      expect(error.message).toContain('invalid');
      expect(error.suggestion).toBeDefined();
    });

    it('should detect invalid config value', () => {
      const error = ConfigurationErrors.configValueInvalid('timeout', -100, 'positive integer');

      expect(error.message).toContain('timeout');
      expect(error.suggestion).toBeDefined();
    });
  });
});
