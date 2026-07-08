/**
 * CLI
 *
 * Command-line interface for AI Commander.
 * - Parse arguments
 * - Dispatch commands
 * - Handle errors
 */

interface Command {
  readonly name: string;
  readonly description: string;
  readonly handler: (args: string[]) => Promise<number>;
}

/**
 * CLI application
 */
export class CLI {
  private commands: Map<string, Command> = new Map();
  private readonly appName: string = 'ai-commander';

  constructor() {
    this.registerDefaultCommands();
  }

  /**
   * Register a command
   */
  register(command: Command): void {
    this.commands.set(command.name, command);
  }

  /**
   * Parse command line arguments
   */
  parseArgs(argv: string[]): { readonly command: string; readonly args: string[] } {
    // Skip node and script name
    const args = argv.slice(2);

    if (args.length === 0) {
      return { command: 'help', args: [] };
    }

    // Handle "match start", "tournament run", etc.
    if (args[0] === 'match' && args[1]) {
      return { command: `match:${args[1]}`, args: args.slice(2) };
    }

    if (args[0] === 'tournament' && args[1]) {
      return { command: `tournament:${args[1]}`, args: args.slice(2) };
    }

    if (args[0] === 'config' && args[1]) {
      return { command: `config:${args[1]}`, args: args.slice(2) };
    }

    if (args[0] === 'replay' && args[1]) {
      return { command: `replay:${args[1]}`, args: args.slice(2) };
    }

    return { command: args[0], args: args.slice(1) };
  }

  /**
   * Run CLI
   */
  async run(argv: string[]): Promise<number> {
    const { command, args } = this.parseArgs(argv);

    if (!this.commands.has(command)) {
      console.error(`Error: Unknown command '${command}'`);
      console.error(`Run '${this.appName} help' for usage information.`);
      return 1;
    }

    const cmd = this.commands.get(command)!;

    try {
      return await cmd.handler(args);
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      return 1;
    }
  }

  /**
   * Register default commands
   */
  private registerDefaultCommands(): void {
    // Help command
    this.register({
      name: 'help',
      description: 'Show help information',
      handler: async () => {
        console.log(`${this.appName} - AI Arena for RTS Games`);
        console.log('');
        console.log('Usage: ai-commander <command> [options]');
        console.log('');
        console.log('Commands:');

        const commands = Array.from(this.commands.values())
          .filter((c) => c.name !== 'help')
          .sort((a, b) => a.name.localeCompare(b.name));

        for (const cmd of commands) {
          console.log(`  ${cmd.name.padEnd(20)} ${cmd.description}`);
        }

        console.log('');
        console.log(`Run 'ai-commander <command> --help' for more information.`);
        return 0;
      },
    });

    // Version command
    this.register({
      name: 'version',
      description: 'Show version information',
      handler: async () => {
        console.log(`${this.appName} v1.0.0`);
        return 0;
      },
    });
  }
}
