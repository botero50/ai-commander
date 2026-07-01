#!/usr/bin/env node

import { BenchmarkSuite } from './benchmark-suite.js';

interface BenchmarkOptions {
  targets: Array<[number, number]>;
  runsPerTarget: number;
  format: 'text' | 'json';
  verbose: boolean;
}

function parseArgs(args: string[]): BenchmarkOptions {
  const options: BenchmarkOptions = {
    targets: [
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
      [3, 2],
    ],
    runsPerTarget: 3,
    format: 'text',
    verbose: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--targets' && i + 1 < args.length) {
      const targetStr = args[i + 1];
      if (targetStr) {
        options.targets = targetStr.split(',').map((t) => {
          const [x, y] = t.split(':').map((v) => parseInt(v, 10));
          return [x, y] as [number, number];
        });
      }
      i += 2;
    } else if (arg === '--runs' && i + 1 < args.length) {
      const runsStr = args[i + 1];
      if (runsStr) {
        options.runsPerTarget = parseInt(runsStr, 10);
      }
      i += 2;
    } else if (arg === '--json') {
      options.format = 'json';
      i += 1;
    } else if (arg === '--verbose') {
      options.verbose = true;
      i += 1;
    } else if (arg === '--help') {
      printHelp();
      process.exit(0);
    } else {
      i += 1;
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`Benchmark Suite for AI Commander Reference Application

USAGE:
  benchmark [OPTIONS]

OPTIONS:
  --targets <targets>    Comma-separated targets (default: 1:0,1:1,2:1,2:2,3:2)
                        Format: x:y,x:y,...
  --runs <N>            Runs per target (default: 3)
  --json                Output JSON instead of text
  --verbose             Print detailed information
  --help                Show this help message

EXAMPLES:
  benchmark
  benchmark --targets 2:1,3:2
  benchmark --runs 5 --json
  benchmark --targets 1:0,5:5 --runs 2 --verbose
`);
}

async function main(): Promise<number> {
  try {
    const args = process.argv.slice(2);
    const options = parseArgs(args);

    if (options.verbose) {
      console.log('Starting benchmarks...');
      console.log(`Targets: ${options.targets.map((t) => `(${t[0]}, ${t[1]})`).join(', ')}`);
      console.log(`Runs per target: ${options.runsPerTarget}`);
      console.log('');
    }

    // Run benchmarks
    const results = await BenchmarkSuite.runBenchmarks(options.targets, options.runsPerTarget);

    if (options.verbose) {
      console.log(`Completed ${results.length} benchmark runs`);
      console.log('');
    }

    // Generate report
    const report = BenchmarkSuite.generateReport(results);

    // Output results
    if (options.format === 'json') {
      const json = BenchmarkSuite.reportToJson(report);
      console.log(json);
    } else {
      const formatted = BenchmarkSuite.formatReport(report);
      console.log(formatted);
    }

    return 0;
  } catch (error) {
    console.error('Benchmark failed:');
    console.error(error);
    return 1;
  }
}

main().then((exitCode) => {
  process.exit(exitCode);
});
