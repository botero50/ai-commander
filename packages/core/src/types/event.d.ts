/**
 * Event listener callback for events of type T.
 */
export type EventListener<T> = (event: T) => void | Promise<void>;
/**
 * Event bus for publishing and subscribing to events.
 * Type-safe event system with discriminated subscriptions.
 */
export interface EventBus {
    /**
     * Subscribe to events of a specific type.
     * Returns unsubscribe function.
     */
    subscribe<T>(eventType: string, listener: EventListener<T>): () => void;
    /**
     * Publish an event to all subscribers.
     */
    publish<T>(eventType: string, event: T): Promise<void>;
    /**
     * Check if there are subscribers for an event type.
     */
    hasSubscribers(eventType: string): boolean;
}
/**
 * Create an EventBus instance.
 */
export declare function createEventBus(): EventBus;
//# sourceMappingURL=event.d.ts.map