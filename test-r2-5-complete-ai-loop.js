#!/usr/bin/env node
/**
 * Story R2.5 — First Complete AI Loop Test
 *
 * Run the complete cycle:
 * Observe → WorldState → Brain → Decision → Execute → Observe
 *
 * For 10 continuous ticks.
 *
 * Prerequisites:
 * - 0 A.D. running with: pyrogenesis.exe --rl-interface=127.0.0.1:6000 --mod=public
 *
 * Run with:
 * npx tsc test-r2-5-complete-ai-loop.ts --module esnext --target es2020 --skipLibCheck true
 * node test-r2-5-complete-ai-loop.js
 */
import { RLHTTPClient } from './packages/zeroad-adapter/src/rl-interface/http-client.js';
import { ObservationReceiver } from './packages/zeroad-adapter/src/rl-interface/observation-receiver.js';
import { CommandExecutor } from './packages/zeroad-adapter/src/rl-interface/command-executor.js';
import { WorldStateMapper } from './packages/zeroad-adapter/src/rl-interface/world-state-mapper.js';
import { AILoopOrchestrator, } from './packages/zeroad-adapter/src/rl-interface/ai-loop-orchestrator.js';
import { Logger } from './packages/zeroad-adapter/src/config/logger.js';
import * as fs from 'fs';
const RL_HOST = '127.0.0.1';
const RL_PORT = 6000;
const LOOP_TICKS = 10;
/**
 * Simple observing brain - just watches without executing
 */
class ObservingBrain {
    constructor(logger) {
        this.logger = logger;
    }
    async decide(worldState) {
        this.logger.debug('Brain observing world state', {
            agents: worldState.agents.length,
            players: worldState.players.length,
        });
        return {
            playerID: 1,
            commands: [],
            reasoning: 'Observing game state without acting',
            timestamp: new Date(),
        };
    }
}
async function main() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   STORY R2.5 — FIRST COMPLETE AI LOOP TEST    ║');
    console.log('║  Observe → WorldState → Brain → Execute Loop  ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    const logger = new Logger();
    const client = new RLHTTPClient(RL_HOST, RL_PORT, 10000, logger);
    const observationReceiver = new ObservationReceiver(logger);
    const commandExecutor = new CommandExecutor(client, logger);
    const worldStateMapper = new WorldStateMapper(logger);
    const brain = new ObservingBrain(logger);
    try {
        // Step 1: Check connectivity
        console.log('[STEP 1] Checking RL Interface connectivity...');
        const reachable = await client.isReachable();
        if (!reachable) {
            console.log(`✗ Cannot reach RL Interface at ${RL_HOST}:${RL_PORT}`);
            console.log('Make sure 0 A.D. is running: pyrogenesis.exe --rl-interface=127.0.0.1:6000 --mod=public');
            process.exit(1);
        }
        console.log(`✓ RL Interface reachable\n`);
        // Step 2: Initialize game
        console.log('[STEP 2] Initializing game with scenario...');
        const scenario = {
            settings: {
                Map: 'Skirmish/Cantabria',
                PlayerData: [{ Civ: 'athen' }, { Civ: 'gaul' }],
            },
        };
        const initialState = await client.reset(scenario);
        console.log(`✓ Game initialized at tick ${initialState.tick}\n`);
        // Step 3: Run the AI loop
        console.log(`[STEP 3] Running complete AI loop for ${LOOP_TICKS} ticks...\n`);
        const orchestrator = new AILoopOrchestrator(client, observationReceiver, commandExecutor, worldStateMapper, brain, logger);
        const startTime = Date.now();
        const finalState = await orchestrator.runLoop(LOOP_TICKS);
        const duration = Date.now() - startTime;
        // Step 4: Print results
        console.log('\n[RESULTS]\n');
        console.log(orchestrator.generateReport());
        // Save detailed metrics
        const metricsPath = 'test-r2-5-metrics.json';
        fs.writeFileSync(metricsPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            story: 'R2.5 - First Complete AI Loop',
            configuration: {
                ticks: LOOP_TICKS,
                host: RL_HOST,
                port: RL_PORT,
            },
            duration: {
                totalMs: duration,
                totalSeconds: (duration / 1000).toFixed(1),
            },
            summary: {
                ticksCompleted: finalState.metrics.length,
                avgLatencyMs: finalState.metrics.reduce((a, b) => a + b.totalTime, 0) /
                    finalState.metrics.length,
                totalCommandsExecuted: finalState.metrics.reduce((a, b) => a + b.commandsExecuted, 0),
                totalCommandsSuccessful: finalState.metrics.reduce((a, b) => a + b.commandsSuccessful, 0),
            },
            metrics: finalState.metrics,
        }, null, 2));
        console.log(`Detailed metrics saved to ${metricsPath}`);
        // Check success criteria
        const allTicksComplete = finalState.metrics.length === LOOP_TICKS;
        const allObservationsValid = finalState.metrics.every((m) => m.observationValid);
        const avgLatency = finalState.metrics.reduce((a, b) => a + b.totalTime, 0) /
            finalState.metrics.length;
        const acceptableLatency = avgLatency < 5000; // 5 seconds per tick is acceptable
        console.log('\n[VALIDATION CRITERIA]\n');
        console.log(`${allTicksComplete ? '✓' : '✗'} All ticks completed (${finalState.metrics.length}/${LOOP_TICKS})`);
        console.log(`${allObservationsValid ? '✓' : '✗'} All observations valid`);
        console.log(`${acceptableLatency ? '✓' : '✗'} Latency acceptable (avg ${avgLatency.toFixed(0)}ms)`);
        console.log('');
        if (allTicksComplete && allObservationsValid && acceptableLatency) {
            console.log('\n╔════════════════════════════════════════════════╗');
            console.log('║  ✓ AI LOOP COMPLETE AND VALIDATED            ║');
            console.log('║  Story R2.5 Definition of Done: SATISFIED    ║');
            console.log('╚════════════════════════════════════════════════╝\n');
            process.exit(0);
        }
        else {
            console.log('\n╔════════════════════════════════════════════════╗');
            console.log('║  ⚠ AI LOOP HAS ISSUES                        ║');
            console.log('╚════════════════════════════════════════════════╝\n');
            process.exit(1);
        }
    }
    catch (error) {
        console.error('\n✗ ERROR:', error);
        process.exit(1);
    }
}
main();
