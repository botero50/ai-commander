/**
 * Ollama AI Brain
 *
 * Implements AIBrain interface using local Ollama LLM inference.
 * Converts WorldState to natural language prompts, gets LLM decisions,
 * parses responses into GameCommand[] for execution.
 *
 * Prerequisites:
 * - Ollama running on localhost:11434
 * - Model available (e.g., ollama pull llama2)
 *
 * Story R3.1: Ollama Brain Implementation
 */

import { Logger } from '../config/logger.js';
import type { WorldState } from '@ai-commander/domain';
import type { AIBrain, BrainDecision } from './ai-loop-orchestrator.js';
import type { GameCommand } from './http-client.js';
import { DecisionLogger } from './decision-logger.js';

export interface OllamaConfig {
  modelName: string; // e.g., 'llama2', 'mistral', 'neural-chat'
  baseUrl: string; // e.g., 'http://localhost:11434'
  temperature: number; // 0.0 - 1.0 (lower = deterministic, higher = creative)
  topP: number; // Nucleus sampling
  topK: number; // Diversity
  numPredict: number; // Max response tokens
  timeout: number; // Request timeout in ms
  playerID?: number; // Player to control (1 or 2). Default: 2
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

/**
 * AI Brain powered by local Ollama LLM inference
 */
export class OllamaAIBrain implements AIBrain {
  private logger: Logger;
  private config: OllamaConfig;
  private decisionCount: number = 0;
  private decisionLogger: DecisionLogger;
  private playerID: number;

  constructor(logger: Logger, config: Partial<OllamaConfig> = {}) {
    this.logger = logger;
    this.decisionLogger = new DecisionLogger(logger);
    this.playerID = config.playerID || 2;
    this.config = {
      modelName: config.modelName || 'llama2',
      baseUrl: config.baseUrl || 'http://localhost:11434',
      temperature: config.temperature !== undefined ? config.temperature : 0.7,
      topP: config.topP !== undefined ? config.topP : 0.9,
      topK: config.topK !== undefined ? config.topK : 40,
      numPredict: config.numPredict || 256,
      timeout: config.timeout || 30000,
      playerID: config.playerID || 2,
    };
  }

  /**
   * Initialize brain (verify Ollama is reachable)
   */
  async initialize(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama health check failed: ${response.status}`);
      }

      const data = (await response.json()) as { models: Array<{ name: string }> };
      const availableModels = data.models.map(m => m.name);

      this.logger.info('Ollama initialized', {
        baseUrl: this.config.baseUrl,
        selectedModel: this.config.modelName,
        availableModels: availableModels.join(', '),
      });

      if (!availableModels.includes(this.config.modelName)) {
        this.logger.warn('Selected model not available', {
          model: this.config.modelName,
          available: availableModels,
        });
      }
    } catch (error) {
      this.logger.error('Failed to initialize Ollama brain', {
        error: String(error),
        baseUrl: this.config.baseUrl,
      });
      throw error;
    }
  }

  /**
   * Make a decision based on world state
   */
  async decide(worldState: WorldState): Promise<BrainDecision> {
    this.decisionCount++;

    try {
      // Phase 1: Describe game state
      const gameDescription = this.describeGameState(worldState);

      // Phase 2: Build prompt
      const prompt = this.buildPrompt(gameDescription);

      // Phase 3: Query Ollama
      this.logger.debug('Querying Ollama', {
        decision: this.decisionCount,
        model: this.config.modelName,
        promptLength: prompt.length,
      });

      const response = await this.callOllama(prompt);

      // Phase 4: Parse response into commands
      const commands = this.parseCommands(response, worldState);

      // Phase 5: Return decision
      const decision: BrainDecision = {
        playerID: this.playerID,
        commands,
        reasoning: response.substring(0, 300),
        timestamp: new Date(),
      };

      // Log decision for quality analysis
      this.decisionLogger.logDecision(
        worldState,
        prompt,
        response,
        Date.now() - (decision.timestamp.getTime() - 1000), // Rough latency estimate
        commands,
        true
      );

      this.logger.info('Brain decision made', {
        decision: this.decisionCount,
        commands: commands.length,
        responseLength: response.length,
      });

      return decision;
    } catch (error) {
      this.logger.error('Brain decision failed', {
        decision: this.decisionCount,
        error: String(error),
      });

      // Return empty decision on error (observe-only)
      return {
        playerID: this.playerID,
        commands: [],
        reasoning: `Decision failed: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Shutdown brain
   */
  async shutdown(): Promise<void> {
    this.logger.info('Ollama brain shutdown', {
      totalDecisions: this.decisionCount,
    });
  }

  /**
   * Get decision quality report
   */
  getDecisionReport(): string {
    return this.decisionLogger.generateReport();
  }

  /**
   * Export decision log
   */
  exportDecisions(): string {
    return this.decisionLogger.exportToJSON();
  }

  /**
   * Convert WorldState to natural language game description
   */
  private describeGameState(worldState: WorldState): string {
    const agents = worldState.agents;
    const players = worldState.players;

    const units = agents.filter(a => (a.customData as any)?.type === 'unit');
    const buildings = agents.filter(a => (a.customData as any)?.type === 'building');
    const resources = agents.filter(a => (a.customData as any)?.type === 'resource');

    const friendlyUnits = units.filter(u => u.controlledByPlayerId?.toString() === this.playerID.toString()).length;
    const enemyUnits = units.filter(u => u.controlledByPlayerId?.toString() !== this.playerID.toString()).length;

    const friendlyBuildings = buildings.filter(b => b.controlledByPlayerId?.toString() === this.playerID.toString()).length;
    const enemyBuildings = buildings.filter(b => b.controlledByPlayerId?.toString() !== this.playerID.toString()).length;

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

  /**
   * Build prompt for Ollama inference
   *
   * Focus on MOVE commands only (other command types have format issues).
   * MOVE is proven to work with 0 A.D. RL Interface.
   */
  private buildPrompt(gameDescription: string): string {
    return `You are an AI commander in Age of Empires 2. Your primary job is to move units strategically.

${gameDescription}

IMMEDIATE ACTIONS YOU SHOULD TAKE:
- MOVE your units to good positions for gathering resources
- MOVE to explore the map and find enemy positions
- MOVE to defend your base from threats

Based on the game state above, output 2-3 MOVE orders for your units RIGHT NOW.

For each action, start with: MOVE - [description of where to move and why]

Example format:
MOVE - Send scouts north to find resource locations and enemy positions
MOVE - Position defenders near the town center to protect against attacks
MOVE - Move workers to nearby wood and stone resources

Now output your immediate MOVE orders (be very specific):`;
  }

  /**
   * Call Ollama API and get response
   */
  private async callOllama(prompt: string): Promise<string> {
    const requestBody = {
      model: this.config.modelName,
      prompt,
      stream: false,
      temperature: this.config.temperature,
      top_p: this.config.topP,
      top_k: this.config.topK,
      num_predict: this.config.numPredict,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = (await response.json()) as OllamaResponse;
      return data.response || '';
    } catch (error) {
      this.logger.error('Ollama API call failed', {
        error: String(error),
        model: this.config.modelName,
      });
      throw error;
    }
  }

  /**
   * Parse Ollama response into GameCommand array
   *
   * Strategy: Look for action keywords (MOVE, GATHER, ATTACK, EXPAND)
   * For each keyword found, generate a corresponding command.
   */
  private parseCommands(response: string, worldState: WorldState): GameCommand[] {
    const commands: GameCommand[] = [];

    // Look for explicit action keywords at line start
    const lines = response.split('\n');

    for (const line of lines) {
      const trimmed = line.trim().toUpperCase();

      // MOVE action
      if (trimmed.startsWith('MOVE')) {
        const moveCmd = this.createMoveCommand(worldState);
        if (moveCmd) {
          commands.push(moveCmd);
          this.logger.debug('Parsed MOVE command from Ollama response');
        }
      }

      // GATHER action
      if (trimmed.startsWith('GATHER')) {
        const gatherCmd = this.createGatherCommand(worldState);
        if (gatherCmd) {
          commands.push(gatherCmd);
          this.logger.debug('Parsed GATHER command from Ollama response');
        }
      }

      // ATTACK action
      if (trimmed.startsWith('ATTACK')) {
        const attackCmd = this.createAttackCommand(worldState);
        if (attackCmd) {
          commands.push(attackCmd);
          this.logger.debug('Parsed ATTACK command from Ollama response');
        }
      }

      // Limit to 2 commands per tick (reasonable for RTS AI)
      if (commands.length >= 2) break;
    }

    return commands;
  }

  /**
   * Create a Move command from available units
   *
   * IMPORTANT: Filter for military/support units only, not Gaia creatures
   * Gaia fauna (sheep, deer) have owner=0 and will not respond to commands
   */
  private createMoveCommand(worldState: WorldState): GameCommand | null {
    // Get all units first
    const allUnits = worldState.agents
      .filter(a => (a.customData as any)?.type === 'unit')
      .filter(a => a.controlledByPlayerId?.toString() === this.playerID.toString());

    // Debug log what we found
    const templateSummary = allUnits.map(u => {
      const template = (u.customData as any)?.template || 'unknown';
      const isFauna = template.includes('fauna') || template.includes('flora');
      return `${(u.customData as any)?.entityId}:${template}(fauna=${isFauna})`;
    }).join(' | ');

    this.logger.debug('Unit selection for Move command', {
      allUnitsCount: allUnits.length,
      unitSummary: templateSummary,
    });

    // Filter out fauna
    const units = allUnits
      .filter(u => {
        const template = (u.customData as any)?.template || '';
        return !template.includes('fauna') && !template.includes('flora');
      })
      .slice(0, 3); // Limit to first 3 units

    this.logger.debug('After fauna filter', {
      selectedCount: units.length,
      selectedIds: units.map(u => (u.customData as any)?.entityId).join(','),
    });

    if (units.length === 0) return null;

    const unitIds = units
      .map(u => (u.customData as any)?.entityId)
      .filter(Boolean) as number[];

    if (unitIds.length === 0) return null;

    // Move to a strategic location (not center, but towards resources)
    const targetX = Math.random() * ((worldState.map?.width || 256) * 0.8) + 50;
    const targetZ = Math.random() * ((worldState.map?.height || 256) * 0.8) + 50;

    return {
      playerID: this.playerID,
      json_cmd: {
        type: 'move',
        entities: unitIds,
        x: Math.round(targetX),
        z: Math.round(targetZ),
        queued: false,
      },
    };
  }

  /**
   * Create a Gather command from available resources
   */
  private createGatherCommand(worldState: WorldState): GameCommand | null {
    const gatherUnits = worldState.agents
      .filter(a => (a.customData as any)?.type === 'unit')
      .filter(a => a.controlledByPlayerId?.toString() === this.playerID.toString())
      // Skip Gaia fauna - only use actual player-controlled units
      .filter(u => {
        const template = (u.customData as any)?.template || '';
        return !template.includes('fauna') && !template.includes('flora');
      })
      .slice(0, 2);

    const resources = worldState.agents
      .filter(a => (a.customData as any)?.type === 'resource')
      .slice(0, 1);

    if (gatherUnits.length === 0 || resources.length === 0) return null;

    const unitIds = gatherUnits.map(u => (u.customData as any)?.entityId).filter(Boolean) as number[];
    const resourceId = (resources[0].customData as any)?.entityId;

    if (unitIds.length === 0 || !resourceId) return null;

    return {
      playerID: this.playerID,
      json_cmd: {
        type: 'gather',
        entities: unitIds,
        target: resourceId,
        queued: false,
      },
    };
  }

  /**
   * Create a Build command for new structures
   *
   * Note: Build is complex - requires builder unit to execute.
   * For now, focus on Move commands which are proven to work.
   */
  private createBuildCommand(worldState: WorldState): GameCommand | null {
    // Disabled for now - Build commands have format issues
    // Return null to skip build attempts
    return null;
  }

  /**
   * Create an Attack command against enemy units
   */
  private createAttackCommand(worldState: WorldState): GameCommand | null {
    const attackUnits = worldState.agents
      .filter(a => (a.customData as any)?.type === 'unit')
      .filter(a => a.controlledByPlayerId?.toString() === this.playerID.toString())
      // Skip Gaia fauna - only use actual player-controlled units
      .filter(u => {
        const template = (u.customData as any)?.template || '';
        return !template.includes('fauna') && !template.includes('flora');
      })
      .slice(0, 2);

    const enemyUnits = worldState.agents
      .filter(a => (a.customData as any)?.type === 'unit')
      .filter(a => a.controlledByPlayerId?.toString() !== '1')
      .slice(0, 1);

    if (attackUnits.length === 0 || enemyUnits.length === 0) return null;

    const unitIds = attackUnits.map(u => (u.customData as any)?.entityId).filter(Boolean) as number[];
    const targetId = (enemyUnits[0].customData as any)?.entityId;

    if (unitIds.length === 0 || !targetId) return null;

    return {
      playerID: this.playerID,
      json_cmd: {
        type: 'attack',
        entities: unitIds,
        target: targetId,
        queued: false,
      },
    };
  }

  /**
   * Generate metrics report
   */
  generateReport(): string {
    const lines: string[] = [];

    lines.push('╔═══════════════════════════════════════════════════════╗');
    lines.push('║          OLLAMA AI BRAIN REPORT                      ║');
    lines.push('╚═══════════════════════════════════════════════════════╝');
    lines.push('');

    lines.push('Configuration:');
    lines.push(`  Model:        ${this.config.modelName}`);
    lines.push(`  Base URL:     ${this.config.baseUrl}`);
    lines.push(`  Temperature:  ${this.config.temperature}`);
    lines.push('');

    lines.push('Statistics:');
    lines.push(`  Decisions:    ${this.decisionCount}`);
    lines.push('');

    return lines.join('\n');
  }
}
