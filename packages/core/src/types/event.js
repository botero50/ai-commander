/**
 * Create an EventBus instance.
 */
export function createEventBus() {
    const subscribers = new Map();
    return Object.freeze({
        subscribe(eventType, listener) {
            if (!eventType || eventType.length === 0) {
                throw new Error('Event type cannot be empty');
            }
            if (!listener) {
                throw new Error('Listener cannot be null');
            }
            let listeners = subscribers.get(eventType);
            if (!listeners) {
                listeners = new Set();
                subscribers.set(eventType, listeners);
            }
            listeners.add(listener);
            return () => {
                listeners?.delete(listener);
            };
        },
        async publish(eventType, event) {
            const listeners = subscribers.get(eventType);
            if (!listeners)
                return;
            const promises = Array.from(listeners).map((listener) => Promise.resolve(listener(event)));
            await Promise.all(promises);
        },
        hasSubscribers(eventType) {
            const listeners = subscribers.get(eventType);
            return listeners !== undefined && listeners.size > 0;
        },
    });
}
//# sourceMappingURL=event.js.map