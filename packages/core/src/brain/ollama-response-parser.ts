/**
 * Ollama Response Parser
 *
 * Parses Ollama LLM responses into structured game commands.
 * Extracts action keywords and constructs valid GameCommand objects.
 */

import { Logger } from '../config/logger.js';

export interface GameCommand {
  playerID: number;
  json_cmd: {
    type: string;
    entities?: number[];
    x?: number;
    z?: number;
    target?: number;
    queued?: boolean;
    template?: string;
    angle?: number;
    building?: number;
  };
}

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
  agents?: Agent[];
  map?: { width?: number; height?: number };
  [key: string]: any;
}

export class OllamaResponseParser {
  private logger: Logger;
  private playerID: number;

  constructor(logger: Logger, playerID: number) {
    this.logger = logger;
    this.playerID = playerID;
  }

  /**
   * Parse Ollama response into GameCommand array
   *
   * Strategy: Look for action keywords (MOVE, GATHER, ATTACK, EXPAND)
   * For each keyword found, generate a corresponding command.
   */
  parseCommands(response: string, worldState: WorldState): GameCommand[] {
    const commands: GameCommand[] = [];

    // Look for action instructions in multiple formats:
    // - "1. MOVE - ..." (primary format we prompt for)
    // - "1. "Move ..." (alternative format some models use)
    // - "MOVE ..." (unnumbered format)
    const lines = response.split('\n');

    this.logger.debug('Parsing Ollama response for commands', {
      responsePreview: response.substring(0, 200),
      totalLines: lines.length,
    });

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Format 1: "1. MOVE - ..." or "1. ATTACK - ..."
      // Format 2: "1. "Move ..." (quoted format)
      // Format 3: "MOVE - ..." (unnumbered)
      const actionMatch = trimmed.match(
        /(?:^\d+\.\s+)?["\']?(MOVE|GATHER|ATTACK|DEFEND|BUILD|TRAIN|RESEARCH)/i
      );

      if (actionMatch) {
        const action = actionMatch[1].toUpperCase();

        if (action === 'MOVE' || action === 'DEFEND') {
          const moveCmd = this.createMoveCommand(worldState);
          if (moveCmd) {
            commands.push(moveCmd);
            this.logger.info('✓ Parsed MOVE command from Ollama', {
              line: trimmed.substring(0, 80),
            });
          }
        } else if (action === 'BUILD') {
          const buildCmd = this.createBuildCommand(worldState);
          if (buildCmd) {
            commands.push(buildCmd);
            this.logger.info('✓ Parsed BUILD command from Ollama', {
              line: trimmed.substring(0, 80),
            });
          }
        } else if (action === 'TRAIN') {
          const trainCmd = this.createTrainCommand(worldState);
          if (trainCmd) {
            commands.push(trainCmd);
            this.logger.info('✓ Parsed TRAIN command from Ollama', {
              line: trimmed.substring(0, 80),
            });
          }
        } else if (action === 'GATHER' || action === 'RESEARCH') {
          const gatherCmd = this.createGatherCommand(worldState);
          if (gatherCmd) {
            commands.push(gatherCmd);
            this.logger.info(`✓ Parsed ${action} command from Ollama`, {
              line: trimmed.substring(0, 80),
            });
          }
        } else if (action === 'ATTACK') {
          const attackCmd = this.createAttackCommand(worldState);
          if (attackCmd) {
            commands.push(attackCmd);
            this.logger.info('✓ Parsed ATTACK command from Ollama', {
              line: trimmed.substring(0, 80),
            });
          }
        }

        // Limit to 3 commands per tick (allows more diverse actions)
        if (commands.length >= 3) break;
      }
    }

    if (commands.length === 0) {
      this.logger.warn('⚠️ No commands parsed from Ollama response', {
        responseLength: response.length,
        supportedFormats: ['1. MOVE - ...', '1. "Move ...', 'MOVE - ...'],
        firstLines: lines.slice(0, 3).join(' | '),
      });
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
    const agents = worldState.agents || [];

    // Get all units first
    const allUnits = agents
      .filter(a => a.customData?.type === 'unit')
      .filter(a => a.controlledByPlayerId?.toString() === this.playerID.toString());

    // Debug log what we found
    const templateSummary = allUnits
      .map(u => {
        const template = u.customData?.template || 'unknown';
        const isFauna = template.includes('fauna') || template.includes('flora');
        return `${u.customData?.entityId}:${template}(fauna=${isFauna})`;
      })
      .join(' | ');

    this.logger.debug('Unit selection for Move command', {
      allUnitsCount: allUnits.length,
      unitSummary: templateSummary,
    });

    // Filter out fauna
    const units = allUnits
      .filter(u => {
        const template = u.customData?.template || '';
        return !template.includes('fauna') && !template.includes('flora');
      })
      .slice(0, 3); // Limit to first 3 units

    this.logger.debug('After fauna filter', {
      selectedCount: units.length,
      selectedIds: units.map(u => u.customData?.entityId).join(','),
    });

    if (units.length === 0) return null;

    const unitIds = units
      .map(u => u.customData?.entityId)
      .filter(Boolean) as number[];

    if (unitIds.length === 0) return null;

    // Move to a strategic location (not center, but towards resources)
    const mapWidth = worldState.map?.width || 256;
    const mapHeight = worldState.map?.height || 256;
    const targetX = Math.random() * (mapWidth * 0.8) + 50;
    const targetZ = Math.random() * (mapHeight * 0.8) + 50;

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
    const agents = worldState.agents || [];

    const gatherUnits = agents
      .filter(a => a.customData?.type === 'unit')
      .filter(a => a.controlledByPlayerId?.toString() === this.playerID.toString())
      // Skip Gaia fauna - only use actual player-controlled units
      .filter(u => {
        const template = u.customData?.template || '';
        return !template.includes('fauna') && !template.includes('flora');
      })
      .slice(0, 2);

    const resources = agents.filter(a => a.customData?.type === 'resource').slice(0, 1);

    if (gatherUnits.length === 0 || resources.length === 0) return null;

    const unitIds = gatherUnits
      .map(u => u.customData?.entityId)
      .filter(Boolean) as number[];
    const resourceId = resources[0].customData?.entityId;

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
   * Create a Build command for new structures (barracks, houses, economic buildings)
   *
   * BUILD is critical for winning - it produces units and infrastructure.
   * We build near the player's existing town center, trying different building types.
   */
  private createBuildCommand(worldState: WorldState): GameCommand | null {
    const agents = worldState.agents || [];

    // Find our buildings to build near them
    const friendlyBuildings = agents
      .filter(a => a.customData?.type === 'building')
      .filter(a => a.controlledByPlayerId?.toString() === this.playerID.toString());

    if (friendlyBuildings.length === 0) {
      this.logger.debug('No friendly buildings found to build near');
      return null;
    }

    // Build near our first building (town center)
    const existingBuilding = friendlyBuildings[0];
    const baseX = existingBuilding.customData?.positionRaw?.x || 200;
    const baseZ = existingBuilding.customData?.positionRaw?.z || 200;

    // Pick a random offset from base to avoid overlap
    const offsetX = (Math.random() - 0.5) * 80;
    const offsetZ = (Math.random() - 0.5) * 80;

    // Prioritize barracks (produces soldiers) then houses/storage (support economy)
    // Support multiple civilization building names
    const buildingTypes = [
      'structures/athen_barracks',
      'structures/mace_barracks',
      'structures/pers_barracks',
      'structures/barracks',
      'structures/house',
      'structures/storage_house',
      'structures/warehouse',
    ];

    const buildingType = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];

    this.logger.info('Building structure', {
      type: buildingType,
      position: { x: Math.round(baseX + offsetX), z: Math.round(baseZ + offsetZ) },
    });

    return {
      playerID: this.playerID,
      json_cmd: {
        type: 'build',
        template: buildingType,
        x: Math.round(baseX + offsetX),
        z: Math.round(baseZ + offsetZ),
        angle: 0,
        queued: false,
      },
    };
  }

  /**
   * Create a Train command - order buildings to produce units
   *
   * TRAIN is the primary win condition - more units = victory!
   * We find ANY production building (barracks, stables, temples) and order unit production.
   */
  private createTrainCommand(worldState: WorldState): GameCommand | null {
    const agents = worldState.agents || [];

    // Find all buildings that might produce units
    const allBuildings = agents
      .filter(a => a.customData?.type === 'building')
      .filter(a => a.controlledByPlayerId?.toString() === this.playerID.toString());

    // Log what buildings we have
    if (allBuildings.length > 0) {
      const buildingTemplates = allBuildings.map(b => b.customData?.template || 'unknown');
      this.logger.debug('Available buildings for training', {
        count: allBuildings.length,
        templates: buildingTemplates.join(', '),
      });
    }

    // Find production buildings (barracks, stables, temples, ranges)
    const productionBuildings = allBuildings.filter(b => {
      const template = b.customData?.template || '';
      return (
        template.includes('barracks') ||
        template.includes('stable') ||
        template.includes('range') ||
        template.includes('temple') ||
        template.includes('armory')
      );
    });

    if (productionBuildings.length === 0) {
      this.logger.debug('No production buildings found yet', {
        totalBuildings: allBuildings.length,
      });
      return null;
    }

    // Pick first available production building
    const productionBuilding = productionBuildings[0];
    const buildingId = productionBuilding.customData?.entityId;
    if (!buildingId) return null;

    // Train different unit types - support multiple civilizations
    const unitTypes = [
      'units/athen_infantry_swordsman_b',
      'units/athen_cavalry',
      'units/athen_ranged',
      'units/mace_cavalry',
      'units/pers_cavalry',
    ];

    const unitType = unitTypes[Math.floor(Math.random() * unitTypes.length)];

    this.logger.info('Queueing unit training', {
      building: productionBuilding.customData?.template,
      buildingId,
      unit: unitType,
    });

    return {
      playerID: this.playerID,
      json_cmd: {
        type: 'train',
        building: buildingId,
        template: unitType,
        queued: true,
      },
    };
  }

  /**
   * Create an Attack command against enemy units
   */
  private createAttackCommand(worldState: WorldState): GameCommand | null {
    const agents = worldState.agents || [];

    const attackUnits = agents
      .filter(a => a.customData?.type === 'unit')
      .filter(a => a.controlledByPlayerId?.toString() === this.playerID.toString())
      // Skip Gaia fauna - only use actual player-controlled units
      .filter(u => {
        const template = u.customData?.template || '';
        return !template.includes('fauna') && !template.includes('flora');
      })
      .slice(0, 2);

    const enemyUnits = agents
      .filter(a => a.customData?.type === 'unit')
      .filter(a => a.controlledByPlayerId?.toString() !== '1')
      .slice(0, 1);

    if (attackUnits.length === 0 || enemyUnits.length === 0) return null;

    const unitIds = attackUnits
      .map(u => u.customData?.entityId)
      .filter(Boolean) as number[];
    const targetId = enemyUnits[0].customData?.entityId;

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
}
