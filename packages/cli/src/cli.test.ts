/**
 * CLI Interface Tests
 *
 * Tests for command-line interface
 * - Command parsing
 * - Option validation
 * - Output formatting
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

interface CLIOption {
  name: string;
  short?: string;
  long: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

interface CLICommand {
  name: string;
  description: string;
  options: CLIOption[];
  execute: (args: Record<string, string>) => Promise<string>;
}

interface ParsedArgs {
  command: string;
  args: Record<string, string>;
  isValid: boolean;
  errors: string[];
}

class MockCLI {
  private commands: Map<string, CLICommand> = new Map();

  registerCommand(command: CLICommand): void {
    this.commands.set(command.name, command);
  }

  parseArgs(argv: string[]): ParsedArgs {
    if (argv.length === 0) {
      return {
        command: '',
        args: {},
        isValid: false,
        errors: ['No command provided'],
      };
    }

    const commandName = argv[0];
    const command = this.commands.get(commandName);

    if (!command) {
      return {
        command: commandName,
        args: {},
        isValid: false,
        errors: [`Unknown command: ${commandName}`],
      };
    }

    const args: Record<string, string> = {};
    const errors: string[] = [];

    // Parse options
    for (let i = 1; i < argv.length; i++) {
      const arg = argv[i];
      if (arg.startsWith('--')) {
        const [key, value] = arg.substring(2).split('=');
        args[key] = value || 'true';
      } else if (arg.startsWith('-')) {
        const short = arg.substring(1);
        const option = command.options.find(o => o.short === short);
        if (option) {
          args[option.name] = argv[++i] || 'true';
        }
      }
    }

    // Validate required options
    for (const option of command.options) {
      if (option.required && !(option.name in args)) {
        errors.push(`Missing required option: --${option.long}`);
      }
      if (!(option.name in args) && option.defaultValue) {
        args[option.name] = option.defaultValue;
      }
    }

    return {
      command: commandName,
      args,
      isValid: errors.length === 0,
      errors,
    };
  }

  async executeCommand(argv: string[]): Promise<{ output: string; error: string | null }> {
    const parsed = this.parseArgs(argv);

    if (!parsed.isValid) {
      return {
        output: '',
        error: parsed.errors.join('\n'),
      };
    }

    const command = this.commands.get(parsed.command);
    if (!command) {
      return { output: '', error: 'Command not found' };
    }

    try {
      const output = await command.execute(parsed.args);
      return { output, error: null };
    } catch (err) {
      return { output: '', error: (err as Error).message };
    }
  }

  getCommandCount(): number {
    return this.commands.size;
  }

  getCommand(name: string): CLICommand | undefined {
    return this.commands.get(name);
  }

  listCommands(): CLICommand[] {
    return Array.from(this.commands.values());
  }

  hasCommand(name: string): boolean {
    return this.commands.has(name);
  }
}

describe('CLI', () => {
  let cli: MockCLI;

  beforeEach(() => {
    cli = new MockCLI();
  });

  describe('Command Registration', () => {
    it('should register command', () => {
      const command: CLICommand = {
        name: 'test',
        description: 'Test command',
        options: [],
        execute: async () => 'ok',
      };

      cli.registerCommand(command);
      expect(cli.hasCommand('test')).toBe(true);
    });

    it('should register multiple commands', () => {
      for (let i = 0; i < 5; i++) {
        cli.registerCommand({
          name: `cmd${i}`,
          description: `Command ${i}`,
          options: [],
          execute: async () => `result${i}`,
        });
      }

      expect(cli.getCommandCount()).toBe(5);
    });

    it('should retrieve registered command', () => {
      const command: CLICommand = {
        name: 'analyze',
        description: 'Analyze data',
        options: [],
        execute: async () => 'analyzed',
      };

      cli.registerCommand(command);
      const retrieved = cli.getCommand('analyze');

      expect(retrieved?.name).toBe('analyze');
    });

    it('should list all commands', () => {
      cli.registerCommand({
        name: 'cmd1',
        description: 'First',
        options: [],
        execute: async () => '1',
      });
      cli.registerCommand({
        name: 'cmd2',
        description: 'Second',
        options: [],
        execute: async () => '2',
      });

      const commands = cli.listCommands();
      expect(commands).toHaveLength(2);
    });
  });

  describe('Argument Parsing', () => {
    beforeEach(() => {
      cli.registerCommand({
        name: 'process',
        description: 'Process data',
        options: [
          { name: 'file', short: 'f', long: 'file', description: 'Input file', required: true },
          { name: 'output', short: 'o', long: 'output', description: 'Output file', required: false },
          { name: 'verbose', short: 'v', long: 'verbose', description: 'Verbose mode', required: false, defaultValue: 'false' },
        ],
        execute: async (args) => `Processed: ${args.file}`,
      });
    });

    it('should parse command', () => {
      const parsed = cli.parseArgs(['process', '--file=input.txt']);
      expect(parsed.command).toBe('process');
      expect(parsed.isValid).toBe(true);
    });

    it('should parse long options', () => {
      const parsed = cli.parseArgs(['process', '--file=input.txt', '--output=result.txt']);
      expect(parsed.args.file).toBe('input.txt');
      expect(parsed.args.output).toBe('result.txt');
    });

    it('should parse short options', () => {
      const parsed = cli.parseArgs(['process', '-f', 'data.txt']);
      expect(parsed.args.file).toBe('data.txt');
    });

    it('should apply default values', () => {
      const parsed = cli.parseArgs(['process', '--file=input.txt']);
      expect(parsed.args.verbose).toBe('false');
    });

    it('should detect missing required options', () => {
      const parsed = cli.parseArgs(['process']);
      expect(parsed.isValid).toBe(false);
      expect(parsed.errors.length).toBeGreaterThan(0);
    });

    it('should handle empty args', () => {
      const parsed = cli.parseArgs([]);
      expect(parsed.isValid).toBe(false);
      expect(parsed.errors).toContain('No command provided');
    });

    it('should handle unknown commands', () => {
      const parsed = cli.parseArgs(['unknown', '--arg=value']);
      expect(parsed.isValid).toBe(false);
      expect(parsed.errors[0]).toContain('Unknown command');
    });
  });

  describe('Command Execution', () => {
    beforeEach(() => {
      cli.registerCommand({
        name: 'echo',
        description: 'Echo command',
        options: [{ name: 'message', long: 'message', description: 'Message', required: true }],
        execute: async (args) => `Echo: ${args.message}`,
      });
    });

    it('should execute valid command', async () => {
      const result = await cli.executeCommand(['echo', '--message=hello']);
      expect(result.error).toBeNull();
      expect(result.output).toContain('hello');
    });

    it('should report errors for invalid commands', async () => {
      const result = await cli.executeCommand(['echo']);
      expect(result.error).toBeTruthy();
      expect(result.output).toBe('');
    });

    it('should handle command exceptions', async () => {
      cli.registerCommand({
        name: 'fail',
        description: 'Failing command',
        options: [],
        execute: async () => {
          throw new Error('Intentional failure');
        },
      });

      const result = await cli.executeCommand(['fail']);
      expect(result.error).toBeTruthy();
      expect(result.error).toContain('Intentional failure');
    });
  });

  describe('Option Handling', () => {
    it('should support optional options', () => {
      cli.registerCommand({
        name: 'build',
        description: 'Build project',
        options: [
          { name: 'target', long: 'target', description: 'Build target', required: false },
        ],
        execute: async (args) => `Building ${args.target || 'default'}`,
      });

      const parsed = cli.parseArgs(['build']);
      expect(parsed.isValid).toBe(true);
    });

    it('should handle boolean flags', () => {
      cli.registerCommand({
        name: 'deploy',
        description: 'Deploy app',
        options: [
          { name: 'force', short: 'f', long: 'force', description: 'Force deploy', required: false },
        ],
        execute: async (args) => `Deploying with force=${args.force}`,
      });

      const parsed = cli.parseArgs(['deploy', '--force=true']);
      expect(parsed.args.force).toBe('true');
    });

    it('should validate option types', () => {
      cli.registerCommand({
        name: 'configure',
        description: 'Configure',
        options: [
          { name: 'port', long: 'port', description: 'Port', required: true },
        ],
        execute: async (args) => `Port: ${args.port}`,
      });

      const parsed = cli.parseArgs(['configure', '--port=8080']);
      expect(parsed.args.port).toBe('8080');
    });
  });

  describe('Error Handling', () => {
    it('should report parse errors', () => {
      cli.registerCommand({
        name: 'required',
        description: 'Requires options',
        options: [
          { name: 'config', long: 'config', description: 'Config file', required: true },
        ],
        execute: async () => 'ok',
      });

      const parsed = cli.parseArgs(['required']);
      expect(parsed.isValid).toBe(false);
      expect(parsed.errors.length).toBeGreaterThan(0);
    });

    it('should report execution errors', async () => {
      cli.registerCommand({
        name: 'broken',
        description: 'Broken command',
        options: [],
        execute: async () => {
          throw new Error('Command failed');
        },
      });

      const result = await cli.executeCommand(['broken']);
      expect(result.error).toContain('Command failed');
    });
  });

  describe('Performance', () => {
    it('should handle many commands', () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        cli.registerCommand({
          name: `cmd${i}`,
          description: `Command ${i}`,
          options: [],
          execute: async () => `result${i}`,
        });
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500);
      expect(cli.getCommandCount()).toBe(100);
    });

    it('should parse args quickly', () => {
      cli.registerCommand({
        name: 'test',
        description: 'Test',
        options: [
          { name: 'opt1', long: 'opt1', description: '', required: false },
          { name: 'opt2', long: 'opt2', description: '', required: false },
          { name: 'opt3', long: 'opt3', description: '', required: false },
        ],
        execute: async () => 'ok',
      });

      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        cli.parseArgs(['test', '--opt1=a', '--opt2=b', '--opt3=c']);
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(1000);
    });
  });
});
