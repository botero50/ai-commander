/**
 * Entry point for Story R1.2 connectivity test
 *
 * Usage:
 *   npx ts-node run-connectivity-test.ts
 *
 * This script will:
 * 1. Attempt to find 0 A.D. executable
 * 2. Launch 0 A.D. with RL Interface enabled
 * 3. Test HTTP connectivity
 * 4. Validate game state
 * 5. Generate connectivity report
 */

import { ConnectivityTest } from './connectivity-test.js';
import { Logger } from '../config/logger.js';

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  STORY R1.2: RL INTERFACE CONNECTIVITY TEST        ║');
  console.log('║  Minimum Viable Real 0 A.D. Vertical Slice         ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('\n');

  const logger = new Logger('info', 'R1.2');

  logger.info('Initializing connectivity test...');
  const test = new ConnectivityTest(logger);

  try {
    logger.info('Starting test execution...');
    const report = await test.run();

    // Exit with appropriate code
    if (report.status === 'success') {
      logger.info('\n✅ Story R1.2 PASSED: RL Interface connectivity verified');
      process.exit(0);
    } else {
      logger.error('\n❌ Story R1.2 FAILED: See errors above');
      process.exit(1);
    }
  } catch (error) {
    logger.error('Fatal error during test', error);
    process.exit(1);
  }
}

// Run if this is the main module
main();
