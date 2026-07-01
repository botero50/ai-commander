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
export function createEventBus(): EventBus {
  const subscribers = new Map<string, Set<EventListener<unknown>>>();

  return Object.freeze({
    subscribe<T>(eventType: string, listener: EventListener<T>): () => void {
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

      listeners.add(listener as EventListener<unknown>);

      return () => {
        listeners?.delete(listener as EventListener<unknown>);
      };
    },

    async publish<T>(eventType: string, event: T): Promise<void> {
      const listeners = subscribers.get(eventType);
      if (!listeners) return;

      const promises = Array.from(listeners).map((listener) => Promise.resolve(listener(event)));
      await Promise.all(promises);
    },

    hasSubscribers(eventType: string): boolean {
      const listeners = subscribers.get(eventType);
      return listeners !== undefined && listeners.size > 0;
    },
  });
}
