/**
 * Observation & Prompt Protocol
 *
 * Canonical format for world observations.
 * Every LLM provider receives EXACTLY the same information.
 * Supports both structured JSON and human-readable prompt rendering.
 */

import type { FakeWorldSnapshot } from './fake-world-state.js';

export interface ObservationJSON {
  readonly tick: number;
  readonly gameState: string;
  readonly resources: number;
  readonly workers: ReadonlyArray<{
    readonly id: number;
    readonly position: { x: number; y: number };
    readonly carrying: number;
    readonly busy: boolean;
  }>;
  readonly military: ReadonlyArray<{
    readonly id: string;
    readonly type: string;
    readonly position: { x: number; y: number };
    readonly health: number;
  }>;
  readonly knownEnemies: ReadonlyArray<{
    readonly id: string;
    readonly position: { x: number; y: number };
    readonly lastSeen: number;
  }>;
  readonly resourceDeposits: ReadonlyArray<{
    readonly location: string;
    readonly remaining: number;
  }>;
  readonly base: { x: number; y: number };
}

export interface ObservationContext {
  readonly timestamp: number;
  readonly matchId: string;
  readonly playerId: string;
}

export interface CanonicalObservation {
  readonly context: ObservationContext;
  readonly json: ObservationJSON;
  readonly prompt: string;
}

/**
 * Converts world snapshot to canonical JSON format
 */
export function worldToJSON(world: FakeWorldSnapshot): ObservationJSON {
  const workers = world.workers.map((w) => ({
    id: w.id,
    position: { x: w.x, y: w.y },
    carrying: w.carrying,
    busy: w.busy,
  }));

  const military = world.militaryUnits.map((m) => ({
    id: String(m.id),
    type: m.type,
    position: { x: m.x, y: m.y },
    health: m.health,
  }));

  const knownEnemies = world.knownEnemies.map((e) => ({
    id: String(e.unitId),
    position: { x: e.x, y: e.y },
    lastSeen: e.lastSeen,
  }));

  const deposits = Array.from(world.resourceDeposits.entries()).map(([loc, remaining]) => ({
    location: loc,
    remaining,
  }));

  return {
    tick: world.tick,
    gameState: world.gameState,
    resources: world.playerResources,
    workers,
    military,
    knownEnemies,
    resourceDeposits: deposits,
    base: { x: world.baseX, y: world.baseY },
  };
}

/**
 * Renders canonical observation as human-readable prompt
 */
export function renderPrompt(observation: ObservationJSON): string {
  let prompt = `=== WORLD OBSERVATION (Tick ${observation.tick}) ===\n\n`;

  prompt += `STATUS: ${observation.gameState.toUpperCase()}\n`;
  prompt += `Resources: ${observation.resources}\n`;
  prompt += `Base Location: (${observation.base.x}, ${observation.base.y})\n\n`;

  prompt += `--- WORKFORCE ---\n`;
  if (observation.workers.length === 0) {
    prompt += 'No workers available\n';
  } else {
    prompt += `Workers: ${observation.workers.length}\n`;
    for (const worker of observation.workers) {
      const status = worker.busy ? 'busy' : 'idle';
      prompt += `  Worker ${worker.id}: (${worker.x},${worker.y}) carrying=${worker.carrying} [${status}]\n`;
    }
  }
  prompt += '\n';

  prompt += `--- MILITARY ---\n`;
  if (observation.military.length === 0) {
    prompt += 'No military units\n';
  } else {
    prompt += `Units: ${observation.military.length}\n`;
    for (const unit of observation.military) {
      prompt += `  ${unit.type.toUpperCase()}: (${unit.x},${unit.y}) health=${unit.health}\n`;
    }
  }
  prompt += '\n';

  prompt += `--- KNOWN ENEMIES ---\n`;
  if (observation.knownEnemies.length === 0) {
    prompt += 'No known enemies\n';
  } else {
    prompt += `Enemies: ${observation.knownEnemies.length}\n`;
    for (const enemy of observation.knownEnemies) {
      const age = 'unknown'; // Could calculate from lastSeen if we knew current tick
      prompt += `  Enemy ${enemy.id}: (${enemy.x},${enemy.y}) last-seen=${age}\n`;
    }
  }
  prompt += '\n';

  prompt += `--- RESOURCE DEPOSITS ---\n`;
  if (observation.resourceDeposits.length === 0) {
    prompt += 'No known deposits\n';
  } else {
    for (const deposit of observation.resourceDeposits) {
      prompt += `  ${deposit.location}: ${deposit.remaining} remaining\n`;
    }
  }
  prompt += '\n';

  return prompt;
}

/**
 * Creates canonical observation from world state
 */
export function createObservation(
  world: FakeWorldSnapshot,
  matchId: string,
  playerId: string
): CanonicalObservation {
  const json = worldToJSON(world);
  const prompt = renderPrompt(json);

  return {
    context: {
      timestamp: Date.now(),
      matchId,
      playerId,
    },
    json,
    prompt,
  };
}

/**
 * Validates observation integrity
 */
export function validateObservation(observation: CanonicalObservation): string[] {
  const errors: string[] = [];

  if (observation.context.matchId.length === 0) {
    errors.push('Invalid matchId');
  }

  if (observation.context.playerId.length === 0) {
    errors.push('Invalid playerId');
  }

  if (observation.json.tick < 0) {
    errors.push('Tick cannot be negative');
  }

  if (observation.json.resources < 0) {
    errors.push('Resources cannot be negative');
  }

  if (observation.json.workers.length > 0 && observation.json.workers.length > 100) {
    errors.push('Unreasonable worker count');
  }

  if (observation.json.military.length > 0 && observation.json.military.length > 500) {
    errors.push('Unreasonable military count');
  }

  if (!observation.prompt || observation.prompt.length === 0) {
    errors.push('Empty prompt');
  }

  return errors;
}

/**
 * Observation statistics for analysis
 */
export function getObservationStats(observation: CanonicalObservation): {
  workerCount: number;
  militaryCount: number;
  enemyCount: number;
  depositCount: number;
  totalUnits: number;
  promptLength: number;
  jsonSize: number;
} {
  return {
    workerCount: observation.json.workers.length,
    militaryCount: observation.json.military.length,
    enemyCount: observation.json.knownEnemies.length,
    depositCount: observation.json.resourceDeposits.length,
    totalUnits: observation.json.workers.length + observation.json.military.length,
    promptLength: observation.prompt.length,
    jsonSize: JSON.stringify(observation.json).length,
  };
}
