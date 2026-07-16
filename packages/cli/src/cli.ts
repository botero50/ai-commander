#!/usr/bin/env node

/**
 * AI Commander CLI — Command-line interface for tournaments and analysis
 *
 * Usage:
 *   ai-commander tournament --config=config.json
 *   ai-commander match --red=gpt4 --blue=claude --seed=12345
 *   ai-commander experiment --config=experiment.json
 *   ai-commander report --replay=replay.json --format=html
 */

import { parseArgs } from 'node:util';
import { BrainManager } from '@ai-commander/brain';
import { TournamentEngine } from '@ai-commander/tournament-engine';
import { MatchRunner } from '@ai-commander/match-runner';
import { BenchmarkReporter } from '@ai-commander/benchmark-reporter';
import fs from 'fs';

interface CLICommand {
  name: string;
  run: (args: Record<string, string | string[]>) => Promise<void>;
}

const commands: Record<string, CLICommand> = {
  tournament: {
    name: 'tournament',
    run: async (args) => {
      console.log('🎮 AI Commander Tournament');
      const config = JSON.parse(fs.readFileSync(args.config as string, 'utf-8'));

      // Create brains
      const brains = await Promise.all(
        config.brains.map((brainConfig: any) => BrainManager.create(brainConfig))
      );

      console.log(`Running ${config.format} tournament with ${brains.length} brains...`);

      // Execute tournament
      const result = await TournamentEngine[config.format as keyof typeof TournamentEngine]({
        ...config,
        brains,
      });

      // Generate report
      const report = BenchmarkReporter.generateReport(result);
      const format = args.format || 'markdown';

      let output: string;
      if (format === 'html') {
        output = BenchmarkReporter.toHTML(report);
      } else if (format === 'json') {
        output = BenchmarkReporter.toJSON(report);
      } else if (format === 'csv') {
        output = BenchmarkReporter.toCSV(report);
      } else {
        output = BenchmarkReporter.toMarkdown(report);
      }

      const outfile = Array.isArray(args.output) ? args.output[0] : (args.output as string) || `tournament-${Date.now()}.${format === 'markdown' ? 'md' : format}`;
      fs.writeFileSync(outfile, output);
      console.log(`✅ Report saved to ${outfile}`);
    },
  },

  match: {
    name: 'match',
    run: async (args) => {
      console.log('🎮 AI Commander Match');
      const redConfig = JSON.parse(args.red as string);
      const blueConfig = JSON.parse(args.blue as string);
      const seed = parseInt(args.seed as string);

      const redBrain = await BrainManager.create(redConfig);
      const blueBrain = await BrainManager.create(blueConfig);

      console.log(`${redBrain.name} vs ${blueBrain.name} (seed: ${seed})`);

      const replay = await MatchRunner.run({
        redBrain,
        blueBrain,
        mapSeed: seed,
        maxTicks: parseInt(args.ticks as string) || 200,
        gameAdapterId: args.game as string,
      });

      const outfile = Array.isArray(args.output) ? args.output[0] : (args.output as string) || `match-${Date.now()}.json`;
      fs.writeFileSync(outfile, JSON.stringify(replay, null, 2));
      console.log(`✅ Replay saved to ${outfile}`);

      // Show metrics
      console.log(`\nMatch result: ${replay.metrics.winner.toUpperCase()}`);
      console.log(`Ticks: ${replay.metrics.totalTicks}`);
      console.log(`Duration: ${(replay.metrics.duration / 1000).toFixed(1)}s`);
      console.log(`Red cost: $${replay.metrics.redCost.toFixed(4)}`);
      console.log(`Blue cost: $${replay.metrics.blueCost.toFixed(4)}`);
    },
  },

  help: {
    name: 'help',
    run: async () => {
      console.log(`
AI Commander v1.0 — Chess Tournament Platform

USAGE:
  ai-commander <command> [options]

COMMANDS:
  tournament    Run a tournament (Round Robin, Swiss, Best of N, Elimination)
  match         Run a single match between two brains
  help          Show this message

EXAMPLES:
  ai-commander tournament --config=config.json --format=html --output=report.html
  ai-commander match --red='{"provider":"ollama","model":"mistral"}' --blue='{"provider":"claude","model":"opus"}' --seed=12345

OPTIONS:
  --config       Configuration file (JSON)
  --red          Red brain config (JSON)
  --blue         Blue brain config (JSON)
  --seed         Match seed (number)
  --format       Report format: markdown, html, json, csv (default: markdown)
  --output       Output file path

BRAIN PROVIDERS:
  - ollama: mistral, llama2, neural-chat, etc. (local, requires docker)
  - openai: gpt-4, gpt-4-turbo, gpt-3.5-turbo
  - anthropic: claude-3-opus, claude-3-sonnet, claude-3-haiku
  - google: gemini-pro
      `);
    },
  },
};

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      config: { type: 'string' },
      replay: { type: 'string' },
      red: { type: 'string' },
      blue: { type: 'string' },
      seed: { type: 'string' },
      ticks: { type: 'string' },
      game: { type: 'string' },
      format: { type: 'string' },
      output: { type: 'string' },
      tournaments: { type: 'string', multiple: true },
      models: { type: 'string', multiple: true },
    },
  });

  const [command] = positionals;

  if (!command || !commands[command]) {
    await commands.help.run({});
    process.exit(1);
  }

  try {
    await commands[command].run(values);
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

main();
