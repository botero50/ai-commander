/**
 * @ai-commander/core
 * 
 * Game-agnostic AI tournament framework
 * Reusable across any game with a GameAdapter implementation
 */

// Tournament System
export * from './tournament/elo-rating';
export * from './tournament/broadcast-server';

// Brain Framework
export * from './brain/ollama-brain';
export * from './brain/ai-loop-orchestrator';
export * from './brain/brain-factory';
export * from './brain/ollama-request-throttler';
export * from './brain/decision-logger';

// Streaming
export * from './streaming/broadcast-state';

// Analytics
export * from './analytics/statistics-analyzer';
export * from './analytics/match-comparison';
export * from './analytics/prediction-system';

// Commentary
export * from './commentary/trash-talk-generator';

// Config
export * from './config/logger';

// Types
export * from './types';

/**
 * To integrate a new game:
 * 1. Create a GameAdapter implementation
 * 2. Use BrainFactory to create AI brains
 * 3. Use EloRating for tournament rankings
 * 4. Use BroadcastServer for streaming
 */
