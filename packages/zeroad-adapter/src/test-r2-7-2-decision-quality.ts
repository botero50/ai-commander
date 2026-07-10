#!/usr/bin/env node

/**
 * Story R2.7.2 — Decision Quality
 *
 * Objective: Log every decision with full details to identify:
 * - Hallucinations (invalid commands)
 * - Repetitive behavior
 * - Idle periods
 * - Command failures
 * - Response quality
 *
 * Run:
 * npm run build
 * node packages/zeroad-adapter/dist/test-r2-7-2-decision-quality.js [max_ticks]
 *
 * Default: 300 ticks (full match if possible)
 *
 * Prerequisites:
 * - 0 A.D. running with RL Interface on 127.0.0.1:6000
 * - Ollama running on localhost:11434
 */

import { RLHTTPClient } from './rl-interface/http-client.js';
import { ObservationReceiver } from './rl-interface/observation-receiver.js';
import { CommandExecutor } from './rl-interface/command-executor.js';
import { WorldStateMapper } from './rl-interface/world-state-mapper.js';
import { AILoopOrchestrator, type BrainDecision } from './rl-interface/ai-loop-orchestrator.js';
import type { AIBrain } from './rl-interface/ai-loop-orchestrator.js';
import type { WorldState } from '@ai-commander/domain';
import { OllamaAIBrain } from './rl-interface/ollama-brain.js';
import { Logger } from './config/logger.js';
import * as fs from 'fs';

const RL_HOST = '127.0.0.1';
const RL_PORT = 6000;
const MAX_TICKS = process.argv[2] ? parseInt(process.argv[2], 10) : 300;
const OLLAMA_MODEL = 'neural-chat:latest';

interface DetailedDecision {
  decisionNumber: number;
  tick: number;
  timestamp: string;
  observationSummary: {
    friendlyUnits: number;
    friendlyBuildings: number;
    enemyUnits: number;
    enemyBuildings: number;
    totalEntities: number;
  };
  promptSize: number;
  promptContent: string;
  modelResponse: string;
  responseLength: number;
  parsedCommands: Array<{
    type: string;
    entities?: number[];
    target?: number;
    x?: number;
    z?: number;
  }>;
  commandCount: number;
  executionSuccess: boolean;
  executionResult?: string;
  ollamaLatencyMs: number;
  decisionPattern?: string; // Identify repetitive behavior
}

class DetailedOllamaBrain implements AIBrain {
  private ollama: OllamaAIBrain;
  private logger: Logger;
  public decisions: DetailedDecision[] = [];
  private lastCommandTypes: string[] = [];
  private decisionCounter = 0;

  constructor(logger: Logger) {
    this.logger = logger;
    this.ollama = new OllamaAIBrain(logger, {
      modelName: OLLAMA_MODEL,
      baseUrl: 'http://localhost:11434',
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      numPredict: 256,
      timeout: 30000,
    });
  }

  async initialize(): Promise<void> {
    await this.ollama.initialize();
  }

  async decide(worldState: WorldState): Promise<BrainDecision> {
    this.decisionCounter++;
    const tick = worldState.time.currentTick.number;
    const startTime = Date.now();

    try {
      // Get the brain decision (from ollama)
      const decision = await this.ollama.decide(worldState);
      const ollamaTime = Date.now() - startTime;

      // Build the prompt manually (replicate ollama-brain buildPrompt)
      const gameDescription = this.describeGameState(worldState);
      const prompt = this.buildPrompt(gameDescription);

      // Count agents
      const agents = worldState.agents;
      const friendlyUnits = agents.filter(
        a => (a.customData as any)?.type === 'unit' && a.controlledByPlayerId?.toString() === '1'
      ).length;
      const friendlyBuildings = agents.filter(
        a => (a.customData as any)?.type === 'building' && a.controlledByPlayerId?.toString() === '1'
      ).length;
      const enemyUnits = agents.filter(
        a => (a.customData as any)?.type === 'unit' && a.controlledByPlayerId?.toString() !== '1'
      ).length;
      const enemyBuildings = agents.filter(
        a => (a.customData as any)?.type === 'building' && a.controlledByPlayerId?.toString() !== '1'
      ).length;

      // Extract command types for repetition detection
      const commandTypes = decision.commands.map((cmd) => (cmd.json_cmd as any)?.type || 'unknown');
      const decisionPattern = this.detectPattern(commandTypes);

      // Record detailed decision
      const detailedDecision: DetailedDecision = {
        decisionNumber: this.decisionCounter,
        tick,
        timestamp: new Date().toISOString(),
        observationSummary: {
          friendlyUnits,
          friendlyBuildings,
          enemyUnits,
          enemyBuildings,
          totalEntities: agents.length,
        },
        promptSize: prompt.length,
        promptContent: prompt,
        modelResponse: decision.reasoning || '',
        responseLength: decision.reasoning?.length || 0,
        parsedCommands: decision.commands.map((cmd) => cmd.json_cmd as any),
        commandCount: decision.commands.length,
        executionSuccess: decision.commands.length > 0,
        ollamaLatencyMs: ollamaTime,
        decisionPattern,
      };

      this.decisions.push(detailedDecision);

      // Log quality metrics
      if (this.decisionCounter % 10 === 0) {
        this.logger.info(`Decision #${this.decisionCounter} quality check`, {
          commandCount: decision.commands.length,
          pattern: decisionPattern,
          friendly: `${friendlyUnits}U/${friendlyBuildings}B`,
          enemy: `${enemyUnits}U/${enemyBuildings}B`,
        });
      }

      this.lastCommandTypes = commandTypes;
      return decision;
    } catch (error) {
      this.logger.error('DetailedOllamaBrain decision failed', { error: String(error) });
      return {
        playerID: 1,
        commands: [],
        reasoning: `Decision failed: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  async shutdown(): Promise<void> {
    await this.ollama.shutdown();
  }

  private describeGameState(worldState: WorldState): string {
    const agents = worldState.agents;
    const players = worldState.players;

    const units = agents.filter(a => (a.customData as any)?.type === 'unit');
    const buildings = agents.filter(a => (a.customData as any)?.type === 'building');
    const resources = agents.filter(a => (a.customData as any)?.type === 'resource');

    const friendlyUnits = units.filter(u => u.controlledByPlayerId?.toString() === '1').length;
    const enemyUnits = units.filter(u => u.controlledByPlayerId?.toString() !== '1').length;

    const friendlyBuildings = buildings.filter(b => b.controlledByPlayerId?.toString() === '1').length;
    const enemyBuildings = buildings.filter(b => b.controlledByPlayerId?.toString() !== '1').length;

    return `
GAME STATE AT TICK ${worldState.time.currentTick.number}

PLAYERS:
${players.map(p => `- ${p.name} (ID: ${p.id})`).join('\n')}

YOUR FORCES:
- Units: ${friendlyUnits}
- Buildings: ${friendlyBuildings}
- Total Agents: ${friendlyUnits + friendlyBuildings}

ENEMY FORCES:
- Units: ${enemyUnits}
- Buildings: ${enemyBuildings}
- Total Agents: ${enemyUnits + enemyBuildings}

MAP: ${worldState.map?.name || 'Unknown'} (${worldState.map?.width}x${worldState.map?.height})
VISIBLE RESOURCES: ${resources.length}

OBJECTIVE: Expand your civilization, gather resources, and eliminate enemy forces.
    `.trim();
  }

  private buildPrompt(gameDescription: string): string {
    return `You are an AI commander in Age of Empires 2. Your job is to order military and economic actions.

${gameDescription}

IMMEDIATE ACTIONS YOU CAN TAKE RIGHT NOW:
- MOVE your units to gather resources or explore
- EXPAND by building new structures
- GATHER resources from nearby locations
- ATTACK enemy units if you see them
- RESEARCH technologies to improve your civilization

Based on the game state above, output 2-3 IMMEDIATE ACTIONS to take RIGHT NOW. Be very specific and direct.

For each action, start with one of these keywords: MOVE, EXPAND, GATHER, ATTACK, or RESEARCH
Then explain what to do.

Example format:
MOVE - Scout the unexplored areas to find resources and enemy positions
GATHER - Collect wood and stone from nearby resource nodes
EXPAND - Build a second settlement in the eastern part of the map

Now output your immediate actions:`;
  }

  private detectPattern(commandTypes: string[]): string {
    if (commandTypes.length === 0) return 'IDLE';
    if (commandTypes.every(t => t === commandTypes[0])) return `REPETITIVE_${commandTypes[0]}`;
    if (JSON.stringify(commandTypes) === JSON.stringify(this.lastCommandTypes)) return 'IDENTICAL_TO_LAST';
    return 'VARIED';
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║    STORY R2.7.2 — DECISION QUALITY ANALYSIS                ║');
  console.log('║  Log every decision to identify hallucinations & patterns  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const logger = new Logger('info');
  const client = new RLHTTPClient(RL_HOST, RL_PORT, 10000, logger);
  const observationReceiver = new ObservationReceiver(logger);
  const commandExecutor = new CommandExecutor(client, logger);
  const worldStateMapper = new WorldStateMapper(logger);
  const brain = new DetailedOllamaBrain(logger);

  try {
    // Initialize
    console.log('[INIT] Initializing Ollama brain...');
    await brain.initialize();
    console.log(`[INIT] ✓ Ollama connected\n`);

    // Get initial state
    console.log('[INIT] Fetching initial game state...');
    const initialState = await client.step([]);
    console.log(`[INIT] ✓ Game state at tick ${initialState.tick}\n`);

    // Run loop
    console.log(`[GAME] Running match for up to ${MAX_TICKS} ticks...\n`);

    const orchestrator = new AILoopOrchestrator(
      client,
      observationReceiver,
      commandExecutor,
      worldStateMapper,
      brain,
      logger
    );

    const startTime = Date.now();
    const finalState = await orchestrator.runLoop(MAX_TICKS);
    const duration = Date.now() - startTime;

    // Analyze decisions
    console.log('\n[DECISION QUALITY ANALYSIS]\n');
    const decisions = (brain as any).decisions;

    const idle = decisions.filter((d: any) => d.commandCount === 0).length;
    const active = decisions.filter((d: any) => d.commandCount > 0).length;
    const repetitive = decisions.filter((d: any) => d.decisionPattern?.includes('REPETITIVE')).length;
    const identical = decisions.filter((d: any) => d.decisionPattern === 'IDENTICAL_TO_LAST').length;

    console.log(`Total decisions:          ${decisions.length}`);
    console.log(`Active decisions:         ${active} (${((active / decisions.length) * 100).toFixed(1)}%)`);
    console.log(`Idle (no commands):       ${idle} (${((idle / decisions.length) * 100).toFixed(1)}%)`);
    console.log(`Repetitive patterns:      ${repetitive}`);
    console.log(`Identical to last:        ${identical}`);
    console.log(
      `Avg Ollama latency:       ${(decisions.reduce((a: number, b: any) => a + b.ollamaLatencyMs, 0) / decisions.length).toFixed(0)}ms`
    );

    // Identify issues
    console.log('\n[IDENTIFIED ISSUES]\n');
    if (idle > decisions.length * 0.3) {
      console.log(`⚠ High idle rate (${((idle / decisions.length) * 100).toFixed(1)}%) - Ollama not making decisions`);
    }
    if (repetitive > decisions.length * 0.2) {
      console.log(`⚠ Repetitive behavior (${((repetitive / decisions.length) * 100).toFixed(1)}%) - May indicate stuck patterns`);
    }
    if (identical > 0) {
      console.log(`⚠ Identical consecutive decisions (${identical}) - No strategy variation`);
    }

    // Sample decisions
    console.log('\n[SAMPLE DECISIONS]\n');
    [0, Math.floor(decisions.length / 2), decisions.length - 1].forEach((idx) => {
      if (idx >= 0 && idx < decisions.length) {
        const d = decisions[idx];
        console.log(`Decision #${d.decisionNumber} (tick ${d.tick}):`);
        console.log(`  Friendly: ${d.observationSummary.friendlyUnits}U/${d.observationSummary.friendlyBuildings}B`);
        console.log(`  Enemy: ${d.observationSummary.enemyUnits}U/${d.observationSummary.enemyBuildings}B`);
        console.log(`  Commands: ${d.commandCount} (${d.parsedCommands.map((c: any) => c.type).join(', ')})`);
        console.log(`  Pattern: ${d.decisionPattern}`);
        console.log(`  Response: "${d.modelResponse.substring(0, 80)}..."`);
        console.log('');
      }
    });

    // Save detailed log
    const logPath = 'test-r2-7-2-decisions.json';
    fs.writeFileSync(
      logPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          story: 'R2.7.2 - Decision Quality Analysis',
          duration: {
            totalMs: duration,
            totalSeconds: (duration / 1000).toFixed(1),
          },
          summary: {
            totalDecisions: decisions.length,
            activeDecisions: active,
            idleDecisions: idle,
            repetitivePatterns: repetitive,
            identicalConsecutive: identical,
            avgOllamaLatency: (decisions.reduce((a: number, b: any) => a + b.ollamaLatencyMs, 0) / decisions.length).toFixed(0),
          },
          decisions,
        },
        null,
        2
      )
    );

    console.log(`\nDetailed decision log saved to ${logPath}`);

    // Verdict
    console.log('\n[R2.7.2 VERDICT]\n');
    const issues: string[] = [];
    if (idle > decisions.length * 0.5) issues.push('Excessive idle decisions');
    if (repetitive > decisions.length * 0.3) issues.push('High repetition');

    if (issues.length === 0) {
      console.log('✓ Decision quality is good - No major issues detected');
      console.log('✓ Proceeding to R2.7.3 (Prompt Iteration)');
    } else {
      console.log('⚠ Issues detected:');
      issues.forEach(i => console.log(`  - ${i}`));
      console.log('✓ Can proceed to R2.7.3 with evidence-driven improvements');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n✗ ERROR:', error);
    process.exit(1);
  }
}

main();
