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
import { StrategyAnalyzer } from '@ai-commander/strategy-analyzer';
import { ReplayPlayer } from '@ai-commander/replay-player';
import { ExperimentRunner } from '@ai-commander/experiment-runner';
import { ResearchDashboard } from '@ai-commander/research-dashboard';
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

      const outfile = args.output || `tournament-${Date.now()}.${format === 'markdown' ? 'md' : format}`;
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

      const outfile = args.output || `match-${Date.now()}.json`;
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

  experiment: {
    name: 'experiment',
    run: async (args) => {
      console.log('🧪 AI Commander Experiment');
      const config = JSON.parse(fs.readFileSync(args.config as string, 'utf-8'));

      console.log(`Running experiment: ${config.name}`);
      const comparison = await ExperimentRunner.runExperiment(config);

      const report = ExperimentRunner.generateReport(comparison);
      const outfile = args.output || `experiment-${Date.now()}.md`;
      fs.writeFileSync(outfile, report);
      console.log(`✅ Report saved to ${outfile}`);
    },
  },

  analyze: {
    name: 'analyze',
    run: async (args) => {
      console.log('📊 AI Commander Analysis');
      const replay = JSON.parse(fs.readFileSync(args.replay as string, 'utf-8'));

      const strategy = StrategyAnalyzer.generateStrategyReport(replay);
      console.log(`\nStrategy Analysis:`);
      console.log(`Red: ${strategy.redStrategy.strategy} (confidence: ${(strategy.redStrategy.confidence * 100).toFixed(0)}%)`);
      console.log(`Blue: ${strategy.blueStrategy.strategy} (confidence: ${(strategy.blueStrategy.confidence * 100).toFixed(0)}%)`);
      console.log(`Matchup: ${strategy.analysis.matchup}`);
      console.log(`Advantage: ${strategy.analysis.advantage}`);

      const comparison = ReplayPlayer.analyze(replay);
      console.log(`\nReplay Analysis:`);
      console.log(`Divergences: ${comparison.divergences.length}`);
      console.log(`Key moments: ${comparison.keyMoments.length}`);

      const html = ReplayPlayer.generateHTML(comparison);
      const outfile = args.output || `replay-${Date.now()}.html`;
      fs.writeFileSync(outfile, html);
      console.log(`✅ HTML replay saved to ${outfile}`);
    },
  },

  dashboard: {
    name: 'dashboard',
    run: async (args) => {
      console.log('📈 AI Commander Dashboard');
      const tournaments = (args.tournaments as string[])?.map((f) => JSON.parse(fs.readFileSync(f, 'utf-8'))) || [];

      const html = ResearchDashboard.generateHTML({
        tournaments,
        ratingHistory: [],
        selectedModels: (args.models as string[]) || [],
      });

      const outfile = args.output || `dashboard-${Date.now()}.html`;
      fs.writeFileSync(outfile, html);
      console.log(`✅ Dashboard saved to ${outfile}`);
    },
  },

  help: {
    name: 'help',
    run: async () => {
      console.log(`
AI Commander v2.0 — Multi-LLM Benchmarking Platform

USAGE:
  ai-commander <command> [options]

COMMANDS:
  tournament    Run a tournament (Round Robin, Swiss, Best of N, Elimination)
  match         Run a single match between two brains
  experiment    Run hyperparameter experiments
  analyze       Analyze replay: strategies, divergences
  dashboard     Generate research dashboard
  help          Show this message

EXAMPLES:
  ai-commander tournament --config=config.json --format=html --output=report.html
  ai-commander match --red='{"provider":"openai","openai":{...}}' --blue='{"provider":"claude",...}' --seed=12345
  ai-commander experiment --config=experiment.json --output=results.md
  ai-commander analyze --replay=match.json --output=replay.html
  ai-commander dashboard --tournaments=t1.json --tournaments=t2.json --output=dashboard.html

OPTIONS:
  --config       Configuration file (JSON)
  --replay       Replay file (JSON)
  --red          Red brain config (JSON)
  --blue         Blue brain config (JSON)
  --seed         Map seed (number)
  --ticks        Max ticks per match (default: 200)
  --game         Game adapter ID (default: openra)
  --format       Report format: markdown, html, json, csv (default: markdown)
  --output       Output file path
  --tournaments  Tournament files (can be repeated)
  --models       Model names (can be repeated)

PROVIDERS:
  - openai: gpt-4, gpt-4-turbo, gpt-3.5-turbo
  - claude: claude-3-opus-20240229, claude-3-sonnet-20240229, claude-3-haiku-20240307
  - gemini: gemini-pro, gemini-pro-vision
  - ollama: llama2, qwen, deepseek, mistral, gemma (local)
  - builtin: RTS AI

TOURNAMENT FORMATS:
  - round-robin
  - swiss
  - best-of-n
  - elimination
      `);
    },
  },
};

async function main() {
  const { positional, values } = parseArgs({
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

  const [command] = positional;

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
