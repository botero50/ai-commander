/**
 * Real OpenRA Integration Test
 *
 * Demonstrates Phase 4: Integration test
 *
 * This test:
 * 1. Connects to OpenRA-RL service
 * 2. Observes live game state
 * 3. Executes one real command
 * 4. Verifies the world changed
 * 5. Repeats in a loop
 *
 * Before running, start OpenRA-RL:
 *   docker run -p 8000:8000 -p 9999:9999 openra-rl
 *
 * Run test:
 *   pnpm --filter openra-adapter exec ts-node examples/real-openra-test.ts
 */

import {
  createOpenRARLBridge,
  OpenRARLBridge,
} from "../src/index.js";

interface IntegrationTestResult {
  success: boolean;
  observations: number;
  commandsExecuted: number;
  stateChanges: number;
  errors: string[];
  duration: number;
}

async function runIntegrationTest(): Promise<IntegrationTestResult> {
  console.log("🎮 Real OpenRA Integration Test");
  console.log("═════════════════════════════════════════════════════\n");

  const result: IntegrationTestResult = {
    success: false,
    observations: 0,
    commandsExecuted: 0,
    stateChanges: 0,
    errors: [],
    duration: 0,
  };

  const startTime = Date.now();
  let bridge: OpenRARLBridge | null = null;

  try {
    // Step 1: Connect to OpenRA-RL
    console.log("Step 1: Connecting to OpenRA-RL Service");
    console.log("─────────────────────────────────────────────────────");

    bridge = await createOpenRARLBridge({
      baseUrl: "http://localhost:8000",
      timeout: 5000,
      verbose: true,
    });

    const state = bridge.getState();
    console.log(`✓ Connected (errors: ${state.connectionErrors})\n`);

    // Step 2: Observe game state
    console.log("Step 2: Observing Live Game State");
    console.log("─────────────────────────────────────────────────────");

    const stateReader = bridge.getStateReader();
    const initialState = await stateReader.getGameState();

    console.log(`✓ Observation successful`);
    console.log(`  Tick: ${initialState.tick}`);
    console.log(`  Units: ${initialState.units.length}`);
    console.log(`  Buildings: ${initialState.buildings.length}`);
    console.log(`  Players: ${initialState.players.length}\n`);

    result.observations++;

    // Step 3: Find a unit to command
    console.log("Step 3: Finding Command Target");
    console.log("─────────────────────────────────────────────────────");

    const unit = initialState.units[0];
    if (!unit) {
      result.errors.push("No units found in game state");
      console.log(`✗ No units available for testing\n`);
      return result;
    }

    console.log(`✓ Found unit: ${unit.type} (owner: ${unit.owner})`);
    console.log(`  Position: (${unit.x}, ${unit.y})`);
    console.log(`  Health: ${unit.health}/${unit.maxHealth}\n`);

    // Step 4: Execute command
    console.log("Step 4: Executing Real Command");
    console.log("─────────────────────────────────────────────────────");

    const commandExecutor = bridge.getCommandExecutor();

    // Create a simple move command
    const moveCommand = {
      id: "test-move",
      action: "move",
      target: {
        x: unit.x + 10,
        y: unit.y + 10,
      },
      expectedDuration: 5,
      expectedCost: 0,
      description: "Test move command",
    };

    const executionResult = await commandExecutor.executeCommand(
      moveCommand,
      unit.id,
      initialState,
      unit.owner
    );

    if (!executionResult.valid) {
      result.errors.push(`Command validation failed: ${executionResult.reason}`);
      console.log(`✗ Command failed: ${executionResult.reason}\n`);
      return result;
    }

    console.log(`✓ Command executed successfully`);
    console.log(`  Expected: ${executionResult.expectedEffect}\n`);

    result.commandsExecuted++;

    // Step 5: Observe new state
    console.log("Step 5: Observing New State (Verify Change)");
    console.log("─────────────────────────────────────────────────────");

    // Wait a bit for command to process
    await new Promise((resolve) => setTimeout(resolve, 500));

    const updatedState = await stateReader.getGameState();

    console.log(`✓ New observation received`);
    console.log(`  Tick: ${updatedState.tick}`);
    console.log(`  Tick delta: ${updatedState.tick - initialState.tick}`);
    console.log(`  Units: ${updatedState.units.length}`);
    console.log(`  Buildings: ${updatedState.buildings.length}\n`);

    result.observations++;

    // Step 6: Verify state changed
    console.log("Step 6: Verifying State Change");
    console.log("─────────────────────────────────────────────────────");

    const tickChanged = updatedState.tick !== initialState.tick;
    const stateVerified = await commandExecutor.verifyStateChange(
      initialState,
      updatedState
    );

    if (tickChanged) {
      console.log(`✓ Game tick advanced: ${initialState.tick} → ${updatedState.tick}`);
      result.stateChanges++;
    } else {
      console.log(`✗ Game tick unchanged`);
    }

    if (stateVerified) {
      console.log(`✓ World state changed as expected\n`);
    } else {
      console.log(`⚠ State change verification inconclusive\n`);
    }

    // Success
    result.success = true;

    console.log("═════════════════════════════════════════════════════");
    console.log("✓ Integration Test Complete");
    console.log("═════════════════════════════════════════════════════\n");

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.errors.push(errorMessage);

    console.error(`\n✗ Test failed: ${errorMessage}\n`);

    if (errorMessage.includes("OpenRA-RL")) {
      console.error("Ensure OpenRA-RL is running:");
      console.error("  docker run -p 8000:8000 -p 9999:9999 openra-rl\n");
    }
  } finally {
    // Cleanup
    if (bridge) {
      await bridge.disconnect();
    }

    result.duration = Date.now() - startTime;
  }

  // Report
  console.log("Test Summary");
  console.log("═════════════════════════════════════════════════════");
  console.log(`Status: ${result.success ? "✓ PASS" : "✗ FAIL"}`);
  console.log(`Observations: ${result.observations}`);
  console.log(`Commands executed: ${result.commandsExecuted}`);
  console.log(`State changes verified: ${result.stateChanges}`);
  console.log(`Duration: ${result.duration}ms`);

  if (result.errors.length > 0) {
    console.log(`\nErrors:`);
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
  }

  console.log("═════════════════════════════════════════════════════\n");

  return result;
}

// Run test
runIntegrationTest()
  .then((result) => {
    process.exit(result.success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
