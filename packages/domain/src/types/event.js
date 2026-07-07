/**
 * Create an EventId.
 */
export function createEventId(id) {
    if (!id || id.length === 0) {
        throw new Error('EventId cannot be empty');
    }
    return id;
}
/**
 * Create an EventType value object.
 */
export function createEventType(id, name, category, isPublic = true) {
    if (!id || id.length === 0) {
        throw new Error('EventType id cannot be empty');
    }
    if (!name || name.length === 0) {
        throw new Error('EventType name cannot be empty');
    }
    if (!category || category.length === 0) {
        throw new Error('EventType category cannot be empty');
    }
    return Object.freeze({
        id,
        name,
        category,
        isPublic,
    });
}
/**
 * Create an Event value object.
 */
export function createEvent(id, eventType, triggeringAgentId, occurredAtTick, data = {}, visibleTo = null) {
    return Object.freeze({
        id,
        eventType,
        triggeringAgentId,
        occurredAtTick,
        data: Object.freeze({ ...data }),
        visibleTo: visibleTo === null ? null : Object.freeze([...visibleTo]),
    });
}
/**
 * Check if a player/agent can see this event.
 */
export function canObserveEvent(event, observerId) {
    if (event.visibleTo === null) {
        return true; // Public event
    }
    return event.visibleTo.includes(observerId);
}
/**
 * Check if event is public.
 */
export function isPublicEvent(event) {
    return event.visibleTo === null;
}
/**
 * Create a public event (visible to all).
 */
export function createPublicEvent(id, eventType, triggeringAgentId, occurredAtTick, data) {
    return createEvent(id, eventType, triggeringAgentId, occurredAtTick, data, null);
}
/**
 * Create a private event (visible to specific observers).
 */
export function createPrivateEvent(id, eventType, triggeringAgentId, occurredAtTick, visibleTo, data) {
    if (visibleTo.length === 0) {
        throw new Error('Private event must be visible to at least one observer');
    }
    return createEvent(id, eventType, triggeringAgentId, occurredAtTick, data, visibleTo);
}
//# sourceMappingURL=event.js.map