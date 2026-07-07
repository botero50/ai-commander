/**
 * Capabilities supported by a game adapter.
 *
 * Describes what operations the external game supports.
 * Allows framework to adapt behavior based on adapter capabilities.
 */
export interface GameCapabilities {
    /**
     * Game can be paused (execution suspended, state preserved).
     *
     * If true: Framework can request pause and resume without losing state.
     * If false: Game cannot be paused (continuous real-time).
     */
    readonly supportsPause: boolean;
    /**
     * Game state can be saved and restored.
     *
     * If true: Framework can checkpoint state and reload to previous tick.
     * If false: Game state is immutable once progressed.
     */
    readonly supportsSaveState: boolean;
    /**
     * Game execution is deterministic.
     *
     * If true: Same commands produce same results every execution.
     * If false: Game has randomness or non-determinism.
     *
     * Affects planning and debugging reliability.
     */
    readonly supportsDeterministicMode: boolean;
    /**
     * Game can replay recorded command sequences.
     *
     * If true: Framework can record and replay decision/execution history.
     * If false: No replay capability.
     *
     * Useful for debugging and analysis.
     */
    readonly supportsReplay: boolean;
    /**
     * Game can expose complete world state.
     *
     * If true: Adapter can provide full WorldState snapshots.
     * If false: Adapter can only provide partial observations.
     *
     * Affects planning quality and decision-making.
     */
    readonly supportsCompleteWorldState: boolean;
    /**
     * Game supports multiple simultaneous agents.
     *
     * If true: Adapter handles multiple agents executing in parallel.
     * If false: Only single-agent games are supported.
     */
    readonly supportsMultipleAgents: boolean;
    /**
     * Maximum number of ticks per second the game can execute.
     *
     * Positive number: game can execute this many ticks per second.
     * 0 or undefined: game determines tick speed.
     *
     * Allows framework to respect game timing constraints.
     */
    readonly maxTicksPerSecond?: number;
    /**
     * Custom metadata about adapter capabilities.
     *
     * Game-specific or adapter-specific information that doesn't fit
     * the standard capabilities.
     *
     * Examples:
     * - name: "OpenRA"
     * - version: "20240101"
     * - supportedMaps: ["Egypt", "Snow", "Winter"]
     */
    readonly metadata?: Record<string, unknown>;
}
//# sourceMappingURL=game-capabilities.d.ts.map