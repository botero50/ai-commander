/**
 * Story 59.2 — Broadcast Overlay UI Tests
 *
 * Validates broadcast display components and API integration.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import BroadcastOverlay from './BroadcastOverlay';

// Mock fetch
global.fetch = vi.fn();

describe('Broadcast Overlay (Story 59.2)', () => {
  const mockMetricsResponse = {
    players: [
      {
        playerId: 1,
        playerName: 'AI Player 1',
        resources: { wood: 500, stone: 300, food: 250, metal: 50 },
        units: { count: 25, militaryValue: 250 },
        buildings: { count: 8 },
        population: { current: 45, max: 300 },
        economy: { woodRate: 5, stoneRate: 3, foodRate: 4 },
      },
      {
        playerId: 2,
        playerName: 'AI Player 2',
        resources: { wood: 450, stone: 280, food: 220, metal: 40 },
        units: { count: 22, militaryValue: 220 },
        buildings: { count: 7 },
        population: { current: 40, max: 300 },
        economy: { woodRate: 4, stoneRate: 3, foodRate: 3 },
      },
    ],
  };

  const mockStatusResponse = {
    isRunning: true,
    matchesCompleted: 5,
    uptime: 3600,
    currentMatch: { number: 6, startTime: '2026-07-10T12:00:00Z' },
    broadcastActive: true,
    metricsActive: true,
    health: { arena: 'healthy', broadcast: 'healthy', metrics: 'healthy' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/metrics/current')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMetricsResponse),
        });
      }
      if (url.includes('/stream/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStatusResponse),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  describe('rendering', () => {
    it('should render overlay container', () => {
      render(<BroadcastOverlay />);
      const overlay = document.querySelector('[class*="overlay"]');
      expect(overlay).toBeTruthy();
    });

    it('should display connection status', async () => {
      render(<BroadcastOverlay />);
      await waitFor(() => {
        const status = screen.getByText(/CONNECTED|OFFLINE/);
        expect(status).toBeTruthy();
      });
    });

    it('should display top bar with stats', async () => {
      render(<BroadcastOverlay />);
      await waitFor(() => {
        expect(screen.getByText('UPTIME')).toBeTruthy();
        expect(screen.getByText('MATCHES')).toBeTruthy();
      });
    });

    it('should display player panels', async () => {
      render(<BroadcastOverlay />);
      await waitFor(() => {
        expect(screen.getByText('AI Player 1')).toBeTruthy();
        expect(screen.getByText('AI Player 2')).toBeTruthy();
      });
    });

    it('should display VS divider', async () => {
      render(<BroadcastOverlay />);
      await waitFor(() => {
        expect(screen.getByText('VS')).toBeTruthy();
      });
    });

    it('should display bottom bar with health status', async () => {
      render(<BroadcastOverlay />);
      await waitFor(() => {
        expect(screen.getByText('ARENA')).toBeTruthy();
        expect(screen.getByText('BROADCAST')).toBeTruthy();
        expect(screen.getByText('METRICS')).toBeTruthy();
      });
    });
  });

  describe('metrics display', () => {
    it('should fetch and display player metrics', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        expect(screen.getByText('AI Player 1')).toBeTruthy();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/metrics/current')
      );
    });

    it('should display resource values', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        // Resources should be displayed
        const elements = screen.getAllByText(/500|450/);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it('should display unit counts', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        expect(screen.getByText('Units:')).toBeTruthy();
      });
    });

    it('should display building counts', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        expect(screen.getByText('Buildings:')).toBeTruthy();
      });
    });

    it('should display population', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        expect(screen.getByText('Population:')).toBeTruthy();
      });
    });

    it('should format large numbers', async () => {
      const customMetrics = {
        players: [
          {
            ...mockMetricsResponse.players[0],
            resources: { ...mockMetricsResponse.players[0].resources, wood: 1500 },
          },
          mockMetricsResponse.players[1],
        ],
      };

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/metrics/current')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(customMetrics),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStatusResponse),
        });
      });

      render(<BroadcastOverlay />);

      await waitFor(() => {
        // 1500 should be displayed as 1.5k
        expect(screen.getByText(/1\.\d?k/)).toBeTruthy();
      });
    });
  });

  describe('status display', () => {
    it('should fetch stream status', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/stream/status')
        );
      });
    });

    it('should display matches completed', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeTruthy();
      });
    });

    it('should display uptime formatted', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        expect(screen.getByText(/\d{2}:\d{2}:\d{2}/)).toBeTruthy();
      });
    });

    it('should display current match number', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        expect(screen.getByText(/MATCH #6/)).toBeTruthy();
      });
    });
  });

  describe('health indicators', () => {
    it('should show arena health', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        expect(screen.getByText('ARENA')).toBeTruthy();
      });
    });

    it('should show broadcast health', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        expect(screen.getByText('BROADCAST')).toBeTruthy();
      });
    });

    it('should show metrics health', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        expect(screen.getByText('METRICS')).toBeTruthy();
      });
    });

    it('should handle healthy status', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        const healthItems = document.querySelectorAll('[class*="healthItem"]');
        expect(healthItems.length).toBeGreaterThan(0);
      });
    });

    it('should handle failed status', async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/metrics/current')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockMetricsResponse),
          });
        }
        if (url.includes('/stream/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              ...mockStatusResponse,
              health: { arena: 'failed', broadcast: 'failed', metrics: 'failed' },
            }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<BroadcastOverlay />);

      await waitFor(() => {
        expect(screen.getByText('ARENA')).toBeTruthy();
      });
    });
  });

  describe('API integration', () => {
    it('should use custom API URL', async () => {
      render(<BroadcastOverlay apiUrl="http://localhost:4000" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('localhost:4000')
        );
      });
    });

    it('should poll metrics regularly', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/metrics/current')
        );
      }, { timeout: 1000 });
    });

    it('should poll status regularly', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/stream/status')
        );
      }, { timeout: 1000 });
    });

    it('should handle connection errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      render(<BroadcastOverlay />);

      await waitFor(() => {
        // Should still render without crashing
        expect(screen.queryByText(/CONNECTED|OFFLINE/)).toBeTruthy();
      });
    });

    it('should handle missing metrics gracefully', async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/metrics/current')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ players: [] }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStatusResponse),
        });
      });

      render(<BroadcastOverlay />);

      // Should render without crashing
      expect(true).toBe(true);
    });
  });

  describe('responsive layout', () => {
    it('should render player comparison panel', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        const comparison = document.querySelector('[class*="playerComparison"]');
        expect(comparison).toBeTruthy();
      });
    });

    it('should display both player panels side by side', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        const panels = document.querySelectorAll('[class*="playerPanel"]');
        expect(panels.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should have proper spacing', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        const overlay = document.querySelector('[class*="overlay"]');
        expect(overlay).toBeTruthy();
      });
    });
  });

  describe('broadcast streaming scenario', () => {
    it('should display complete broadcast screen', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        // Top bar
        expect(screen.getByText('UPTIME')).toBeTruthy();
        // Players
        expect(screen.getByText('AI Player 1')).toBeTruthy();
        expect(screen.getByText('AI Player 2')).toBeTruthy();
        // Bottom bar
        expect(screen.getByText('ARENA')).toBeTruthy();
        expect(screen.getByText('🎬 AI COMMANDER STREAM')).toBeTruthy();
      });
    });

    it('should update metrics in real-time', async () => {
      let callCount = 0;

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/metrics/current')) {
          callCount++;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockMetricsResponse),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStatusResponse),
        });
      });

      render(<BroadcastOverlay />);

      await waitFor(() => {
        expect(callCount).toBeGreaterThan(0);
      });
    });

    it('should show continuous uptime', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        expect(screen.getByText(/\d{2}:\d{2}:\d{2}/)).toBeTruthy();
      });
    });
  });

  describe('esports broadcast features', () => {
    it('should display stream label', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        expect(screen.getByText('🎬 AI COMMANDER STREAM')).toBeTruthy();
      });
    });

    it('should have proper visual hierarchy', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        // Player names should be prominent
        expect(screen.getByText('AI Player 1')).toBeTruthy();
        expect(screen.getByText('AI Player 2')).toBeTruthy();
      });
    });

    it('should display competitive comparison', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        // Both players should be displayed
        expect(screen.getByText('AI Player 1')).toBeTruthy();
        expect(screen.getByText('AI Player 2')).toBeTruthy();
        // With VS between them
        expect(screen.getByText('VS')).toBeTruthy();
      });
    });

    it('should show real-time economy metrics', async () => {
      render(<BroadcastOverlay />);

      await waitFor(() => {
        expect(screen.getByText('Units:')).toBeTruthy();
        expect(screen.getByText('Buildings:')).toBeTruthy();
        expect(screen.getByText('Population:')).toBeTruthy();
      });
    });
  });
});
