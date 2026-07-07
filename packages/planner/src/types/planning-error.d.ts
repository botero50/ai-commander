/**
 * Error class for planning-layer failures.
 *
 * Separate from Engine errors; specific to planning operations.
 */
export declare class PlanningError extends Error {
    /**
     * Error code for programmatic handling.
     */
    readonly code: string;
    constructor(message: string, code: string);
}
//# sourceMappingURL=planning-error.d.ts.map