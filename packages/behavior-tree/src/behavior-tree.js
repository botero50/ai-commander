/**
 * Create a behavior tree.
 */
export function createBehaviorTree(id, name, root) {
    return Object.freeze({
        id,
        name,
        root,
        async tick(context) {
            return root.execute(context);
        },
        reset() {
            resetNode(root);
        },
    });
}
/**
 * Reset a node and all its children recursively.
 */
function resetNode(node) {
    node.reset();
    // Reset children if it's a composite or decorator
    const composite = node;
    if (composite && 'children' in composite) {
        for (const child of composite.children) {
            resetNode(child);
        }
    }
    const decorator = node;
    if (decorator && 'child' in decorator && decorator.child) {
        resetNode(decorator.child);
    }
}
//# sourceMappingURL=behavior-tree.js.map