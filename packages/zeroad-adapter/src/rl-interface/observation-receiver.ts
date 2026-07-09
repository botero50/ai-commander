/**
 * RL Interface Observation Receiver
 *
 * Receives raw game state observations from the RL Interface and validates them.
 *
 * The RL Interface returns game state as JSON stringified from:
 * cmpAIInterface->GetFullRepresentation(&state, true)
 * which provides the complete observable game state.
 */

import { Logger } from '../config/logger.js';
import { RawGameState, RawPlayer, RawEntity } from './types.js';

export interface ObservationValidation {
  isValid: boolean;
  timestamp: Date;
  tick: number;
  errors: string[];
  warnings: string[];
  fields: {
    tick: boolean;
    time_elapsed: boolean;
    players: boolean;
    entities: boolean;
    mapSize: boolean;
    mapName: boolean;
  };
  stats: {
    playersCount: number;
    entitiesCount: number;
    unitsCount: number;
    buildingsCount: number;
    resourcesCount: number;
  };
}

export class ObservationReceiver {
  private lastObservation: RawGameState | null = null;
  private observationCount = 0;

  constructor(private logger: Logger) {}

  /**
   * Receive and validate a raw game state observation
   */
  async receiveObservation(rawState: RawGameState): Promise<ObservationValidation> {
    this.observationCount++;
    this.lastObservation = rawState;

    const validation = this.validateObservation(rawState);

    if (validation.isValid) {
      this.logger.info('Observation received', {
        tick: rawState.tick,
        players: rawState.players?.length || 0,
        entities: rawState.entities?.length || 0,
        timestamp: validation.timestamp.toISOString(),
      });
    } else {
      this.logger.warn('Invalid observation', {
        tick: rawState.tick,
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    return validation;
  }

  /**
   * Validate observation structure and required fields
   */
  private validateObservation(state: unknown): ObservationValidation {
    const validation: ObservationValidation = {
      isValid: true,
      timestamp: new Date(),
      tick: 0,
      errors: [],
      warnings: [],
      fields: {
        tick: false,
        time_elapsed: false,
        players: false,
        entities: false,
        mapSize: false,
        mapName: false,
      },
      stats: {
        playersCount: 0,
        entitiesCount: 0,
        unitsCount: 0,
        buildingsCount: 0,
        resourcesCount: 0,
      },
    };

    if (!state || typeof state !== 'object') {
      validation.isValid = false;
      validation.errors.push('Observation is not an object');
      return validation;
    }

    const obs = state as Record<string, unknown>;

    // Check required fields
    if (typeof obs.tick === 'number') {
      validation.fields.tick = true;
      validation.tick = obs.tick;
    } else {
      validation.isValid = false;
      validation.errors.push('Missing or invalid tick field (must be number)');
    }

    if (typeof obs.time_elapsed === 'number') {
      validation.fields.time_elapsed = true;
    } else {
      validation.warnings.push('Missing or invalid time_elapsed field');
    }

    if (Array.isArray(obs.players)) {
      validation.fields.players = true;
      validation.stats.playersCount = obs.players.length;

      // Validate each player
      for (const player of obs.players) {
        if (!this.validatePlayer(player)) {
          validation.warnings.push('Invalid player object detected');
        }
      }
    } else {
      validation.isValid = false;
      validation.errors.push('Missing or invalid players field (must be array)');
    }

    if (Array.isArray(obs.entities)) {
      validation.fields.entities = true;
      validation.stats.entitiesCount = obs.entities.length;

      // Count entity types and validate each
      for (const entity of obs.entities) {
        if (!this.validateEntity(entity)) {
          validation.warnings.push('Invalid entity object detected');
          continue;
        }

        const ent = entity as Record<string, unknown>;
        if (ent.type === 'unit') validation.stats.unitsCount++;
        if (ent.type === 'building') validation.stats.buildingsCount++;
        if (ent.type === 'resource') validation.stats.resourcesCount++;
      }
    } else {
      validation.isValid = false;
      validation.errors.push('Missing or invalid entities field (must be array)');
    }

    if (typeof obs.mapSize === 'number') {
      validation.fields.mapSize = true;
    } else {
      validation.warnings.push('Missing or invalid mapSize field');
    }

    if (typeof obs.mapName === 'string') {
      validation.fields.mapName = true;
    } else {
      validation.warnings.push('Missing or invalid mapName field');
    }

    return validation;
  }

  /**
   * Validate a player object
   */
  private validatePlayer(player: unknown): boolean {
    if (!player || typeof player !== 'object') {
      return false;
    }

    const p = player as Record<string, unknown>;

    // Required fields
    if (typeof p.id !== 'number') return false;
    if (typeof p.name !== 'string') return false;
    if (typeof p.resources !== 'object') return false;

    return true;
  }

  /**
   * Validate an entity object
   */
  private validateEntity(entity: unknown): boolean {
    if (!entity || typeof entity !== 'object') {
      return false;
    }

    const e = entity as Record<string, unknown>;

    // Required fields
    if (typeof e.id !== 'number') return false;
    if (typeof e.template !== 'string') return false;
    if (typeof e.owner !== 'number') return false;

    // Type should be one of the known types
    if (!['unit', 'building', 'resource'].includes(e.type as string)) {
      return false;
    }

    return true;
  }

  /**
   * Get last received observation
   */
  getLastObservation(): RawGameState | null {
    return this.lastObservation;
  }

  /**
   * Get total observations received
   */
  getObservationCount(): number {
    return this.observationCount;
  }

  /**
   * Generate observation report
   */
  generateReport(validation: ObservationValidation): string {
    const lines: string[] = [];

    lines.push('╔═══════════════════════════════════════════════════════╗');
    lines.push('║           OBSERVATION VALIDATION REPORT              ║');
    lines.push('╚═══════════════════════════════════════════════════════╝');
    lines.push('');

    // Status
    const status = validation.isValid ? '✓ VALID' : '✗ INVALID';
    lines.push(`Status:     ${status}`);
    lines.push(`Tick:       ${validation.tick}`);
    lines.push(`Timestamp:  ${validation.timestamp.toISOString()}`);
    lines.push('');

    // Fields
    lines.push('Required Fields:');
    lines.push(
      `  tick:         ${validation.fields.tick ? '✓' : '✗'}`
    );
    lines.push(
      `  time_elapsed: ${validation.fields.time_elapsed ? '✓' : '✗'}`
    );
    lines.push(
      `  players:      ${validation.fields.players ? '✓' : '✗'}`
    );
    lines.push(
      `  entities:     ${validation.fields.entities ? '✓' : '✗'}`
    );
    lines.push('');

    // Optional Fields
    lines.push('Optional Fields:');
    lines.push(
      `  mapSize:      ${validation.fields.mapSize ? '✓' : '✗'}`
    );
    lines.push(
      `  mapName:      ${validation.fields.mapName ? '✓' : '✗'}`
    );
    lines.push('');

    // Statistics
    lines.push('Game State Statistics:');
    lines.push(
      `  Players:      ${validation.stats.playersCount}`
    );
    lines.push(
      `  Entities:     ${validation.stats.entitiesCount} total`
    );
    lines.push(
      `    - Units:    ${validation.stats.unitsCount}`
    );
    lines.push(
      `    - Buildings: ${validation.stats.buildingsCount}`
    );
    lines.push(
      `    - Resources: ${validation.stats.resourcesCount}`
    );
    lines.push('');

    // Errors
    if (validation.errors.length > 0) {
      lines.push('Errors:');
      for (const error of validation.errors) {
        lines.push(`  ✗ ${error}`);
      }
      lines.push('');
    }

    // Warnings
    if (validation.warnings.length > 0) {
      lines.push('Warnings:');
      for (const warning of validation.warnings) {
        lines.push(`  ⚠ ${warning}`);
      }
      lines.push('');
    }

    if (validation.errors.length === 0 && validation.warnings.length === 0) {
      lines.push('✓ No errors or warnings');
      lines.push('');
    }

    return lines.join('\n');
  }
}
