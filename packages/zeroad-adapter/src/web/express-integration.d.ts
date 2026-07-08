/**
 * Express.js Integration
 *
 * Express middleware and route handlers for match viewer integration.
 * - REST API endpoints for match management
 * - WebSocket support via ws package
 * - Request validation
 */
import type { MatchViewerManager } from './match-viewer.js';
import type { MatchServer } from './match-server.js';
/**
 * HTTP handler to create a new match viewer
 * POST /api/matches
 * Body: { brain1: string, brain2: string }
 */
export declare function createMatchHandler(viewerManager: MatchViewerManager): (req: any, res: any) => void;
/**
 * HTTP handler to get match status
 * GET /api/matches/:matchId
 */
export declare function getMatchHandler(viewerManager: MatchViewerManager, matchServer: MatchServer): (req: any, res: any) => void;
/**
 * HTTP handler to list all matches
 * GET /api/matches
 */
export declare function listMatchesHandler(viewerManager: MatchViewerManager, matchServer: MatchServer): (req: any, res: any) => void;
/**
 * HTTP handler to get server stats
 * GET /api/stats
 */
export declare function getStatsHandler(viewerManager: MatchViewerManager, matchServer: MatchServer): (req: any, res: any) => void;
/**
 * HTTP handler to close a match
 * DELETE /api/matches/:matchId
 */
export declare function closeMatchHandler(viewerManager: MatchViewerManager, matchServer: MatchServer): (req: any, res: any) => void;
/**
 * Express middleware configuration
 * Use this to set up all match viewer routes
 */
export declare function setupMatchViewerRoutes(app: any, viewerManager: MatchViewerManager, matchServer: MatchServer): void;
//# sourceMappingURL=express-integration.d.ts.map