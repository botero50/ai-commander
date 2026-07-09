/**
 * Story R1.2: RL Interface Connectivity Test
 *
 * Proves that:
 * - 0 A.D. can be launched with RL Interface enabled
 * - HTTP connection can be established on port 6000
 * - All available endpoints respond correctly
 * - Initial game state is valid and complete
 */

import { RLInterfaceLauncher } from './rl-launcher.js';
import { RLHTTPClient } from './http-client.js';
import { Logger } from '../config/logger.js';

interface ConnectivityReport {
  timestamp: Date;
  status: 'success' | 'failure';
  launcher: {
    executable_found: boolean;
    process_started: boolean;
    process_id?: number;
  };
  connectivity: {
    http_reachable: boolean;
    response_time_ms: number;
  };
  endpoints: {
    reset: {
      success: boolean;
      response_time_ms: number;
      game_state_valid: boolean;
      tick: number;
      players: number;
      entities: number;
    };
    step: {
      success: boolean;
      response_time_ms: number;
      game_state_valid: boolean;
      tick: number;
    };
  };
  game_state_validation: {
    tick_incremented: boolean;
    players_observed: number;
    entities_observed: number;
    all_fields_present: boolean;
  };
  errors: string[];
}

export class ConnectivityTest {
  private logger: Logger;
  private launcher: RLInterfaceLauncher | null = null;
  private client: RLHTTPClient | null = null;
  private report: ConnectivityReport = {
    timestamp: new Date(),
    status: 'failure',
    launcher: {
      executable_found: false,
      process_started: false,
    },
    connectivity: {
      http_reachable: false,
      response_time_ms: 0,
    },
    endpoints: {
      reset: {
        success: false,
        response_time_ms: 0,
        game_state_valid: false,
        tick: 0,
        players: 0,
        entities: 0,
      },
      step: {
        success: false,
        response_time_ms: 0,
        game_state_valid: false,
        tick: 0,
      },
    },
    game_state_validation: {
      tick_incremented: false,
      players_observed: 0,
      entities_observed: 0,
      all_fields_present: false,
    },
    errors: [],
  };

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('info', 'R1.2-Connectivity');
  }

  async run(): Promise<ConnectivityReport> {
    try {
      // Phase 1: Launch 0 A.D.
      this.logger.info('═'.repeat(60));
      this.logger.info('STORY R1.2: RL INTERFACE CONNECTIVITY TEST');
      this.logger.info('═'.repeat(60));

      this.logger.info('\n[PHASE 1] Launching 0 A.D. with RL Interface...');
      await this.launchGame();

      // Phase 2: Test HTTP connectivity
      this.logger.info('\n[PHASE 2] Testing HTTP connectivity...');
      await this.testHTTPConnectivity();

      // Phase 3: Test /reset endpoint
      this.logger.info('\n[PHASE 3] Testing /reset endpoint...');
      const initialState = await this.testResetEndpoint();

      // Phase 4: Test /step endpoint
      this.logger.info('\n[PHASE 4] Testing /step endpoint...');
      await this.testStepEndpoint(initialState);

      // Phase 5: Validate game state
      this.logger.info('\n[PHASE 5] Validating game state...');
      await this.validateGameState();

      this.report.status = 'success';
      this.logger.info('\n✅ All connectivity tests passed');
    } catch (error) {
      this.report.status = 'failure';
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.report.errors.push(errorMsg);
      this.logger.error(`❌ Connectivity test failed: ${errorMsg}`);
    } finally {
      await this.cleanup();
      this.printReport();
    }

    return this.report;
  }

  private async launchGame(): Promise<void> {
    try {
      this.launcher = new RLInterfaceLauncher(this.logger);
      await this.launcher.launch();

      this.report.launcher.executable_found = true;
      this.report.launcher.process_started = true;
      this.logger.info('✅ 0 A.D. process launched successfully');

      this.client = this.launcher.getHTTPClient();
    } catch (error) {
      throw new Error(`Failed to launch 0 A.D.: ${error}`);
    }
  }

  private async testHTTPConnectivity(): Promise<void> {
    if (!this.client) {
      throw new Error('HTTP client not initialized');
    }

    try {
      const start = Date.now();
      const reachable = await this.client.isReachable();
      const elapsed = Date.now() - start;

      this.report.connectivity.http_reachable = reachable;
      this.report.connectivity.response_time_ms = elapsed;

      if (reachable) {
        this.logger.info(`✅ HTTP endpoint reachable on port 6000 (${elapsed}ms)`);
      } else {
        throw new Error('HTTP endpoint not reachable');
      }
    } catch (error) {
      throw new Error(`HTTP connectivity test failed: ${error}`);
    }
  }

  private async testResetEndpoint(): Promise<any> {
    if (!this.client) {
      throw new Error('HTTP client not initialized');
    }

    try {
      const start = Date.now();
      const defaultScenario = {
        settings: {
          Map: 'Skirmish/Cantabria',
          PlayerData: [
            { Civ: 'athen' },
            { Civ: 'gaul' },
          ],
        },
      };
      const state = await this.client.reset(defaultScenario);
      const elapsed = Date.now() - start;

      this.report.endpoints.reset.success = true;
      this.report.endpoints.reset.response_time_ms = elapsed;
      this.report.endpoints.reset.tick = state.tick;
      this.report.endpoints.reset.players = state.players?.length || 0;
      this.report.endpoints.reset.entities = state.entities?.length || 0;

      // Validate state structure
      const isValid = this.validateGameStateStructure(state);
      this.report.endpoints.reset.game_state_valid = isValid;

      if (isValid) {
        this.logger.info(
          `✅ /reset endpoint successful (${elapsed}ms)\n` +
          `   Tick: ${state.tick}\n` +
          `   Players: ${state.players?.length || 0}\n` +
          `   Entities: ${state.entities?.length || 0}`
        );
      } else {
        throw new Error('Game state structure invalid');
      }

      return state;
    } catch (error) {
      throw new Error(`/reset endpoint test failed: ${error}`);
    }
  }

  private async testStepEndpoint(initialState: any): Promise<void> {
    if (!this.client) {
      throw new Error('HTTP client not initialized');
    }

    try {
      // Execute a no-op step (empty command array)
      const start = Date.now();
      const nextState = await this.client.step([]);
      const elapsed = Date.now() - start;

      this.report.endpoints.step.success = true;
      this.report.endpoints.step.response_time_ms = elapsed;
      this.report.endpoints.step.tick = nextState.tick;

      // Validate tick incremented
      const tickIncremented = nextState.tick > initialState.tick;
      this.report.game_state_validation.tick_incremented = tickIncremented;

      const isValid = this.validateGameStateStructure(nextState);
      this.report.endpoints.step.game_state_valid = isValid;

      if (isValid && tickIncremented) {
        this.logger.info(
          `✅ /step endpoint successful (${elapsed}ms)\n` +
          `   Tick incremented: ${initialState.tick} → ${nextState.tick}`
        );
      } else {
        throw new Error(
          `Step endpoint issue - valid: ${isValid}, tick incremented: ${tickIncremented}`
        );
      }
    } catch (error) {
      throw new Error(`/step endpoint test failed: ${error}`);
    }
  }

  private async validateGameState(): Promise<void> {
    if (!this.client) {
      throw new Error('HTTP client not initialized');
    }

    try {
      // Get current game state
      const state = await this.client.step([]);

      // Count observations
      const players = state.players?.length || 0;
      const entities = state.entities?.length || 0;
      const units = state.entities?.filter((e: any) => e.type === 'unit').length || 0;
      const buildings = state.entities?.filter((e: any) => e.type === 'building').length || 0;

      // Validate all fields are present
      const allFieldsPresent =
        typeof state.tick === 'number' &&
        typeof state.time_elapsed === 'number' &&
        Array.isArray(state.players) &&
        Array.isArray(state.entities);

      this.report.game_state_validation.players_observed = players;
      this.report.game_state_validation.entities_observed = entities;
      this.report.game_state_validation.all_fields_present = allFieldsPresent;

      if (allFieldsPresent) {
        this.logger.info(
          `✅ Game state validation successful\n` +
          `   Players: ${players}\n` +
          `   Entities: ${entities} (${units} units, ${buildings} buildings)\n` +
          `   All fields present: ✓`
        );
      } else {
        throw new Error('Game state missing required fields');
      }
    } catch (error) {
      throw new Error(`Game state validation failed: ${error}`);
    }
  }

  private validateGameStateStructure(state: any): boolean {
    return (
      typeof state === 'object' &&
      typeof state.tick === 'number' &&
      typeof state.time_elapsed === 'number' &&
      Array.isArray(state.players) &&
      Array.isArray(state.entities) &&
      state.players.length > 0
    );
  }

  private async cleanup(): Promise<void> {
    if (this.launcher) {
      try {
        await this.launcher.shutdown();
        this.logger.info('\n✅ Cleanup: 0 A.D. process shutdown complete');
      } catch (error) {
        this.logger.warn(`Cleanup warning: ${error}`);
      }
    }
  }

  private printReport(): void {
    this.logger.info('\n' + '═'.repeat(60));
    this.logger.info('CONNECTIVITY TEST REPORT');
    this.logger.info('═'.repeat(60));

    console.log('\n```json');
    console.log(JSON.stringify(this.report, null, 2));
    console.log('```\n');

    // Summary
    const summary = {
      status: this.report.status,
      launcher: {
        executable: this.report.launcher.executable_found ? '✅' : '❌',
        process: this.report.launcher.process_started ? '✅' : '❌',
      },
      connectivity: {
        http: this.report.connectivity.http_reachable ? '✅' : '❌',
        response_time: `${this.report.connectivity.response_time_ms}ms`,
      },
      endpoints: {
        reset: this.report.endpoints.reset.success ? '✅' : '❌',
        step: this.report.endpoints.step.success ? '✅' : '❌',
      },
      validation: {
        all_fields: this.report.game_state_validation.all_fields_present ? '✅' : '❌',
        tick_increment: this.report.game_state_validation.tick_incremented ? '✅' : '❌',
      },
      errors: this.report.errors.length,
    };

    console.log('SUMMARY');
    console.log('───────');
    console.log(JSON.stringify(summary, null, 2));

    if (this.report.errors.length > 0) {
      console.log('\nERRORS');
      console.log('──────');
      this.report.errors.forEach((err, i) => {
        console.log(`${i + 1}. ${err}`);
      });
    }

    console.log('\n' + '═'.repeat(60));
  }
}

// Run test if invoked directly
async function main() {
  const logger = new Logger('info', 'R1.2-Connectivity');
  const test = new ConnectivityTest(logger);
  const report = await test.run();
  process.exit(report.status === 'success' ? 0 : 1);
}


export default ConnectivityTest;
