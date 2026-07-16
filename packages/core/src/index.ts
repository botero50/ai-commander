/**
 * @ai-commander/core
 *
 * Game-agnostic AI tournament framework
 * Reusable across any game with a GameAdapter implementation
 */

// Tournament System
export * from './tournament/elo-rating.js';

// Config
export * from './config/logger.js';

/**
 * To integrate a new game:
 * 1. Create a GameAdapter implementation
 * 2. Use BrainFactory to create AI brains
 * 3. Use EloRating for tournament rankings
 * 4. Use BroadcastServer for streaming
 */
