/**
 * Express routes for match data endpoints
 * Provides REST API for UI components to fetch live match data
 */

import type { Router, Request, Response } from 'express';
import { MatchDataService } from './match-data-service.js';

export function setupMatchDataRoutes(router: Router, matchDataService: MatchDataService): void {
  /**
   * GET /api/match/metadata
   * Returns match metadata (players, start time, current tick)
   */
  router.get('/api/match/metadata', (req: Request, res: Response) => {
    try {
      const metadata = matchDataService.getMatchMetadata();
      if (!metadata) {
        return res.status(404).json({ error: 'No active match' });
      }
      res.json(metadata);
    } catch (err) {
      res.status(500).json({ error: `Failed to get metadata: ${err}` });
    }
  });

  /**
   * GET /api/match/state
   * Returns current game state (resources, population, units, buildings)
   */
  router.get('/api/match/state', (req: Request, res: Response) => {
    try {
      const state = matchDataService.getGameState();
      if (!state) {
        return res.status(404).json({ error: 'No active match' });
      }
      res.json(state);
    } catch (err) {
      res.status(500).json({ error: `Failed to get state: ${err}` });
    }
  });

  /**
   * GET /api/match/commentary
   * Returns recent commentary events
   * Query params: limit (default 50)
   */
  router.get('/api/match/commentary', (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
      const events = matchDataService.getCommentaryEvents(limit);
      res.json({ events, count: events.length });
    } catch (err) {
      res.status(500).json({ error: `Failed to get commentary: ${err}` });
    }
  });

  /**
   * GET /api/match/decisions
   * Returns recent decision events (AI actions)
   * Query params: limit (default 50)
   */
  router.get('/api/match/decisions', (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
      const events = matchDataService.getDecisionEvents(limit);
      res.json({ events, count: events.length });
    } catch (err) {
      res.status(500).json({ error: `Failed to get decisions: ${err}` });
    }
  });

  /**
   * GET /api/match/replay
   * Returns replay data and highlights
   */
  router.get('/api/match/replay', (req: Request, res: Response) => {
    try {
      const replayData = matchDataService.getReplayData();
      if (!replayData) {
        return res.status(404).json({ error: 'No replay data available' });
      }
      res.json(replayData);
    } catch (err) {
      res.status(500).json({ error: `Failed to get replay: ${err}` });
    }
  });

  /**
   * GET /api/match/ai-status/:player
   * Returns AI status (latency, confidence, objective)
   * Params: player (player1|player2)
   */
  router.get('/api/match/ai-status/:player', (req: Request, res: Response) => {
    try {
      const player = req.params.player as 'player1' | 'player2';
      if (!['player1', 'player2'].includes(player)) {
        return res.status(400).json({ error: 'Invalid player' });
      }
      const status = matchDataService.getAIStatus(player);
      if (!status) {
        return res.status(404).json({ error: 'AI status not available' });
      }
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: `Failed to get AI status: ${err}` });
    }
  });

  /**
   * GET /api/match/minimap
   * Returns minimap data (unit positions, buildings, FOW)
   */
  router.get('/api/match/minimap', (req: Request, res: Response) => {
    try {
      const minimapData = matchDataService.getMinimapData();
      if (!minimapData) {
        return res.status(404).json({ error: 'Minimap data not available' });
      }
      res.json(minimapData);
    } catch (err) {
      res.status(500).json({ error: `Failed to get minimap: ${err}` });
    }
  });

  /**
   * GET /api/match/objectives
   * Returns objective tracker (strategy evolution)
   */
  router.get('/api/match/objectives', (req: Request, res: Response) => {
    try {
      const objectiveData = matchDataService.getObjectiveTracker();
      if (!objectiveData) {
        return res.status(404).json({ error: 'Objective data not available' });
      }
      res.json(objectiveData);
    } catch (err) {
      res.status(500).json({ error: `Failed to get objectives: ${err}` });
    }
  });

  /**
   * GET /api/match/events
   * Returns event annotations (major events)
   * Query params: limit (default 50)
   */
  router.get('/api/match/events', (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
      const events = matchDataService.getEventAnnotations(limit);
      res.json({ events, count: events.length });
    } catch (err) {
      res.status(500).json({ error: `Failed to get events: ${err}` });
    }
  });

  /**
   * GET /api/health
   * Health check endpoint
   */
  router.get('/api/health', (req: Request, res: Response) => {
    const metadata = matchDataService.getMatchMetadata();
    res.json({
      status: metadata ? 'healthy' : 'idle',
      hasActiveMatch: !!metadata,
      timestamp: Date.now(),
    });
  });
}
