/**
 * Error class for planning-layer failures.
 *
 * Separate from Engine errors; specific to planning operations.
 */
export class PlanningError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'PlanningError';
        this.code = code;
    }
}
//# sourceMappingURL=planning-error.js.map