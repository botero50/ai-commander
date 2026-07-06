import { describe, it, expect } from 'vitest';
import { CLIInterface, type CLIConfig } from '../src/world/cli-interface.js';

describe('CLI Interface', () => {
  describe('Argument Parsing', () => {
    it('parses format argument', () => {
      const args = ['--format', 'round-robin'];
      const config = CLIInterface.parseArgs(args);

      expect(config.tournamentFormat).toBe('round-robin');
    });

    it('parses models argument', () => {
      const args = ['--models', 'gpt4,claude,gemini'];
      const config = CLIInterface.parseArgs(args);

      expect(config.models).toBeDefined();
      expect(config.models?.length).toBe(3);
    });

    it('parses ticks argument', () => {
      const args = ['--ticks', '20'];
      const config = CLIInterface.parseArgs(args);

      expect(config.matchMaxTicks).toBe(20);
    });

    it('parses output path argument', () => {
      const args = ['--output', './results'];
      const config = CLIInterface.parseArgs(args);

      expect(config.outputPath).toBe('./results');
    });

    it('parses output formats argument', () => {
      const args = ['--formats', 'html,json,csv'];
      const config = CLIInterface.parseArgs(args);

      expect(config.outputFormats).toBeDefined();
      expect(config.outputFormats?.length).toBe(3);
    });

    it('parses verbose flag', () => {
      const args = ['--verbose'];
      const config = CLIInterface.parseArgs(args);

      expect(config.verbose).toBe(true);
    });

    it('parses multiple arguments', () => {
      const args = [
        '--format', 'swiss',
        '--models', 'gpt4,claude',
        '--ticks', '15',
        '--output', './results',
        '--formats', 'html,json',
        '--verbose',
      ];
      const config = CLIInterface.parseArgs(args);

      expect(config.tournamentFormat).toBe('swiss');
      expect(config.models?.length).toBe(2);
      expect(config.matchMaxTicks).toBe(15);
      expect(config.outputPath).toBe('./results');
      expect(config.outputFormats?.length).toBe(2);
      expect(config.verbose).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    it('validates complete config', () => {
      const config: CLIConfig = {
        tournamentFormat: 'round-robin',
        models: [
          { provider: 'builtin', name: 'builtin' },
          { provider: 'builtin', name: 'builtin2' },
        ],
        matchMaxTicks: 10,
        outputFormats: ['json'],
        outputPath: './results',
      };

      const result = CLIInterface.validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('requires tournament format', () => {
      const config: CLIConfig = {
        tournamentFormat: undefined as any,
        models: [
          { provider: 'builtin', name: 'builtin' },
          { provider: 'builtin', name: 'builtin2' },
        ],
        matchMaxTicks: 10,
        outputFormats: ['json'],
        outputPath: './results',
      };

      const result = CLIInterface.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('format'))).toBe(true);
    });

    it('requires at least 2 models', () => {
      const config: CLIConfig = {
        tournamentFormat: 'round-robin',
        models: [{ provider: 'builtin', name: 'builtin' }],
        matchMaxTicks: 10,
        outputFormats: ['json'],
        outputPath: './results',
      };

      const result = CLIInterface.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('models'))).toBe(true);
    });

    it('requires positive ticks', () => {
      const config: CLIConfig = {
        tournamentFormat: 'round-robin',
        models: [
          { provider: 'builtin', name: 'builtin' },
          { provider: 'builtin', name: 'builtin2' },
        ],
        matchMaxTicks: 0,
        outputFormats: ['json'],
        outputPath: './results',
      };

      const result = CLIInterface.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('ticks'))).toBe(true);
    });

    it('requires output path', () => {
      const config: CLIConfig = {
        tournamentFormat: 'round-robin',
        models: [
          { provider: 'builtin', name: 'builtin' },
          { provider: 'builtin', name: 'builtin2' },
        ],
        matchMaxTicks: 10,
        outputFormats: ['json'],
        outputPath: '',
      };

      const result = CLIInterface.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('path'))).toBe(true);
    });

    it('requires output formats', () => {
      const config: CLIConfig = {
        tournamentFormat: 'round-robin',
        models: [
          { provider: 'builtin', name: 'builtin' },
          { provider: 'builtin', name: 'builtin2' },
        ],
        matchMaxTicks: 10,
        outputFormats: [],
        outputPath: './results',
      };

      const result = CLIInterface.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('format'))).toBe(true);
    });
  });

  describe('Help and Documentation', () => {
    it('provides usage instructions', () => {
      const usage = CLIInterface.getUsage();

      expect(usage).toContain('USAGE');
      expect(usage).toContain('OPTIONS');
      expect(usage).toContain('EXAMPLES');
      expect(usage).toContain('--format');
      expect(usage).toContain('--models');
    });

    it('usage includes all options', () => {
      const usage = CLIInterface.getUsage();

      expect(usage).toContain('--ticks');
      expect(usage).toContain('--output');
      expect(usage).toContain('--formats');
      expect(usage).toContain('--verbose');
    });

    it('provides example configuration', () => {
      const example = CLIInterface.getExampleConfig();

      expect(example).toContain('tournament');
      expect(example).toContain('models');
      expect(example).toContain('output');
      expect(example).toContain('provider');
    });

    it('example includes multiple providers', () => {
      const example = CLIInterface.getExampleConfig();

      expect(example).toContain('openai');
      expect(example).toContain('claude');
      expect(example).toContain('gemini');
      expect(example).toContain('ollama');
    });

    it('provides model setup guide', () => {
      const guide = CLIInterface.getModelSetupGuide();

      expect(guide).toContain('OpenAI');
      expect(guide).toContain('Claude');
      expect(guide).toContain('Gemini');
      expect(guide).toContain('Ollama');
    });
  });

  describe('Output Formatting', () => {
    it('formats successful result', () => {
      const result = {
        success: true,
        message: 'Tournament completed',
        outputFiles: ['results.json', 'results.html'],
      };

      const output = CLIInterface.formatOutput(result);

      expect(output).toContain('✓');
      expect(output).toContain('Tournament completed');
      expect(output).toContain('results.json');
      expect(output).toContain('results.html');
    });

    it('formats error result', () => {
      const result = {
        success: false,
        message: 'Tournament failed',
        errorDetails: 'API key not found',
      };

      const output = CLIInterface.formatOutput(result, false);

      expect(output).toContain('✗');
      expect(output).toContain('Tournament failed');
    });

    it('includes error details in verbose mode', () => {
      const result = {
        success: false,
        message: 'Tournament failed',
        errorDetails: 'API key not found',
      };

      const output = CLIInterface.formatOutput(result, true);

      expect(output).toContain('Details');
      expect(output).toContain('API key not found');
    });

    it('omits error details in non-verbose mode', () => {
      const result = {
        success: false,
        message: 'Tournament failed',
        errorDetails: 'Secret error details',
      };

      const output = CLIInterface.formatOutput(result, false);

      expect(output).not.toContain('Secret error details');
    });
  });

  describe('Progress Reporting', () => {
    it('creates progress reporter', () => {
      const reporter = CLIInterface.createProgressReporter(100, 'Testing');

      expect(reporter.start).toBeDefined();
      expect(reporter.update).toBeDefined();
      expect(reporter.finish).toBeDefined();
    });

    it('progress reporter updates correctly', () => {
      const reporter = CLIInterface.createProgressReporter(100);

      expect(() => {
        reporter.start();
        reporter.update(50);
        reporter.finish();
      }).not.toThrow();
    });
  });

  describe('Table Formatting', () => {
    it('formats data as table', () => {
      const data = [
        { Model: 'GPT-4', WinRate: '0.75', Cost: '0.05' },
        { Model: 'Claude', WinRate: '0.70', Cost: '0.03' },
      ];

      const table = CLIInterface.formatTable(data, ['Model', 'WinRate', 'Cost']);

      expect(table).toContain('GPT-4');
      expect(table).toContain('Claude');
      expect(table).toContain('0.75');
      expect(table).toContain('0.70');
    });

    it('handles empty data', () => {
      const table = CLIInterface.formatTable([], ['Col1', 'Col2']);

      expect(table).toBe('No data');
    });

    it('formats header row', () => {
      const data = [{ Name: 'Test', Value: 1 }];
      const table = CLIInterface.formatTable(data, ['Name', 'Value']);

      expect(table).toContain('Name');
      expect(table).toContain('Value');
    });

    it('pads columns appropriately', () => {
      const data = [{ Short: 'A', LongColumnName: 'B' }];
      const table = CLIInterface.formatTable(data, ['Short', 'LongColumnName']);

      expect(table).toBeDefined();
      expect(table.length).toBeGreaterThan(0);
    });
  });

  describe('Model Configuration', () => {
    it('supports builtin provider', () => {
      const config: CLIConfig = {
        tournamentFormat: 'round-robin',
        models: [
          { provider: 'builtin', name: 'builtin' },
          { provider: 'builtin', name: 'builtin2' },
        ],
        matchMaxTicks: 10,
        outputFormats: ['json'],
        outputPath: './results',
      };

      const result = CLIInterface.validateConfig(config);
      expect(result.valid).toBe(true);
    });

    it('supports multiple providers in same tournament', () => {
      const config: CLIConfig = {
        tournamentFormat: 'round-robin',
        models: [
          { provider: 'builtin', name: 'builtin' },
          { provider: 'openai', name: 'gpt4', model: 'gpt-4', apiKey: 'key' },
          { provider: 'claude', name: 'claude', model: 'claude-3-sonnet', apiKey: 'key' },
          { provider: 'gemini', name: 'gemini', model: 'gemini-pro', apiKey: 'key' },
          { provider: 'ollama', name: 'mistral', model: 'mistral' },
        ],
        matchMaxTicks: 10,
        outputFormats: ['json'],
        outputPath: './results',
      };

      const result = CLIInterface.validateConfig(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('Output Format Selection', () => {
    it('supports html format', () => {
      const config: CLIConfig = {
        tournamentFormat: 'round-robin',
        models: [
          { provider: 'builtin', name: 'builtin' },
          { provider: 'builtin', name: 'builtin2' },
        ],
        matchMaxTicks: 10,
        outputFormats: ['html'],
        outputPath: './results',
      };

      const result = CLIInterface.validateConfig(config);
      expect(result.valid).toBe(true);
    });

    it('supports json format', () => {
      const config: CLIConfig = {
        tournamentFormat: 'round-robin',
        models: [
          { provider: 'builtin', name: 'builtin' },
          { provider: 'builtin', name: 'builtin2' },
        ],
        matchMaxTicks: 10,
        outputFormats: ['json'],
        outputPath: './results',
      };

      const result = CLIInterface.validateConfig(config);
      expect(result.valid).toBe(true);
    });

    it('supports csv format', () => {
      const config: CLIConfig = {
        tournamentFormat: 'round-robin',
        models: [
          { provider: 'builtin', name: 'builtin' },
          { provider: 'builtin', name: 'builtin2' },
        ],
        matchMaxTicks: 10,
        outputFormats: ['csv'],
        outputPath: './results',
      };

      const result = CLIInterface.validateConfig(config);
      expect(result.valid).toBe(true);
    });

    it('supports markdown format', () => {
      const config: CLIConfig = {
        tournamentFormat: 'round-robin',
        models: [
          { provider: 'builtin', name: 'builtin' },
          { provider: 'builtin', name: 'builtin2' },
        ],
        matchMaxTicks: 10,
        outputFormats: ['markdown'],
        outputPath: './results',
      };

      const result = CLIInterface.validateConfig(config);
      expect(result.valid).toBe(true);
    });

    it('supports multiple output formats', () => {
      const config: CLIConfig = {
        tournamentFormat: 'round-robin',
        models: [
          { provider: 'builtin', name: 'builtin' },
          { provider: 'builtin', name: 'builtin2' },
        ],
        matchMaxTicks: 10,
        outputFormats: ['html', 'json', 'csv', 'markdown'],
        outputPath: './results',
      };

      const result = CLIInterface.validateConfig(config);
      expect(result.valid).toBe(true);
    });
  });
});
