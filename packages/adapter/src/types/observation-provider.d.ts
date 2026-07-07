import type { WorldState } from '@ai-commander/domain';
/**
 * Produces immutable WorldState snapshots from the external game.
 *
 * Responsibility: Translate game state into framework WorldState.
 *
 * Must never expose mutable game state.
 * All observations must be immutable snapshots.
 *
 * Must be deterministic: same game state → same WorldState.
 */
export interface ObservationProvider {
    /**
     * Get current world state from the game.
     *
     * Called once per tick to obtain the current state.
     * Must return a complete, immutable snapshot.
     *
     * @returns Immutable WorldState snapshot
     * @throws Error if observation cannot be obtained
     */
    getWorldState(): Promise<WorldState>;
    /**
     * Get world state at a specific historical tick.
     *
     * Optional: only if adapter supports saveState.
     * Allows replay of previous ticks.
     *
     * @param tick The tick number to retrieve
     * @returns WorldState at that tick, or undefined if not available
     */
    getWorldStateAt?(tick: number): Promise<WorldState | undefined>;
    /**
     * Check if current observation is valid.
     *
     * Used to validate that adapter can still observe the game.
     * Fails if game has crashed, disconnected, or is in invalid state.
     *
     * @returns true if observation is possible, false if game is unavailable
     */
    isObservationAvailable(): Promise<boolean>;
}
//# sourceMappingURL=observation-provider.d.ts.map