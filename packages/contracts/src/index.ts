/**
 * @ai-commander/contracts
 *
 * Defines the core interfaces and contracts for the AI Commander framework.
 * These contracts enable:
 * - Type-safe integration between components
 * - Pluggable AI brains (Ollama, Claude, OpenAI, etc.)
 * - Pluggable game adapters (Chess, Checkers, RTS games, etc.)
 * - Event-driven architecture
 * - Tournament and match orchestration
 */

export * from './brain.js';
export * from './game-adapter.js';
export * from './match.js';
export * from './observer.js';
