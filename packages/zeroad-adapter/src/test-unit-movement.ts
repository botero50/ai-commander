/**
 * Test: Verify Unit Movement
 *
 * 1. Record initial unit positions
 * 2. Send explicit move command to specific location
 * 3. Wait 10 ticks
 * 4. Record final positions
 * 5. Calculate distance moved
 */

import { RLHTTPClient } from './rl-interface/http-client.js';
import { Logger } from './config/logger.js';
import { WorldStateMapper } from './rl-interface/world-state-mapper.js';

async function main() {
  const logger = new Logger('info');
  const client = new RLHTTPClient('127.0.0.1', 6000, 30000, logger);

  try {
    // Get initial state
    logger.info('=== STEP 1: RECORD INITIAL POSITIONS ===');
    let state = await client.step([]);
    const initialPositions = new Map<number, { x: number; z: number }>();

    const targetUnits = [9340, 9341, 9342]; // Athenian spearmen/slingers

    Object.values(state.entities).forEach((entity: any) => {
      if (targetUnits.includes(entity.id)) {
        initialPositions.set(entity.id, {
          x: entity.position?.[0] || 0,
          z: entity.position?.[1] || 0,
        });
        logger.info(`Unit ${entity.id} initial position: (${entity.position?.[0]}, ${entity.position?.[1]})`);
      }
    });

    // Send move command to specific location
    logger.info('\n=== STEP 2: SEND MOVE COMMAND ===');
    const targetX = 300;
    const targetZ = 300;
    logger.info(`Sending move command: units [${targetUnits}] → (${targetX}, ${targetZ})`);

    const moveCommand = {
      playerID: 1,
      json_cmd: {
        type: 'move',
        entities: targetUnits,
        x: targetX,
        z: targetZ,
        queued: false,
      },
    };

    state = await client.step([moveCommand]);
    logger.info('Move command sent, tick: ' + state.tick);

    // Wait 10 ticks
    logger.info('\n=== STEP 3: WAIT 10 TICKS ===');
    for (let i = 0; i < 10; i++) {
      state = await client.step([]);
      if (i % 3 === 0) {
        logger.info(`Tick ${i + 1}/10, game tick: ${state.tick}`);
      }
    }

    // Record final positions
    logger.info('\n=== STEP 4: RECORD FINAL POSITIONS ===');
    const finalPositions = new Map<number, { x: number; z: number }>();

    Object.values(state.entities).forEach((entity: any) => {
      if (targetUnits.includes(entity.id)) {
        finalPositions.set(entity.id, {
          x: entity.position?.[0] || 0,
          z: entity.position?.[1] || 0,
        });
        logger.info(`Unit ${entity.id} final position: (${entity.position?.[0]}, ${entity.position?.[1]})`);
      }
    });

    // Calculate distances
    logger.info('\n=== STEP 5: ANALYZE MOVEMENT ===');
    let totalDistance = 0;
    for (const unitId of targetUnits) {
      const initial = initialPositions.get(unitId);
      const final = finalPositions.get(unitId);

      if (initial && final) {
        const dx = final.x - initial.x;
        const dz = final.z - initial.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        totalDistance += distance;

        const moved = distance > 5 ? '✓ MOVED' : '✗ STATIONARY';
        logger.info(`Unit ${unitId}: ${moved} (distance: ${distance.toFixed(1)})`);
        logger.info(`  Before: (${initial.x.toFixed(1)}, ${initial.z.toFixed(1)})`);
        logger.info(`  After:  (${final.x.toFixed(1)}, ${final.z.toFixed(1)})`);
        logger.info(`  Target: (${targetX}, ${targetZ})`);
      }
    }

    const avgDistance = totalDistance / targetUnits.length;
    if (avgDistance > 5) {
      logger.info(`\n✓ UNITS MOVED (avg distance: ${avgDistance.toFixed(1)})`);
      logger.info('✓ Move commands ARE working');
    } else {
      logger.info(`\n✗ UNITS DID NOT MOVE (avg distance: ${avgDistance.toFixed(1)})`);
      logger.info('✗ Move commands are NOT working');
    }
  } catch (error) {
    logger.error('Test failed', { error: String(error) });
    process.exit(1);
  }
}

main();
