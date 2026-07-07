import type { Agent } from './agent.js';
import type { Tick } from './temporal.js';
/**
 * Unique identifier for an event.
 */
export type EventId = string & {
    readonly __eventId: unique symbol;
};
/**
 * Create an EventId.
 */
export declare function createEventId(id: string): EventId;
/**
 * Type/category of event.
 * Games define their own event types.
 */
export interface EventType {
    /**
     * Unique identifier for this event type.
     * Examples: "agent-moved", "combat-resolved", "resource-gathered"
     */
    readonly id: string;
    /**
     * Human-readable name.
     */
    readonly name: string;
    /**
     * Category for grouping related events.
     * Examples: "movement", "combat", "economy", "environmental"
     */
    readonly category: string;
    /**
     * Is this event visible to all players or only some?
     */
    readonly isPublic: boolean;
}
/**
 * Create an EventType value object.
 */
export declare function createEventType(id: string, name: string, category: string, isPublic?: boolean): EventType;
/**
 * Event that occurred in the game.
 * Record of something that happened.
 */
export interface Event {
    /**
     * Unique identifier for this event.
     */
    readonly id: EventId;
    /**
     * Type of event.
     */
    readonly eventType: EventType;
    /**
     * Agent that triggered this event (if applicable).
     * null if triggered by environment or system.
     */
    readonly triggeringAgentId: Agent | null;
    /**
     * Tick when this event occurred.
     */
    readonly occurredAtTick: Tick;
    /**
     * Event-specific data.
     * Examples: {source, target, amount, position, reason}
     */
    readonly data: Record<string, unknown>;
    /**
     * Which agents/players are aware of this event?
     * Empty list = nobody yet (not yet broadcast).
     * null = everyone (public event).
     */
    readonly visibleTo: readonly string[] | null;
}
/**
 * Create an Event value object.
 */
export declare function createEvent(id: EventId, eventType: EventType, triggeringAgentId: Agent | null, occurredAtTick: Tick, data?: Record<string, unknown>, visibleTo?: readonly string[] | null): Event;
/**
 * Check if a player/agent can see this event.
 */
export declare function canObserveEvent(event: Event, observerId: string): boolean;
/**
 * Check if event is public.
 */
export declare function isPublicEvent(event: Event): boolean;
/**
 * Create a public event (visible to all).
 */
export declare function createPublicEvent(id: EventId, eventType: EventType, triggeringAgentId: Agent | null, occurredAtTick: Tick, data?: Record<string, unknown>): Event;
/**
 * Create a private event (visible to specific observers).
 */
export declare function createPrivateEvent(id: EventId, eventType: EventType, triggeringAgentId: Agent | null, occurredAtTick: Tick, visibleTo: readonly string[], data?: Record<string, unknown>): Event;
//# sourceMappingURL=event.d.ts.map