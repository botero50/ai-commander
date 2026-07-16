/**
 * @ai-commander/core
 *
 * Game-agnostic AI tournament framework
 * Reusable across any game with a GameAdapter implementation
 */
export * from './tournament/elo-rating';
export * from './tournament/broadcast-server';
export * from './brain/ollama-brain';
export * from './brain/ai-loop-orchestrator';
export * from './brain/brain-factory';
export * from './brain/ollama-request-throttler';
export * from './brain/decision-logger';
export * from './streaming/broadcast-state';
export * from './analytics/statistics-analyzer';
export * from './analytics/match-comparison';
export * from './analytics/prediction-system';
export * from './commentary/trash-talk-generator';
export * from './config/logger';
export * from './types';
/**
 * To integrate a new game:
 * 1. Create a GameAdapter implementation
 * 2. Use BrainFactory to create AI brains
 * 3. Use EloRating for tournament rankings
 * 4. Use BroadcastServer for streaming
 */
//# sourceMappingURL=index.d.ts.map