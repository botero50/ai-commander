#!/usr/bin/env node

import { MissionAgent } from './mission-agent.js';

interface CliOptions {
  targetX: number;
  targetY: number;
  json: boolean;
  help: boolean;
  command: string;
}

function printHelp(cmdName?: string): void {
  if (!cmdName || cmdName === 'help') {
    console.log(`AI Commander Reference Application CLI

USAGE:
  reference [COMMAND] [OPTIONS]

COMMANDS:
  run       Execute the autonomous mission
  trace     Execute the mission and print the execution trace
  metrics   Execute the mission and print runtime metrics
  replay    Execute the mission and validate the replay report
  inspect   Execute the mission and print the final runtime snapshot
  report    Execute the mission and print all outputs (snapshot, metrics, trace, report)
  help      Print this help message

OPTIONS:
  --target-x <N>    Target X coordinate (default: 3)
  --target-y <N>    Target Y coordinate (default: 2)
  --json            Output in JSON format
  --help            Print this help message

EXAMPLES:
  reference run
  reference run --target-x 5 --target-y 4
  reference trace --target-x 2 --target-y 2
  reference metrics --json
  reference replay --target-x 1 --target-y 0
  reference inspect
  reference report --json
`);
    return;
  }

  const commands: Record<string, string> = {
    run: `Execute the autonomous mission

USAGE:
  reference run [OPTIONS]

OPTIONS:
  --target-x <N>    Target X coordinate (default: 3)
  --target-y <N>    Target Y coordinate (default: 2)
  --json            Output in JSON format
  --help            Print this help message

DESCRIPTION:
  Runs the mission agent to the specified target location.
  Prints status messages during execution.

EXAMPLES:
  reference run
  reference run --target-x 5 --target-y 4`,

    trace: `Execute the mission and print the execution trace

USAGE:
  reference trace [OPTIONS]

OPTIONS:
  --target-x <N>    Target X coordinate (default: 3)
  --target-y <N>    Target Y coordinate (default: 2)
  --json            Output in JSON format
  --help            Print this help message

DESCRIPTION:
  Runs the mission agent and prints the detailed execution trace.
  The trace shows all events during mission execution.

EXAMPLES:
  reference trace
  reference trace --target-x 2 --target-y 2
  reference trace --json`,

    metrics: `Execute the mission and print runtime metrics

USAGE:
  reference metrics [OPTIONS]

OPTIONS:
  --target-x <N>    Target X coordinate (default: 3)
  --target-y <N>    Target Y coordinate (default: 2)
  --json            Output in JSON format
  --help            Print this help message

DESCRIPTION:
  Runs the mission agent and prints the runtime metrics.
  Metrics include timing, event counts, and performance data.

EXAMPLES:
  reference metrics
  reference metrics --json`,

    replay: `Execute the mission and validate the replay report

USAGE:
  reference replay [OPTIONS]

OPTIONS:
  --target-x <N>    Target X coordinate (default: 3)
  --target-y <N>    Target Y coordinate (default: 2)
  --json            Output in JSON format
  --help            Print this help message

DESCRIPTION:
  Runs the mission agent and validates the execution consistency
  using the replay engine. Prints the replay validation report.

EXAMPLES:
  reference replay
  reference replay --target-x 1 --target-y 1`,

    inspect: `Execute the mission and print the runtime snapshot

USAGE:
  reference inspect [OPTIONS]

OPTIONS:
  --target-x <N>    Target X coordinate (default: 3)
  --target-y <N>    Target Y coordinate (default: 2)
  --json            Output in JSON format
  --help            Print this help message

DESCRIPTION:
  Runs the mission agent and captures the final runtime snapshot.
  Shows mission state, agent position, and execution progress.

EXAMPLES:
  reference inspect
  reference inspect --json`,

    report: `Execute the mission and print all outputs

USAGE:
  reference report [OPTIONS]

OPTIONS:
  --target-x <N>    Target X coordinate (default: 3)
  --target-y <N>    Target Y coordinate (default: 2)
  --json            Output in JSON format
  --help            Print this help message

DESCRIPTION:
  Runs the mission agent and prints a comprehensive report including:
  - Runtime Snapshot (execution state)
  - Runtime Metrics (performance data)
  - Execution Trace (event log)
  - Replay Report (execution validation)

EXAMPLES:
  reference report
  reference report --target-x 3 --target-y 2 --json`,
  };

  const help = commands[cmdName] ?? undefined;
  if (help) {
    console.log(help);
  } else {
    console.log(`Unknown command: ${cmdName}`);
    console.log('Use "reference help" for usage information.');
  }
}

function parseArguments(args: string[]): CliOptions {
  const options: CliOptions = {
    targetX: 3,
    targetY: 2,
    json: false,
    help: false,
    command: 'run',
  };

  // First argument is the command
  if (args.length > 0 && args[0] && !args[0].startsWith('--')) {
    options.command = args[0];
    args = args.slice(1);
  }

  // Parse remaining arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (!arg) {
      continue;
    }

    if (arg === '--help') {
      options.help = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--target-x' && i + 1 < args.length) {
      const nextArg = args[i + 1];
      if (nextArg) {
        options.targetX = parseInt(nextArg, 10);
        i++;
      }
    } else if (arg === '--target-y' && i + 1 < args.length) {
      const nextArg = args[i + 1];
      if (nextArg) {
        options.targetY = parseInt(nextArg, 10);
        i++;
      }
    } else if (!arg.startsWith('--')) {
      // Ignore positional args beyond the first command
    } else {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    }
  }

  return options;
}

async function executeCommand(command: string, options: CliOptions): Promise<number> {
  const agent = new MissionAgent(options.targetX, options.targetY);

  try {
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    switch (command) {
      case 'run': {
        console.log('\n✓ Mission completed successfully');
        return 0;
      }

      case 'trace': {
        if (options.json) {
          console.log(agent.traceAsJson());
        } else {
          console.log('\n' + agent.formatTrace());
        }
        return 0;
      }

      case 'metrics': {
        if (options.json) {
          console.log(agent.metricsAsJson());
        } else {
          console.log('\n' + agent.formatMetrics());
        }
        return 0;
      }

      case 'replay': {
        if (options.json) {
          console.log(agent.replayReportAsJson());
        } else {
          console.log('\n' + agent.formatReplayReport());
        }
        return 0;
      }

      case 'inspect': {
        if (options.json) {
          console.log(agent.snapshotAsJson());
        } else {
          console.log('\n' + agent.formatSnapshot());
        }
        return 0;
      }

      case 'report': {
        const output: Record<string, unknown> = {
          snapshot: JSON.parse(agent.snapshotAsJson()),
          metrics: JSON.parse(agent.metricsAsJson()),
          trace: JSON.parse(agent.traceAsJson()),
          replayReport: JSON.parse(agent.replayReportAsJson()),
        };

        if (options.json) {
          console.log(JSON.stringify(output, null, 2));
        } else {
          const snapshotLines = agent.formatSnapshot().split('\n').slice(1);
          const metricsLines = agent.formatMetrics().split('\n').slice(1);
          const traceLines = agent.formatTrace().split('\n').slice(1);
          const replayLines = agent.formatReplayReport().split('\n').slice(1);

          console.log('\n╭─ RUNTIME SNAPSHOT ─────────────────────────────────────────────────╮');
          console.log(snapshotLines.join('\n'));

          console.log('\n╭─ RUNTIME METRICS ──────────────────────────────────────────────────╮');
          console.log(metricsLines.join('\n'));

          console.log('\n╭─ EXECUTION TRACE ──────────────────────────────────────────────────╮');
          console.log(traceLines.join('\n'));

          console.log('\n╭─ REPLAY REPORT ────────────────────────────────────────────────────╮');
          console.log(replayLines.join('\n'));
        }
        return 0;
      }

      default:
        console.error(`Unknown command: ${command}`);
        console.error('Use "reference help" for usage information.');
        return 1;
    }
  } catch (error) {
    console.error('\n✗ Mission failed:');
    console.error(error);
    return 1;
  }
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const options = parseArguments(args);

  if (options.help || options.command === 'help') {
    printHelp(options.command === 'help' ? undefined : options.command);
    return 0;
  }

  return executeCommand(options.command, options);
}

main().then((exitCode) => {
  process.exit(exitCode);
});
