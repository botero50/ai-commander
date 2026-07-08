/* eslint-disable no-undef */

/**
 * Visible Action CLI
 *
 * Demonstrates one unit performing one action in a real OpenRA game.
 * This is a confidence test: can AI Commander actually control a game?
 *
 * Usage:
 *   # Run demonstration
 *   pnpm --filter reference exec ts-node src/visible-action-cli.ts
 *
 *   # Custom game adapter URL
 *   pnpm --filter reference exec ts-node src/visible-action-cli.ts --openra-url http://custom:8000
 *
 *   # Verbose logging
 *   pnpm --filter reference exec ts-node src/visible-action-cli.ts --verbose
 *
 * Before running, ensure game adapter is active:
 *   docker run -p 8000:8000 -p 9999:9999 game adapter
 */

import { createOpenRAIntegrationHost } from './game adapter-integration-host.js';
import { VisibleActionDemo } from './visible-action-demo.js';

interface CLIArgs {
  openraUrl: string;
  verbose: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  return {
    openraUrl: args[args.indexOf('--openra-url') + 1] || 'http://localhost:8000',
    verbose: args.includes('--verbose'),
  };
}

async function main(): Promise<void> {
  const args = parseArgs();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('        Visible Action Demonstration with Real OpenRA');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`game adapter Service: ${args.openraUrl}\n`);

  // Step 1: Initialize integration host
  console.log('Step 1: Connecting to game adapter Service');
  console.log('───────────────────────────────────────────────────────────────');

  let host;
  try {
    host = await createOpenRAIntegrationHost({
      baseUrl: args.openraUrl,
      timeout: 5000,
      retries: 2,
      verbose: args.verbose,
    });
    console.log('✓ Connected to game adapter\n');
  } catch (error) {
    console.error('✗ Failed to connect to game adapter:');
    console.error(`  ${error instanceof Error ? error.message : String(error)}`);
    console.error('\nEnsure game adapter is running:');
    console.error('  docker run -p 8000:8000 -p 9999:9999 game adapter\n');
    process.exit(1);
  }

  // Step 2: Get callbacks
  console.log('Step 2: Creating Service Callbacks');
  console.log('───────────────────────────────────────────────────────────────');

  const callbacks = host.createCallbacks();
  host.logCallbackRegistration();
  console.log();

  // Step 3: Run demonstration
  console.log('Step 3: Running Visible Action Demonstration');
  console.log('───────────────────────────────────────────────────────────────');

  const demo = new VisibleActionDemo();
  const result = await demo.runDemonstration(callbacks);

  // Step 4: Print evidence report
  console.log('Step 4: Evidence Report');
  console.log('───────────────────────────────────────────────────────────────');
  console.log(demo.generateEvidenceReport());

  // Step 5: Print summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    Summary');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (result.success && result.changed) {
    console.log('Result: ✓ SUCCESS\n');
    console.log('Visible game state change confirmed.');
    console.log('AI Commander successfully controlled a real OpenRA game.\n');

    if (result.beforeState && result.afterState) {
      console.log('Key Evidence:');
      console.log(`  • Initial tick: ${result.beforeState.tick}`);
      console.log(`  • Final tick: ${result.afterState.tick}`);
      console.log(`  • Game advanced ${result.afterState.tick - result.beforeState.tick} ticks`);
      console.log(`  • Target unit moved to new location`);
      console.log(`  • Before/after states captured and compared\n`);
    }

    console.log('Confidence: HIGH');
    console.log('  ✓ game adapter service running');
    console.log('  ✓ Real world state retrieved');
    console.log('  ✓ Command issued successfully');
    console.log('  ✓ Game acknowledged command');
    console.log('  ✓ Visible game change detected\n');
  } else {
    console.log('Result: ✗ FAILED\n');

    if (!result.success) {
      console.log('Demonstration did not complete successfully.');
      console.log('Review the evidence report above for failure point.\n');

      if (result.evidence.length > 0) {
        const lastEntry = result.evidence[result.evidence.length - 1];
        if (lastEntry) {
          console.log(`Last successful stage: ${lastEntry.stage}`);
          console.log(`Failure point: Check what comes after "${lastEntry.stage}"\n`);
        }
      }
    } else if (!result.changed) {
      console.log('Demonstration completed but no visible game change detected.\n');
      console.log('Possible causes:');
      console.log('  • Unit is blocked or cannot move');
      console.log('  • Target location is invalid');
      console.log('  • Game is paused');
      console.log('  • Command was not properly formatted');
      console.log('  • Game did not process command in expected time\n');
    }

    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    Demonstration Complete');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
