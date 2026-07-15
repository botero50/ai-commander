/**
 * Ollama Request Builder
 *
 * Constructs strategic game state descriptions and prompts for Ollama.
 * Separates prompt engineering from orchestration logic.
 */

import { Logger } from '../config/logger.js';

interface Agent {
  customData?: {
    type?: string;
    entityId?: number;
    template?: string;
    positionRaw?: { x: number; z: number };
  };
  controlledByPlayerId?: number | string;
}

interface WorldState {
  tick?: { number: number };
  time?: { currentTick: { number: number } };
  agents?: Agent[];
  players?: Array<{ id: number; name: string; [key: string]: any }>;
  map?: { name?: string; width?: number; height?: number };
  [key: string]: any;
}

export class OllamaRequestBuilder {
  private logger: Logger;
  private playerID: number;

  constructor(logger: Logger, playerID: number) {
    this.logger = logger;
    this.playerID = playerID;
  }

  /**
   * Convert WorldState to natural language game description
   */
  describeGameState(worldState: WorldState): string {
    const agents = worldState.agents || [];
    const players = worldState.players || [];

    const units = agents.filter(a => a.customData?.type === 'unit');
    const buildings = agents.filter(a => a.customData?.type === 'building');
    const resources = agents.filter(a => a.customData?.type === 'resource');

    const friendlyUnits = units.filter(
      u => u.controlledByPlayerId?.toString() === this.playerID.toString()
    ).length;
    const enemyUnits = units.filter(
      u => u.controlledByPlayerId?.toString() !== this.playerID.toString()
    ).length;

    const friendlyBuildings = buildings.filter(
      b => b.controlledByPlayerId?.toString() === this.playerID.toString()
    ).length;
    const enemyBuildings = buildings.filter(
      b => b.controlledByPlayerId?.toString() !== this.playerID.toString()
    ).length;

    // Calculate unit advantage/disadvantage
    const unitDifference = friendlyUnits - enemyUnits;
    const buildingDifference = friendlyBuildings - enemyBuildings;
    const strength =
      unitDifference > 0 ? 'STRONGER' : unitDifference < 0 ? 'WEAKER' : 'EQUAL';

    // Describe resource availability
    const resourceInfo =
      resources.length > 0
        ? `${resources.length} resource points visible on map`
        : 'NO resources visible - must explore or secure existing areas';

    const tick = worldState.time?.currentTick?.number || worldState.tick?.number || 0;
    const mapName = worldState.map?.name || 'Unknown';
    const mapWidth = worldState.map?.width || 256;
    const mapHeight = worldState.map?.height || 256;

    return `
GAME STATE AT TICK ${tick}

PLAYERS:
${players.map(p => `- ${p.name} (ID: ${p.id})`).join('\n')}

YOUR FORCES:
- Units: ${friendlyUnits}
- Buildings: ${friendlyBuildings}

ENEMY FORCES:
- Units: ${enemyUnits}
- Buildings: ${enemyBuildings}

SITUATION:
- You are ${strength} than the enemy (${unitDifference > 0 ? '+' : ''}${unitDifference} units)
- ${resourceInfo}

MAP: ${mapName} (${mapWidth}x${mapHeight})

STRATEGY PRIORITIES (in order):
1. If enemy has more units: DEFEND your base and BUILD more units to catch up
2. If you have fewer buildings: BUILD structures to produce units and gather resources
3. If enemy is close: MOVE units to defensive positions near your base
4. If resources are nearby: MOVE workers to gather (especially wood/stone for building)
5. If ahead: MOVE to attack/expand and BUILD additional structures

CRITICAL: You must TRAIN new units constantly - you only win by having more/better units than the enemy!
    `.trim();
  }

  /**
   * Build strategic prompt for Ollama inference
   *
   * Asks for diverse actions: TRAIN (most important for winning), BUILD, MOVE, GATHER, ATTACK
   * These get parsed into game commands and executed via RL Interface.
   */
  buildPrompt(gameDescription: string): string {
    return `You are a strategic commander in Age of Empires 2. Your civilization is at war.

${gameDescription}

=== YOUR STRATEGIC DECISION ===

You must take 2-3 IMMEDIATE ACTIONS from the options below:

AVAILABLE ACTIONS:
1. TRAIN - Order your buildings to produce new units (BEST WAY TO WIN - more units = victory)
2. BUILD - Construct new structures (houses, barracks, workshops) to support your economy
3. MOVE - Reposition units for defense, gathering, or attack
4. GATHER - Send workers to collect wood/stone/food from nearby resources
5. ATTACK - Assault enemy units or structures (only if you have unit advantage)

DECISION CRITERIA:
- If you have fewer units than enemy: TRAIN or BUILD military structures (urgent!)
- If you have fewer buildings: BUILD economic/military structures
- If resources are exposed: MOVE workers to GATHER them
- If enemy is attacking: MOVE defense units and TRAIN more
- If you're ahead: ATTACK to destroy enemy structures and units

=== OUTPUT YOUR ORDERS ===

For each action, write:
[ACTION TYPE] - [description of why and what]

Example format:
TRAIN - Build 5 infantry units at the barracks to counter enemy forces
BUILD - Construct a new barracks to produce military units faster
MOVE - Reposition defense units around the town center perimeter
GATHER - Send 4 workers to the nearby wood forest northeast of base

NOW OUTPUT 2-3 STRATEGIC ACTIONS FOR THIS TICK (be specific and justify why):`;
  }

  /**
   * Log builder activities
   */
  debug(message: string, data?: any): void {
    this.logger.debug(message, data);
  }

  info(message: string, data?: any): void {
    this.logger.info(message, data);
  }

  warn(message: string, data?: any): void {
    this.logger.warn(message, data);
  }
}
