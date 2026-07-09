/**
 * Event Feed
 *
 * Simple pub/sub system for broadcasting game and camera events.
 */

export interface EventCallback {
  (type: string, data: any): void;
}

export class EventFeed {
  private subscribers: Set<EventCallback> = new Set();

  /**
   * Broadcast an event to all subscribers
   */
  broadcast(type: string, data: any): void {
    for (const callback of this.subscribers) {
      try {
        callback(type, data);
      } catch (err) {
        console.error(`Error in event subscriber: ${err}`);
      }
    }
  }

  /**
   * Subscribe to events
   * Returns unsubscribe function
   */
  subscribe(callback: EventCallback): () => void {
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get number of subscribers
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Clear all subscribers
   */
  clear(): void {
    this.subscribers.clear();
  }
}
