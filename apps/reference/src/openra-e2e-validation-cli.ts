/* eslint-disable no-undef */

/**
 * OpenRA End-to-End Integration Validation CLI
 *
 * Validates the complete AI Commander → OpenRA-RL integration pipeline with real data.
 *
 * Usage:
 *   # Run complete validation with real OpenRA-RL instance
 *   pnpm --filter reference exec ts-node src/openra-e2e-validation-cli.ts
 *
 *   # Validate with custom OpenRA-RL URL
 *   pnpm --filter reference exec ts-node src/openra-e2e-validation-cli.ts --openra-url http://custom.host:8000
 *
 *   # Save validation report to file
 *   pnpm --filter reference exec ts-node src/openra-e2e-validation-cli.ts --output report.txt
 *
 *   # JSON output format
 *   pnpm --filter reference exec ts-node src/openra-e2e-validation-cli.ts --json
 *
 * Before running, ensure OpenRA-RL is available:
 *   docker run -p 8000:8000 -p 9999:9999 openra-rl
 */

import { createOpenRAIntegrationHost } from './openra-rl-integration-host.js';
import { IntegrationValidator } from './integration-validator.js';
import * as fs from 'fs';
import * as path from 'path';

interface ValidationArgs {
  openraUrl: string;
  json: boolean;
  output: string | undefined;
  verbose: boolean;
}

function parseArgs(): ValidationArgs {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf('--output') + 1;
  return {
    openraUrl: args[args.indexOf('--openra-url') + 1] || 'http://localhost:8000',
    json: args.includes('--json'),
    output: outputIndex > 0 && outputIndex < args.length ? args[outputIndex] : undefined,
    verbose: args.includes('--verbose'),
  };
}

async function runValidation(openraUrl: string): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('     OpenRA End-to-End Integration Validation');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`OpenRA-RL URL: ${openraUrl}\n`);

  // Step 1: Initialize integration host
  console.log('Step 1: Initializing Integration Host');
  console.log('───────────────────────────────────────────────────────────────');

  let host;
  try {
    host = await createOpenRAIntegrationHost({
      baseUrl: openraUrl,
      timeout: 5000,
      retries: 2,
      verbose: true,
    });
    console.log('✓ Integration host initialized\n');
  } catch (error) {
    console.error('✗ Failed to initialize integration host:');
    console.error(`  ${error instanceof Error ? error.message : String(error)}`);
    console.error('\nEnsure OpenRA-RL is running:');
    console.error('  Docker: docker run -p 8000:8000 -p 9999:9999 openra-rl');
    console.error('  Local:  openra-rl server start');
    process.exit(1);
  }

  // Step 2: Create callbacks
  console.log('Step 2: Creating Callbacks');
  console.log('───────────────────────────────────────────────────────────────');
  const callbacks = host.createCallbacks();
  host.logCallbackRegistration();
  console.log();

  // Step 3: Run validation
  console.log('Step 3: Running Complete Pipeline Validation');
  console.log('───────────────────────────────────────────────────────────────\n');

  const validator = new IntegrationValidator();
  const result = await validator.runCompleteValidation(callbacks);

  // Step 4: Display results
  console.log('\n' + validator.generateReport());

  // Step 5: Return validation result (for scripting)
  console.log('\nValidation Result Summary:');
  console.log(`  Overall Success: ${result.success ? '✓ YES' : '✗ NO'}`);
  console.log(`  Logs Collected: ${result.logs.length}`);
  console.log(`  Timestamp: ${new Date(result.timestamp).toISOString()}`);

  if (!result.success) {
    const failedSteps = Object.entries(result.steps).filter(([, step]) => !step.success);
    console.log('\n  Failed Steps:');
    for (const [stepName, stepResult] of failedSteps) {
      console.log(`    - ${stepName}: ${stepResult.message}`);
    }
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const args = parseArgs();

  try {
    await runValidation(args.openraUrl);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                ✓ Validation Complete');
    console.log('═══════════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
