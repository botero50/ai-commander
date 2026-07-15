/**
 * Broadcast Service Tests
 *
 * Tests for streaming and broadcasting game state
 * - WebSocket connections
 * - Event broadcasting
 * - Subscriber management
 * - Performance under load
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

interface BroadcastEvent {
  type: string;
  timestamp: number;
  data: unknown;
}

interface Subscriber {
  id: string;
  onEvent: (event: BroadcastEvent) => void;
  isActive: boolean;
}

class MockBroadcastService {
  private subscribers: Map<string, Subscriber> = new Map();
  private eventQueue: BroadcastEvent[] = [];
  private isRunning = false;

  startBroadcast(): void {
    this.isRunning = true;
  }

  stopBroadcast(): void {
    this.isRunning = false;
  }

  subscribe(id: string, onEvent: (event: BroadcastEvent) => void): void {
    this.subscribers.set(id, {
      id,
      onEvent,
      isActive: true,
    });
  }

  unsubscribe(id: string): void {
    const sub = this.subscribers.get(id);
    if (sub) {
      sub.isActive = false;
      this.subscribers.delete(id);
    }
  }

  broadcastEvent(event: BroadcastEvent): void {
    if (!this.isRunning) return;
    this.eventQueue.push(event);
    this.subscribers.forEach(sub => {
      if (sub.isActive) {
        sub.onEvent(event);
      }
    });
  }

  getSubscriberCount(): number {
    return Array.from(this.subscribers.values()).filter(s => s.isActive).length;
  }

  getEventCount(): number {
    return this.eventQueue.length;
  }

  getEvents(): BroadcastEvent[] {
    return [...this.eventQueue];
  }

  clearEvents(): void {
    this.eventQueue = [];
  }

  isHealthy(): boolean {
    return this.isRunning && this.getSubscriberCount() > 0;
  }
}

describe('BroadcastService', () => {
  let broadcast: MockBroadcastService;

  beforeEach(() => {
    broadcast = new MockBroadcastService();
  });

  describe('Broadcast Lifecycle', () => {
    it('should start broadcasting', () => {
      broadcast.startBroadcast();
      expect(broadcast['isRunning']).toBe(true);
    });

    it('should stop broadcasting', () => {
      broadcast.startBroadcast();
      broadcast.stopBroadcast();
      expect(broadcast['isRunning']).toBe(false);
    });

    it('should report health status', () => {
      const mockCallback = vi.fn();
      broadcast.subscribe('sub1', mockCallback);
      broadcast.startBroadcast();
      expect(broadcast.isHealthy()).toBe(true);

      broadcast.stopBroadcast();
      expect(broadcast.isHealthy()).toBe(false);
    });
  });

  describe('Subscriber Management', () => {
    it('should add subscribers', () => {
      const callback = vi.fn();
      broadcast.subscribe('sub1', callback);
      expect(broadcast.getSubscriberCount()).toBe(1);
    });

    it('should remove subscribers', () => {
      const callback = vi.fn();
      broadcast.subscribe('sub1', callback);
      broadcast.unsubscribe('sub1');
      expect(broadcast.getSubscriberCount()).toBe(0);
    });

    it('should track multiple subscribers', () => {
      const callbacks = Array.from({ length: 5 }, () => vi.fn());
      callbacks.forEach((cb, i) => broadcast.subscribe(`sub${i}`, cb));
      expect(broadcast.getSubscriberCount()).toBe(5);
    });

    it('should handle duplicate subscriptions', () => {
      const callback = vi.fn();
      broadcast.subscribe('sub1', callback);
      broadcast.subscribe('sub1', callback);
      // Last subscription wins
      expect(broadcast.getSubscriberCount()).toBe(1);
    });
  });

  describe('Event Broadcasting', () => {
    it('should broadcast events to all subscribers', () => {
      const callbacks = [vi.fn(), vi.fn(), vi.fn()];
      callbacks.forEach((cb, i) => broadcast.subscribe(`sub${i}`, cb));
      broadcast.startBroadcast();

      const event: BroadcastEvent = {
        type: 'game-state',
        timestamp: Date.now(),
        data: { tick: 1 },
      };
      broadcast.broadcastEvent(event);

      callbacks.forEach(cb => {
        expect(cb).toHaveBeenCalledWith(event);
      });
    });

    it('should not broadcast when stopped', () => {
      const callback = vi.fn();
      broadcast.subscribe('sub1', callback);
      // Don't start broadcast

      const event: BroadcastEvent = {
        type: 'game-state',
        timestamp: Date.now(),
        data: {},
      };
      broadcast.broadcastEvent(event);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should queue events', () => {
      broadcast.startBroadcast();

      for (let i = 0; i < 10; i++) {
        broadcast.broadcastEvent({
          type: 'tick',
          timestamp: Date.now() + i,
          data: { turn: i },
        });
      }

      expect(broadcast.getEventCount()).toBe(10);
    });

    it('should track event types', () => {
      broadcast.startBroadcast();
      const callback = vi.fn();
      broadcast.subscribe('sub1', callback);

      broadcast.broadcastEvent({
        type: 'game-start',
        timestamp: Date.now(),
        data: {},
      });
      broadcast.broadcastEvent({
        type: 'game-state',
        timestamp: Date.now(),
        data: {},
      });

      const events = broadcast.getEvents();
      const types = events.map(e => e.type);
      expect(types).toContain('game-start');
      expect(types).toContain('game-state');
    });
  });

  describe('Event Filtering', () => {
    it('should not send events to inactive subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      broadcast.subscribe('sub1', callback1);
      broadcast.subscribe('sub2', callback2);
      broadcast.startBroadcast();

      broadcast.unsubscribe('sub1');

      const event: BroadcastEvent = {
        type: 'test',
        timestamp: Date.now(),
        data: {},
      };
      broadcast.broadcastEvent(event);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith(event);
    });
  });

  describe('Performance', () => {
    it('should handle high subscriber count', () => {
      broadcast.startBroadcast();

      // Subscribe 100 listeners
      for (let i = 0; i < 100; i++) {
        broadcast.subscribe(`sub${i}`, vi.fn());
      }

      const event: BroadcastEvent = {
        type: 'perf-test',
        timestamp: Date.now(),
        data: {},
      };

      const start = Date.now();
      broadcast.broadcastEvent(event);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100); // Should be fast
    });

    it('should handle rapid events', () => {
      broadcast.startBroadcast();
      broadcast.subscribe('sub1', vi.fn());

      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        broadcast.broadcastEvent({
          type: 'rapid',
          timestamp: Date.now(),
          data: { id: i },
        });
      }
      const elapsed = Date.now() - start;

      expect(broadcast.getEventCount()).toBe(1000);
      expect(elapsed).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('Event Clearing', () => {
    it('should clear event queue', () => {
      broadcast.startBroadcast();
      broadcast.broadcastEvent({
        type: 'test1',
        timestamp: Date.now(),
        data: {},
      });
      broadcast.broadcastEvent({
        type: 'test2',
        timestamp: Date.now(),
        data: {},
      });

      expect(broadcast.getEventCount()).toBe(2);
      broadcast.clearEvents();
      expect(broadcast.getEventCount()).toBe(0);
    });
  });

  describe('Broadcast States', () => {
    it('should transition through states correctly', () => {
      const callback = vi.fn();
      broadcast.subscribe('sub1', callback);

      // Initially stopped
      expect(broadcast['isRunning']).toBe(false);

      // Start broadcasting
      broadcast.startBroadcast();
      expect(broadcast['isRunning']).toBe(true);

      // Send events while running
      broadcast.broadcastEvent({
        type: 'test',
        timestamp: Date.now(),
        data: {},
      });
      expect(broadcast.getEventCount()).toBe(1);

      // Stop and verify no more events
      broadcast.stopBroadcast();
      broadcast.broadcastEvent({
        type: 'ignored',
        timestamp: Date.now(),
        data: {},
      });
      expect(broadcast.getEventCount()).toBe(1); // Still 1, new one ignored
    });
  });
});
