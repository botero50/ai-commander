import type { CommandExecutor, CommandExecutionResult } from '@ai-commander/adapter';
import type { Command } from '@ai-commander/domain';
import type { FakeWorldSnapshot } from './world/fake-world-state.js';
/**
 * Fake command executor.
 *
 * Executes framework Commands against the in-memory fake world.
 * Maps framework commands to world state mutations.
 */
export declare class FakeCommandExecutor implements CommandExecutor {
    private available;
    private world;
    private onWorldChanged;
    constructor(initialWorld: FakeWorldSnapshot);
    isExecutionAvailable(): Promise<boolean>;
    canExecuteCommand(command: Command): Promise<boolean>;
    executeCommand(command: Command): Promise<CommandExecutionResult>;
    onWorldChange(callback: (world: FakeWorldSnapshot) => void): void;
    markUnavailable(): void;
    markAvailable(): void;
    getCurrentWorld(): FakeWorldSnapshot;
}
//# sourceMappingURL=fake-command-executor.d.ts.map