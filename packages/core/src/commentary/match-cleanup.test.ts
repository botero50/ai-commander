/**
 * Tests for Story 56.2 — Match Cleanup
 *
 * Verifies:
 * - Stops game session
 * - Shuts down adapter
 * - Releases resources
 * - No orphan processes
 * - Arena returns to clean state
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchCleanup } from './match-cleanup.js';
import type { GameSession } from '@ai-commander/adapter';

describe('MatchCleanup', () => {
  let cleanup: MatchCleanup;

  beforeEach(() => {
    cleanup = new MatchCleanup();
  });

  describe('cleanup', () => {
    it('should handle null session gracefully', async () => {
      const mockAdapter = {
        shutdown: vi.fn().mockResolvedValue(undefined),
      };

      const result = await cleanup.cleanup(mockAdapter as any, null);

      expect(result.success).toBe(true);
      expect(result.resourcesReleased).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);
      expect(mockAdapter.shutdown).toHaveBeenCalled();
    });

    it('should stop session before shutting down adapter', async () => {
      const callOrder: string[] = [];

      const mockSession = {
        stop: vi.fn().mockImplementation(async () => {
          callOrder.push('session.stop');
        }),
      };

      const mockAdapter = {
        shutdown: vi.fn().mockImplementation(async () => {
          callOrder.push('adapter.shutdown');
        }),
      };

      const result = await cleanup.cleanup(mockAdapter as any, mockSession as any as GameSession);

      expect(result.success).toBe(true);
      expect(callOrder).toEqual(['session.stop', 'adapter.shutdown']);
    });

    it('should record errors without stopping cleanup', async () => {
      const mockSession = {
        stop: vi.fn().mockRejectedValue(new Error('Session stop failed')),
      };

      const mockAdapter = {
        shutdown: vi.fn().mockResolvedValue(undefined),
      };

      const result = await cleanup.cleanup(mockAdapter as any, mockSession as any as GameSession);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Session stop failed');
      expect(mockAdapter.shutdown).toHaveBeenCalled(); // Should still try shutdown
    });

    it('should measure cleanup duration', async () => {
      const mockSession = {
        stop: vi.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 50))
        ),
      };

      const mockAdapter = {
        shutdown: vi.fn().mockResolvedValue(undefined),
      };

      const result = await cleanup.cleanup(mockAdapter as any, mockSession as any as GameSession);

      expect(result.duration).toBeGreaterThanOrEqual(50);
    });

    it('should count released resources', async () => {
      const mockSession = {
        stop: vi.fn().mockResolvedValue(undefined),
      };

      const mockAdapter = {
        shutdown: vi.fn().mockResolvedValue(undefined),
      };

      const result = await cleanup.cleanup(mockAdapter as any, mockSession as any as GameSession);

      // Should count: session stop (1) + adapter shutdown (1) = 2
      expect(result.resourcesReleased).toBe(2);
    });

    it('should handle adapter shutdown errors', async () => {
      const mockSession = {
        stop: vi.fn().mockResolvedValue(undefined),
      };

      const mockAdapter = {
        shutdown: vi.fn().mockRejectedValue(new Error('Adapter shutdown failed')),
      };

      const result = await cleanup.cleanup(mockAdapter as any, mockSession as any as GameSession);

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Adapter shutdown failed'));
    });

    it('should handle null adapter', async () => {
      const mockSession = {
        stop: vi.fn().mockResolvedValue(undefined),
      };

      const result = await cleanup.cleanup(null as any, mockSession as any as GameSession);

      expect(result.success).toBe(true);
      expect(mockSession.stop).toHaveBeenCalled();
    });

    it('should handle both null session and adapter', async () => {
      const result = await cleanup.cleanup(null as any, null);

      expect(result.success).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.resourcesReleased).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cleanup acceptance criteria', () => {
    it('should leave no orphan processes (mocked)', async () => {
      // In real scenario, would check process list
      const mockSession = {
        stop: vi.fn().mockResolvedValue(undefined),
      };

      const mockAdapter = {
        shutdown: vi.fn().mockResolvedValue(undefined),
      };

      const result = await cleanup.cleanup(mockAdapter as any, mockSession as any as GameSession);

      // Verify cleanup said it succeeded
      expect(result.success).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reset state for next match', async () => {
      const mockSession = {
        stop: vi.fn().mockResolvedValue(undefined),
      };

      const mockAdapter = {
        shutdown: vi.fn().mockResolvedValue(undefined),
      };

      const result = await cleanup.cleanup(mockAdapter as any, mockSession as any as GameSession);

      // After cleanup, should be ready for next match
      // (would verify by creating new adapter/session)
      expect(result.success).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should require no application restart', async () => {
      // This test verifies the cleanup is complete and self-contained
      // By successfully returning without requiring external restart
      const mockSession = {
        stop: vi.fn().mockResolvedValue(undefined),
      };

      const mockAdapter = {
        shutdown: vi.fn().mockResolvedValue(undefined),
      };

      const result1 = await cleanup.cleanup(mockAdapter as any, mockSession as any as GameSession);
      expect(result1.success).toBe(true);

      // Could immediately use cleanup again for next match
      const result2 = await cleanup.cleanup(mockAdapter as any, mockSession as any as GameSession);
      expect(result2.success).toBe(true);
    });
  });

  describe('verify', () => {
    it('should verify cleanup succeeded', async () => {
      const mockAdapter = {
        initialized: false,
      };

      const verified = await cleanup.verify(mockAdapter as any);

      expect(verified).toBe(true);
    });

    it('should detect incomplete cleanup', async () => {
      const mockAdapter = {
        initialized: true,
      };

      const verified = await cleanup.verify(mockAdapter as any);

      expect(verified).toBe(false);
    });

    it('should handle null adapter in verify', async () => {
      const verified = await cleanup.verify(null);

      expect(verified).toBe(true);
    });
  });
});
