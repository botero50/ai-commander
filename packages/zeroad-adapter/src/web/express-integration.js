/**
 * Express.js Integration
 *
 * Express middleware and route handlers for match viewer integration.
 * - REST API endpoints for match management
 * - WebSocket support via ws package
 * - Request validation
 */
/**
 * HTTP handler to create a new match viewer
 * POST /api/matches
 * Body: { brain1: string, brain2: string }
 */
export function createMatchHandler(viewerManager) {
    return (req, res) => {
        try {
            const { brain1, brain2 } = req.body;
            if (!brain1 || !brain2) {
                res.status(400).json({ error: 'brain1 and brain2 required' });
                return;
            }
            // Generate match ID
            const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            try {
                const viewer = viewerManager.createViewer(matchId, brain1, brain2);
                res.status(201).json({
                    matchId,
                    brain1,
                    brain2,
                    createdAt: new Date().toISOString(),
                });
            }
            catch (err) {
                res.status(409).json({ error: err.message });
            }
        }
        catch (err) {
            res.status(500).json({ error: 'Internal server error' });
        }
    };
}
/**
 * HTTP handler to get match status
 * GET /api/matches/:matchId
 */
export function getMatchHandler(viewerManager, matchServer) {
    return (req, res) => {
        try {
            const { matchId } = req.params;
            const viewer = viewerManager.getViewer(matchId);
            if (!viewer) {
                res.status(404).json({ error: 'Match not found' });
                return;
            }
            const state = viewer.getState();
            const clientCount = matchServer.getClientCount(matchId);
            res.json({
                matchId,
                ...state,
                viewers: clientCount,
            });
        }
        catch (err) {
            res.status(500).json({ error: 'Internal server error' });
        }
    };
}
/**
 * HTTP handler to list all matches
 * GET /api/matches
 */
export function listMatchesHandler(viewerManager, matchServer) {
    return (req, res) => {
        try {
            const activeMatches = matchServer.getActiveMatches();
            const matches = activeMatches
                .map((matchId) => {
                const viewer = viewerManager.getViewer(matchId);
                if (!viewer)
                    return null;
                const state = viewer.getState();
                const clientCount = matchServer.getClientCount(matchId);
                return {
                    matchId,
                    brain1: state.brain1,
                    brain2: state.brain2,
                    status: state.status,
                    tick: state.currentTick,
                    viewers: clientCount,
                };
            })
                .filter(Boolean);
            res.json({
                count: matches.length,
                matches,
                totalViewers: matchServer.getTotalClientCount(),
            });
        }
        catch (err) {
            res.status(500).json({ error: 'Internal server error' });
        }
    };
}
/**
 * HTTP handler to get server stats
 * GET /api/stats
 */
export function getStatsHandler(viewerManager, matchServer) {
    return (req, res) => {
        try {
            const activeMatches = matchServer.getActiveMatches();
            res.json({
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                matches: {
                    active: activeMatches.length,
                    total: viewerManager.getViewerCount(),
                },
                viewers: {
                    total: matchServer.getTotalClientCount(),
                    perMatch: Object.fromEntries(activeMatches.map((matchId) => [matchId, matchServer.getClientCount(matchId)])),
                },
            });
        }
        catch (err) {
            res.status(500).json({ error: 'Internal server error' });
        }
    };
}
/**
 * HTTP handler to close a match
 * DELETE /api/matches/:matchId
 */
export function closeMatchHandler(viewerManager, matchServer) {
    return (req, res) => {
        try {
            const { matchId } = req.params;
            const viewer = viewerManager.getViewer(matchId);
            if (!viewer) {
                res.status(404).json({ error: 'Match not found' });
                return;
            }
            // Disconnect all clients
            matchServer.disconnectMatch(matchId);
            // Remove viewer
            viewerManager.removeViewer(matchId);
            res.json({ message: 'Match closed', matchId });
        }
        catch (err) {
            res.status(500).json({ error: 'Internal server error' });
        }
    };
}
/**
 * Express middleware configuration
 * Use this to set up all match viewer routes
 */
export function setupMatchViewerRoutes(app, viewerManager, matchServer) {
    // Create match
    app.post('/api/matches', createMatchHandler(viewerManager));
    // Get match
    app.get('/api/matches/:matchId', getMatchHandler(viewerManager, matchServer));
    // List matches
    app.get('/api/matches', listMatchesHandler(viewerManager, matchServer));
    // Server stats
    app.get('/api/stats', getStatsHandler(viewerManager, matchServer));
    // Close match
    app.delete('/api/matches/:matchId', closeMatchHandler(viewerManager, matchServer));
}
//# sourceMappingURL=express-integration.js.map