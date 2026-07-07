/**
 * Create a ResourceType value object.
 */
export function createResourceType(id, name, category, min = 0, max = Infinity, stackable = true, renewable = false) {
    if (!id || id.length === 0) {
        throw new Error('ResourceType id cannot be empty');
    }
    if (!name || name.length === 0) {
        throw new Error('ResourceType name cannot be empty');
    }
    if (!category || category.length === 0) {
        throw new Error('ResourceType category cannot be empty');
    }
    if (min > max) {
        throw new Error('ResourceType min cannot exceed max');
    }
    return Object.freeze({
        id,
        name,
        category,
        min,
        max,
        stackable,
        renewable,
    });
}
/**
 * Create a Resource value object.
 */
export function createResource(type, amount, lastUpdateTick = 0) {
    if (!Number.isInteger(amount) || amount < type.min || amount > type.max) {
        throw new Error(`Resource amount must be integer between ${type.min} and ${type.max}`);
    }
    if (!Number.isInteger(lastUpdateTick) || lastUpdateTick < 0) {
        throw new Error('lastUpdateTick must be non-negative integer');
    }
    return Object.freeze({
        type,
        amount,
        lastUpdateTick,
    });
}
/**
 * Create a ResourcePool value object.
 */
export function createResourcePool(resources, knownTypes) {
    const resourceMap = new Map(resources.map((r) => [r.type.id, r]));
    return Object.freeze({
        resources: Object.freeze([...resources]),
        knownTypes: Object.freeze([...knownTypes]),
        getResource: (typeId) => resourceMap.get(typeId),
        getAmount: (typeId) => resourceMap.get(typeId)?.amount ?? 0,
        hasEnough: (typeId, amount) => {
            const resource = resourceMap.get(typeId);
            return resource ? resource.amount >= amount : false;
        },
    });
}
/**
 * Empty resource pool.
 */
export function createEmptyResourcePool(knownTypes) {
    return createResourcePool([], knownTypes);
}
//# sourceMappingURL=resource.js.map