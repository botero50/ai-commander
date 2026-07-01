import type { CommandExecutor, CommandExecutionResult } from '@ai-commander/adapter';
import { AdapterErrorCode } from '@ai-commander/adapter';
import type { Command } from '@ai-commander/domain';
import type { FakeWorldSnapshot } from './world/fake-world-state.js';
import { moveAgent, waitAgent } from './world/fake-world-state.js';
import { parseFakeCommand } from './types/fake-command.js';

/**
 * Fake command executor.
 *
 * Executes framework Commands against the in-memory fake world.
 * Maps framework commands to world state mutations.
 */
export class FakeCommandExecutor implements CommandExecutor {
  private available: boolean = false;
  private world: FakeWorldSnapshot;
  private onWorldChanged: ((world: FakeWorldSnapshot) => void) | null = null;

  constructor(initialWorld: FakeWorldSnapshot) {
    this.world = initialWorld;
    this.available = true;
  }

  async isExecutionAvailable(): Promise<boolean> {
    return Promise.resolve(this.available);
  }

  async canExecuteCommand(command: Command): Promise<boolean> {
    if (!this.available) {
      return Promise.resolve(false);
    }

    const fakeCmd = parseFakeCommand(command.actionType, command.parameters);
    return Promise.resolve(fakeCmd !== null);
  }

  async executeCommand(command: Command): Promise<CommandExecutionResult> {
    if (!this.available) {
      return {
        success: false,
        message: 'Execution provider is not available',
        error: {
          code: AdapterErrorCode.ExecutionUnavailable,
          reason: 'Executor is not available',
        },
      };
    }

    const fakeCmd = parseFakeCommand(command.actionType, command.parameters);
    if (!fakeCmd) {
      return {
        success: false,
        message: `Unknown command type: ${command.actionType}`,
        error: {
          code: AdapterErrorCode.CommandInvalid,
          reason: `Unknown action type: ${command.actionType}`,
        },
      };
    }

    try {
      let newWorld: FakeWorldSnapshot;

      if (fakeCmd.type === 'move') {
        newWorld = moveAgent(this.world, fakeCmd.dx, fakeCmd.dy);
      } else if (fakeCmd.type === 'wait') {
        newWorld = waitAgent(this.world);
      } else {
        const _exhaustive: never = fakeCmd;
        const exhaustiveCheck = _exhaustive as unknown as Record<string, unknown>;
        throw new Error(`Unexpected command type: ${String(exhaustiveCheck.type)}`);
      }

      this.world = newWorld;
      if (this.onWorldChanged) {
        this.onWorldChanged(newWorld);
      }

      return Promise.resolve({
        success: true,
        message: `Executed ${fakeCmd.type} command`,
        data: { newTick: newWorld.tick },
      });
    } catch (err) {
      return Promise.resolve({
        success: false,
        message: `Failed to execute command: ${err instanceof Error ? err.message : 'unknown error'}`,
        error: {
          code: AdapterErrorCode.CommandFailed,
          reason: 'Command execution failed',
        },
      });
    }
  }

  // Internal: Register callback for world changes
  onWorldChange(callback: (world: FakeWorldSnapshot) => void): void {
    this.onWorldChanged = callback;
  }

  // Internal: Mark executor as unavailable
  markUnavailable(): void {
    this.available = false;
  }

  // Internal: Mark executor as available
  markAvailable(): void {
    this.available = true;
  }

  // Internal: Get current world
  getCurrentWorld(): FakeWorldSnapshot {
    return this.world;
  }
}
