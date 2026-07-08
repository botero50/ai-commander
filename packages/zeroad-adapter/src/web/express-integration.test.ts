/**
 * Test: Express Integration
 *
 * Validates:
 * 1. REST API endpoints for match management
 * 2. Request validation
 * 3. Status code handling
 * 4. Response formats
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMatchHandler,
  getMatchHandler,
  listMatchesHandler,
  getStatsHandler,
  closeMatchHandler,
} from './express-integration.js';
import { MatchViewerManager } from './match-viewer.js';
import { MatchServer } from './match-server.js';

describe('Express Integration', () => {
  let viewerManager: MatchViewerManager;
  let matchServer: MatchServer;

  beforeEach(() => {
    viewerManager = new MatchViewerManager();
    matchServer = new MatchServer(viewerManager, { port: 3000 });
  });

  describe('Create Match Handler', () => {
    it('should create a new match', () => {
      const handler = createMatchHandler(viewerManager);

      let response: any;
      const req = { body: { brain1: 'Brain1', brain2: 'Brain2' } };
      const res = {
        status: (code: number) => ({
          json: (data: any) => {
            response = { code, data };
          },
        }),
        json: (data: any) => {
          response = { code: 200, data };
        },
      };

      handler(req, res);

      expect(response.code).toBe(201);
      expect(response.data.matchId).toBeDefined();
      expect(response.data.brain1).toBe('Brain1');
    });

    it('should validate required fields', () => {
      const handler = createMatchHandler(viewerManager);

      let response: any;
      const req = { body: { brain1: 'Brain1' } };
      const res = {
        status: (code: number) => ({
          json: (data: any) => {
            response = { code, data };
          },
        }),
      };

      handler(req, res);

      expect(response.code).toBe(400);
      expect(response.data.error).toBeDefined();
    });
  });

  describe('Get Match Handler', () => {
    it('should get existing match', () => {
      const viewer = viewerManager.createViewer('match1', 'Brain1', 'Brain2');
      const handler = getMatchHandler(viewerManager, matchServer);

      let response: any;
      const req = { params: { matchId: 'match1' } };
      const res = {
        status: (code: number) => ({
          json: (data: any) => {
            response = { code, data };
          },
        }),
        json: (data: any) => {
          response = { code: 200, data };
        },
      };

      handler(req, res);

      expect(response.code).toBe(200);
      expect(response.data.matchId).toBe('match1');
      expect(response.data.brain1).toBe('Brain1');
    });

    it('should return 404 for non-existent match', () => {
      const handler = getMatchHandler(viewerManager, matchServer);

      let response: any;
      const req = { params: { matchId: 'nonexistent' } };
      const res = {
        status: (code: number) => ({
          json: (data: any) => {
            response = { code, data };
          },
        }),
      };

      handler(req, res);

      expect(response.code).toBe(404);
    });
  });

  describe('List Matches Handler', () => {
    it('should list all matches', () => {
      viewerManager.createViewer('match1', 'Brain1', 'Brain2');
      viewerManager.createViewer('match2', 'Brain3', 'Brain4');

      const handler = listMatchesHandler(viewerManager, matchServer);

      let response: any;
      const req = {};
      const res = {
        json: (data: any) => {
          response = data;
        },
      };

      handler(req, res);

      expect(response.count).toBe(2);
      expect(response.matches).toHaveLength(2);
    });

    it('should return empty list when no matches', () => {
      const handler = listMatchesHandler(viewerManager, matchServer);

      let response: any;
      const req = {};
      const res = {
        json: (data: any) => {
          response = data;
        },
      };

      handler(req, res);

      expect(response.count).toBe(0);
      expect(response.matches).toHaveLength(0);
    });
  });

  describe('Stats Handler', () => {
    it('should return server stats', () => {
      viewerManager.createViewer('match1', 'Brain1', 'Brain2');

      const handler = getStatsHandler(viewerManager, matchServer);

      let response: any;
      const req = {};
      const res = {
        json: (data: any) => {
          response = data;
        },
      };

      handler(req, res);

      expect(response.uptime).toBeGreaterThan(0);
      expect(response.timestamp).toBeDefined();
      expect(response.matches.total).toBe(1);
      expect(response.viewers.total).toBeDefined();
    });
  });

  describe('Close Match Handler', () => {
    it('should close an existing match', () => {
      const viewer = viewerManager.createViewer('match1', 'Brain1', 'Brain2');
      const handler = closeMatchHandler(viewerManager, matchServer);

      let response: any;
      const req = { params: { matchId: 'match1' } };
      const res = {
        json: (data: any) => {
          response = data;
        },
      };

      handler(req, res);

      expect(response.message).toBe('Match closed');
      expect(viewerManager.getViewer('match1')).toBeUndefined();
    });

    it('should return 404 for non-existent match', () => {
      const handler = closeMatchHandler(viewerManager, matchServer);

      let response: any;
      const req = { params: { matchId: 'nonexistent' } };
      const res = {
        status: (code: number) => ({
          json: (data: any) => {
            response = { code, data };
          },
        }),
      };

      handler(req, res);

      expect(response.code).toBe(404);
    });
  });
});
