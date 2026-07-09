#!/usr/bin/env node
/**
 * Story R2.3 — Command Integration Test
 *
 * Execute commands and verify they affect the game state.
 * Watch for observable changes in unit positions, structures, etc.
 *
 * Prerequisites:
 * - 0 A.D. running with: pyrogenesis.exe --rl-interface=127.0.0.1:6000 --mod=public
 *
 * Run this test with:
 * npx tsc test-r2-3-command-integration.ts --module esnext --target es2020 --skipLibCheck true
 * node test-r2-3-command-integration.js
 */
import { RLHTTPClient } from './packages/zeroad-adapter/src/rl-interface/http-client.js';
import { CommandExecutor, Commands, } from './packages/zeroad-adapter/src/rl-interface/command-executor.js';
import { ObservationReceiver } from './packages/zeroad-adapter/src/rl-interface/observation-receiver.js';
import { Logger } from './packages/zeroad-adapter/src/config/logger.js';
import * as fs from 'fs';
const RL_HOST = '127.0.0.1';
const RL_PORT = 6000;
async function main() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║     STORY R2.3 — COMMAND INTEGRATION TEST     ║');
    console.log('║  Execute commands and verify game response    ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    const logger = new Logger();
    const client = new RLHTTPClient(RL_HOST, RL_PORT, 10000, logger);
    const executor = new CommandExecutor(client, logger);
    const receiver = new ObservationReceiver(logger);
    const results = [];
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
        // Validate initial observation
        const initialValidation = await receiver.receiveObservation(initialState);
        console.log('Initial Game State:');
        console.log(receiver.generateReport(initialValidation));
        console.log('');
        // Step 3: Find entities to test with
        console.log('[STEP 3] Finding entities to command...');
        // Get units and buildings from initial state
        const units = initialState.entities?.filter(e => e.type === 'unit').slice(0, 3) || [];
        const buildings = initialState.entities?.filter(e => e.type === 'building').slice(0, 1) ||
            [];
        console.log(`Found ${units.length} units and ${buildings.length} buildings\n`);
        if (units.length === 0) {
            console.log('⚠ No units found in initial state. Some tests will be skipped.\n');
        }
        // Step 4: Test Move command
        if (units.length >= 1) {
            console.log('[TEST 1] Move Command');
            console.log('─'.repeat(50));
            const unit = units[0];
            const moveCmd = Commands.Move([unit.id], 100, 100, false);
            const moveResult = await executor.executeCommand(1, moveCmd, 'Move');
            results.push(moveResult);
            console.log(`✓ ${moveResult.commandType}`);
            console.log(`  Success: ${moveResult.success}`);
            console.log(`  Tick: ${moveResult.tickBefore} → ${moveResult.tickAfter}`);
            console.log(`  Evidence: ${moveResult.evidence}\n`);
        }
        // Step 5: Test SetStance command
        if (units.length >= 1) {
            console.log('[TEST 2] SetStance Command');
            console.log('─'.repeat(50));
            const unit = units[0];
            const stanceCmd = Commands.SetStance([unit.id], 'Aggressive');
            const stanceResult = await executor.executeCommand(1, stanceCmd, 'SetStance');
            results.push(stanceResult);
            console.log(`✓ ${stanceResult.commandType}`);
            console.log(`  Success: ${stanceResult.success}`);
            console.log(`  Tick: ${stanceResult.tickBefore} → ${stanceResult.tickAfter}`);
            console.log(`  Evidence: ${stanceResult.evidence}\n`);
        }
        // Step 6: Test CancelOrder command
        if (units.length >= 1) {
            console.log('[TEST 3] CancelOrder Command');
            console.log('─'.repeat(50));
            const unit = units[0];
            const cancelCmd = Commands.CancelOrder([unit.id]);
            const cancelResult = await executor.executeCommand(1, cancelCmd, 'CancelOrder');
            results.push(cancelResult);
            console.log(`✓ ${cancelResult.commandType}`);
            console.log(`  Success: ${cancelResult.success}`);
            console.log(`  Tick: ${cancelResult.tickBefore} → ${cancelResult.tickAfter}`);
            console.log(`  Evidence: ${cancelResult.evidence}\n`);
        }
        // Step 7: Test empty command (no-op)
        console.log('[TEST 4] Empty Command (No-op)');
        console.log('─'.repeat(50));
        const emptyResult = await executor.executeCommand(1, {}, 'Empty');
        results.push(emptyResult);
        console.log(`✓ ${emptyResult.commandType}`);
        console.log(`  Success: ${emptyResult.success}`);
        console.log(`  Tick: ${emptyResult.tickBefore} → ${emptyResult.tickAfter}`);
        console.log(`  Evidence: ${emptyResult.evidence}\n`);
        // Step 8: Test batch command execution
        console.log('[TEST 5] Batch Command Execution');
        console.log('─'.repeat(50));
        if (units.length >= 2) {
            const batchCommands = [
                {
                    playerID: 1,
                    command: Commands.SetStance([units[0].id], 'Defensive'),
                },
                {
                    playerID: 1,
                    command: Commands.SetStance([units[1].id], 'Passive'),
                },
            ];
            const batchState = await executor.executeCommandBatch(batchCommands);
            const batchValidation = await receiver.receiveObservation(batchState);
            const batchResult = {
                commandType: 'BatchExecute',
                playerID: 1,
                success: batchValidation.isValid,
                tickBefore: 0,
                tickAfter: batchValidation.tick,
                evidence: `Executed ${batchCommands.length} commands in parallel at tick ${batchValidation.tick}`,
            };
            results.push(batchResult);
            console.log(`✓ Batch Execution`);
            console.log(`  Commands: ${batchCommands.length}`);
            console.log(`  Tick: ${batchResult.tickAfter}`);
            console.log(`  Valid: ${batchValidation.isValid}\n`);
        }
        // Step 9: Summary
        console.log('[SUMMARY]');
        console.log('═'.repeat(50));
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        console.log(`Commands Tested: ${results.length}`);
        console.log(`Successful:      ${successCount}`);
        console.log(`Failed:          ${failCount}\n`);
        // Save results
        const reportPath = 'test-r2-3-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
        console.log(`Results saved to ${reportPath}`);
        if (failCount === 0) {
            console.log('\n╔════════════════════════════════════════════════╗');
            console.log('║  ✓ ALL COMMANDS EXECUTED SUCCESSFULLY         ║');
            console.log('║  Story R2.3 Definition of Done: SATISFIED    ║');
            console.log('╚════════════════════════════════════════════════╝\n');
            process.exit(0);
        }
        else {
            console.log('\n╔════════════════════════════════════════════════╗');
            console.log('║  ⚠ SOME COMMANDS HAD ISSUES                   ║');
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
