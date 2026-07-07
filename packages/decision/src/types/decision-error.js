/**
 * Decision layer error.
 * Separate from Engine errors.
 */
export class DecisionError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'DecisionError';
        Object.setPrototypeOf(this, DecisionError.prototype);
    }
}
//# sourceMappingURL=decision-error.js.map