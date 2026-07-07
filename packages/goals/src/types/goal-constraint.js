/**
 * Check equality of constraints.
 */
export function constraintsEqual(a, b) {
    return (a.type === b.type &&
        JSON.stringify(a.value) === JSON.stringify(b.value) &&
        a.description === b.description);
}
//# sourceMappingURL=goal-constraint.js.map