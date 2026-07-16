#!/usr/bin/env node

/**
 * AI Commander CLI — Chess Tournament Platform
 *
 * Usage:
 *   pnpm chess                          # Launch continuous chess arena
 *   pnpm chess tournament --config=...  # Run tournament
 *   pnpm chess match --red=... --blue=...
 */

import { parseArgs } from 'node:util';
import { BrainManager } from '@ai-commander/brain';
import { TournamentEngine } from '@ai-commander/tournament-engine';
import { MatchRunner } from '@ai-commander/match-runner';
import { BenchmarkReporter } from '@ai-commander/benchmark-reporter';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface CLICommand {
  name: string;
  run: (args: Record<string, string | string[]>) => Promise<void>;
}

const commands: Record<string, CLICommand> = {
  chess: {
    name: 'chess',
    run: async () => {
      // Dynamic import to avoid circular dependency
      const { ChessStartup } = await import('../chess-startup.js');
      const startup = new ChessStartup();
      await startup.run();
    },
  },

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
  pnpm chess                           # Launch continuous chess arena (default)
  pnpm chess tournament --config=...   # Run tournament
  pnpm chess match --red=... --blue=...
  pnpm chess help

EXAMPLES:
  pnpm chess
  pnpm chess tournament --config=config.json --format=html --output=report.html
  pnpm chess match --red='{"provider":"ollama","model":"mistral"}' --blue='{"provider":"stockfish"}' --seed=12345

OPTIONS:
  --config       Configuration file (JSON)
  --red          Red brain config (JSON)
  --blue         Blue brain config (JSON)
  --seed         Match seed (number)
  --format       Report format: markdown, html, json, csv (default: markdown)
  --output       Output file path

ENVIRONMENT:
  OLLAMA_ENDPOINT    Ollama API endpoint (default: http://localhost:11434)
  CHESS_MODEL        Default Ollama model (default: mistral)

BRAIN PROVIDERS:
  - ollama: mistral, llama2, neural-chat, etc. (local, requires ollama serve)
  - stockfish: Chess engine (requires stockfish binary)
  - openai: gpt-4, gpt-4-turbo (requires OPENAI_API_KEY)
  - anthropic: claude-opus, claude-sonnet (requires ANTHROPIC_API_KEY)
  - google: gemini-pro (requires GOOGLE_API_KEY)
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

  // Default to 'chess' command if no command specified
  const targetCommand = command && commands[command] ? command : 'chess';

  if (command && !commands[command]) {
    console.error(`❌ Unknown command: ${command}\n`);
    await commands.help.run({});
    process.exit(1);
  }

  try {
    await commands[targetCommand].run(values);
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

main();
