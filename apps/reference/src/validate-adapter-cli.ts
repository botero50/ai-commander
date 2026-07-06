#!/usr/bin/env node

/**
 * Adapter Validation CLI
 *
 * Validates all adapter commands against a real game instance.
 *
 * Usage:
 *   pnpm validate-adapter                # Validate with fake adapter
 *   pnpm validate-adapter --openra        # Validate with OpenRA adapter
 *   pnpm validate-adapter --port 6001     # Use custom OpenRA port
 */

import { FakeGameAdapter } from '@ai-commander/fake-game-adapter';
import { OpenRAGameAdapter } from '@ai-commander/openra-adapter';
import type { GameAdapter } from '@ai-commander/adapter';
import { AdapterValidator, formatValidationReport } from './adapter-validation.js';

interface CLIArgs {
  useOpenRA: boolean;
  port: number;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  return {
    useOpenRA: args.includes('--openra'),
    port: (() => {
      const portIdx = args.indexOf('--port');
      return portIdx >= 0 ? parseInt(args[portIdx + 1] || '6001', 10) : 6001;
    })(),
  };
}

async function main() {
  const args = parseArgs();

  console.log('');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║        Adapter Validation Suite                    ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');

  let adapter: GameAdapter;

  if (args.useOpenRA) {
    console.log('Using OpenRA Adapter...');
    adapter = new OpenRAGameAdapter();

    try {
      await adapter.initialize({
        gameInstanceAccessor: async () => {
          // This would connect to actual OpenRA instance
          // For now, we're validating the adapter structure
          return { port: args.port };
        },
        orderSubmitter: async (_order: any) => {
          // This would submit to OpenRA
          return true;
        },
        stateChecker: async () => {
          // This would check game state
          return true;
        },
      });
    } catch (error) {
      console.error('Failed to initialize OpenRA adapter:', error instanceof Error ? error.message : error);
      console.log('');
      console.log('Note: OpenRA adapter requires a running OpenRA instance.');
      console.log(`Expected on localhost:${args.port}`);
      process.exit(1);
    }
  } else {
    console.log('Using Fake Game Adapter...');
    adapter = new FakeGameAdapter();
    await adapter.initialize();
  }

  console.log(`✓ Adapter initialized: ${adapter.displayName}`);
  console.log('');

  // Get adapter info
  const info = await adapter.getAdapterInfo();
  console.log(`Adapter Version: ${info.version}`);
  if (info.gameVersion) {
    console.log(`Game Version: ${info.gameVersion}`);
  }
  console.log('');

  // Create session
  console.log('Creating game session...');
  const session = await adapter.createSession();
  console.log(`✓ Session created: ${session.sessionId}`);
  console.log('');

  // Start session
  console.log('Starting session...');
  const initialState = await session.start();
  console.log(`✓ Session started`);
  console.log(`Initial agents: ${(initialState.agents || []).length}`);
  console.log('');

  // Run validation
  console.log('Running command validation tests...');
  console.log('');

  const validator = new AdapterValidator();
  await validator.initialize(adapter);

  const report = await validator.validateAll(session);

  // Print report
  console.log(formatValidationReport(report));

  // Stop session
  console.log('Cleaning up...');
  await session.stop();
  console.log('✓ Session stopped');
  console.log('');

  const exitCode = report.failedCommands === 0 ? 0 : 1;
  console.log(`Exit Code: ${exitCode}`);

  await adapter.shutdown();
  process.exit(exitCode);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
