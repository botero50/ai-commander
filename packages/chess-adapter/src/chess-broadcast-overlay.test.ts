/**
 * Chess Broadcast Overlay Tests - Story C4.2
 *
 * Tests for professional broadcast UI rendering:
 * - Player stat display
 * - Game clock management
 * - Board evaluation visualization
 * - Stream metrics
 * - Event tracking
 * - HTML and JSON rendering
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChessBroadcastOverlay } from './chess-broadcast-overlay.js';

describe('ChessBroadcastOverlay - Story C4.2', () => {
  let overlay: ChessBroadcastOverlay;

  beforeEach(() => {
    overlay = new ChessBroadcastOverlay();
  });

  describe('Initialization', () => {
    it('should create overlay with default config', () => {
      const config = overlay.getConfig();
      expect(config.theme).toBe('dark');
      expect(config.showRatings).toBe(true);
      expect(config.showEvaluation).toBe(true);
      expect(config.opacityPercent).toBe(85);
    });

    it('should accept custom configuration', () => {
      const customOverlay = new ChessBroadcastOverlay({
        theme: 'light',
        opacityPercent: 75,
        position: 'top-right',
      });

      const config = customOverlay.getConfig();
      expect(config.theme).toBe('light');
      expect(config.opacityPercent).toBe(75);
      expect(config.position).toBe('top-right');
    });

    it('should apply configuration defaults', () => {
      const config = overlay.getConfig();
      expect(config.fontSize).toBe('medium');
      expect(config.showClocks).toBe(true);
      expect(config.showStreamStats).toBe(true);
    });
  });

  describe('Player Statistics', () => {
    it('should update white player stats', () => {
      const stats = {
        name: 'Stockfish',
        rating: 3200,
        material: 50,
        moveCount: 10,
        avgMoveTime: 1500,
        capturedPieces: ['p', 'n'],
        isMoving: false,
        clock: 300000,
        accuracy: 98.5,
      };

      overlay.updatePlayerStats('white', stats);
      const cards = overlay.getPlayerCards();
      expect(cards.white?.name).toBe('Stockfish');
      expect(cards.white?.rating).toBe(3200);
    });

    it('should update black player stats', () => {
      const stats = {
        name: 'AlphaZero',
        rating: 3300,
        material: -100,
        moveCount: 9,
        avgMoveTime: 2000,
        capturedPieces: ['p', 'p', 'b'],
        isMoving: true,
        clock: 250000,
        accuracy: 99.2,
      };

      overlay.updatePlayerStats('black', stats);
      const cards = overlay.getPlayerCards();
      expect(cards.black?.name).toBe('AlphaZero');
      expect(cards.black?.rating).toBe(3300);
    });

    it('should maintain both player stats', () => {
      overlay.updatePlayerStats('white', {
        name: 'White',
        rating: 2500,
        material: 0,
        moveCount: 5,
        avgMoveTime: 1000,
        capturedPieces: [],
        isMoving: true,
        clock: 600000,
        accuracy: 95,
      });

      overlay.updatePlayerStats('black', {
        name: 'Black',
        rating: 2400,
        material: 0,
        moveCount: 5,
        avgMoveTime: 1000,
        capturedPieces: [],
        isMoving: false,
        clock: 600000,
        accuracy: 94,
      });

      const cards = overlay.getPlayerCards();
      expect(cards.white?.name).toBe('White');
      expect(cards.black?.name).toBe('Black');
    });
  });

  describe('Game Clock', () => {
    it('should update game clock', () => {
      overlay.updateGameClock({
        white: 300000,
        black: 300000,
        totalTime: 600000,
        increment: 5000,
      });

      const clock = overlay.getClockDisplay();
      expect(clock?.white).toBe('5:00');
      expect(clock?.black).toBe('5:00');
    });

    it('should format clock time correctly', () => {
      overlay.updateGameClock({
        white: 125000, // 2:05
        black: 45000, // 0:45
        totalTime: 600000,
        increment: 0,
      });

      const clock = overlay.getClockDisplay();
      expect(clock?.white).toBe('2:05');
      expect(clock?.black).toBe('0:45');
    });

    it('should handle zero time', () => {
      overlay.updateGameClock({
        white: 0,
        black: 0,
        totalTime: 600000,
        increment: 0,
      });

      const clock = overlay.getClockDisplay();
      expect(clock?.white).toBe('0:00');
      expect(clock?.black).toBe('0:00');
    });

    it('should return null when no clock set', () => {
      const clock = overlay.getClockDisplay();
      expect(clock).toBeNull();
    });
  });

  describe('Board Evaluation', () => {
    it('should update evaluation', () => {
      overlay.updateEvaluation(150); // 1.5 pawns for white
      const eval_bar = overlay.getEvaluationBar();
      expect(eval_bar?.centipawns).toBe(150);
    });

    it('should format evaluation display', () => {
      overlay.updateEvaluation(150);
      const eval_bar = overlay.getEvaluationBar();
      expect(eval_bar?.display).toBe('+1.5');
    });

    it('should format negative evaluation', () => {
      overlay.updateEvaluation(-250);
      const eval_bar = overlay.getEvaluationBar();
      expect(eval_bar?.display).toBe('-2.5');
    });

    it('should display winning advantage', () => {
      overlay.updateEvaluation(1000);
      const eval_bar = overlay.getEvaluationBar();
      expect(eval_bar?.display).toContain('#');
    });

    it('should clamp extreme evaluations', () => {
      overlay.updateEvaluation(10000); // Huge advantage
      const eval_bar = overlay.getEvaluationBar();
      expect(eval_bar?.percentage).toBe(100); // Clamped to 500cp = 100%
    });

    it('should show equal position for eval near zero', () => {
      overlay.updateEvaluation(20);
      const eval_bar = overlay.getEvaluationBar();
      expect(eval_bar?.display).toBe('=');
    });

    it('should return null when evaluation display disabled', () => {
      overlay.updateConfig({ showEvaluation: false });
      overlay.updateEvaluation(150);
      const eval_bar = overlay.getEvaluationBar();
      expect(eval_bar).toBeNull();
    });
  });

  describe('Broadcast Events', () => {
    it('should add event', () => {
      overlay.addEvent({
        type: 'move',
        timestamp: Date.now(),
        description: 'e2-e4',
        severity: 'info',
        duration: 5000,
      });

      const events = overlay.getRecentEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('move');
    });

    it('should add multiple events', () => {
      overlay.addEvent({
        type: 'move',
        timestamp: Date.now(),
        description: 'e2-e4',
        severity: 'info',
        duration: 5000,
      });

      overlay.addEvent({
        type: 'capture',
        timestamp: Date.now(),
        description: 'exd5',
        severity: 'highlight',
        duration: 3000,
      });

      const events = overlay.getRecentEvents();
      expect(events).toHaveLength(2);
    });

    it('should keep only recent 10 events', () => {
      for (let i = 0; i < 15; i++) {
        overlay.addEvent({
          type: 'move',
          timestamp: Date.now(),
          description: `move ${i}`,
          severity: 'info',
          duration: 5000,
        });
      }

      const events = overlay.getRecentEvents();
      expect(events).toHaveLength(10);
    });

    it('should track checkmate events', () => {
      overlay.addEvent({
        type: 'checkmate',
        timestamp: Date.now(),
        description: 'White checkmates Black',
        severity: 'critical',
        duration: 10000,
      });

      const events = overlay.getRecentEvents();
      expect(events[0].type).toBe('checkmate');
      expect(events[0].severity).toBe('critical');
    });
  });

  describe('Stream Metrics', () => {
    it('should update stream metrics', () => {
      overlay.updateStreamMetrics({
        fps: 60,
        latency: 100,
        bandwidth: 5000,
        bitrate: 4500,
        quality: 'hd',
        spectatorCount: 250,
        uptime: 3600,
        dropouts: 0,
      });

      const metrics = overlay.getStreamMetricsDisplay();
      expect(metrics?.fps).toBe('60.0');
      expect(metrics?.quality).toBe('HD');
      expect(metrics?.spectators).toBe(250);
    });

    it('should evaluate stream health', () => {
      // Excellent
      overlay.updateStreamMetrics({
        fps: 60,
        latency: 50,
        bandwidth: 5000,
        bitrate: 4500,
        quality: '4k',
        spectatorCount: 1000,
        uptime: 7200,
        dropouts: 0,
      });

      let metrics = overlay.getStreamMetricsDisplay();
      expect(metrics?.health).toBe('excellent');

      // Good
      overlay.updateStreamMetrics({
        fps: 59,
        latency: 150,
        bandwidth: 4000,
        bitrate: 3500,
        quality: 'hd',
        spectatorCount: 500,
        uptime: 3600,
        dropouts: 1,
      });

      metrics = overlay.getStreamMetricsDisplay();
      expect(metrics?.health).toBe('good');

      // Fair
      overlay.updateStreamMetrics({
        fps: 55,
        latency: 300,
        bandwidth: 2500,
        bitrate: 2000,
        quality: 'sd',
        spectatorCount: 100,
        uptime: 1800,
        dropouts: 3,
      });

      metrics = overlay.getStreamMetricsDisplay();
      expect(metrics?.health).toBe('fair');

      // Poor
      overlay.updateStreamMetrics({
        fps: 30,
        latency: 800,
        bandwidth: 1000,
        bitrate: 500,
        quality: 'sd',
        spectatorCount: 10,
        uptime: 600,
        dropouts: 10,
      });

      metrics = overlay.getStreamMetricsDisplay();
      expect(metrics?.health).toBe('poor');
    });

    it('should format uptime correctly', () => {
      overlay.updateStreamMetrics({
        fps: 60,
        latency: 100,
        bandwidth: 5000,
        bitrate: 4500,
        quality: 'hd',
        spectatorCount: 100,
        uptime: 45,
        dropouts: 0,
      });

      let metrics = overlay.getStreamMetricsDisplay();
      expect(metrics?.uptime).toContain('s');

      overlay.updateStreamMetrics({
        fps: 60,
        latency: 100,
        bandwidth: 5000,
        bitrate: 4500,
        quality: 'hd',
        spectatorCount: 100,
        uptime: 3600,
        dropouts: 0,
      });

      metrics = overlay.getStreamMetricsDisplay();
      expect(metrics?.uptime).toContain('m');

      overlay.updateStreamMetrics({
        fps: 60,
        latency: 100,
        bandwidth: 5000,
        bitrate: 4500,
        quality: 'hd',
        spectatorCount: 100,
        uptime: 7200,
        dropouts: 0,
      });

      metrics = overlay.getStreamMetricsDisplay();
      expect(metrics?.uptime).toContain('h');
    });

    it('should return null when metrics display disabled', () => {
      overlay.updateConfig({ showStreamStats: false });
      overlay.updateStreamMetrics({
        fps: 60,
        latency: 100,
        bandwidth: 5000,
        bitrate: 4500,
        quality: 'hd',
        spectatorCount: 100,
        uptime: 3600,
        dropouts: 0,
      });

      const metrics = overlay.getStreamMetricsDisplay();
      expect(metrics).toBeNull();
    });
  });

  describe('Configuration Updates', () => {
    it('should update theme', () => {
      overlay.updateConfig({ theme: 'light' });
      expect(overlay.getConfig().theme).toBe('light');
    });

    it('should update multiple settings', () => {
      overlay.updateConfig({
        theme: 'light',
        opacityPercent: 50,
        position: 'top-right',
      });

      const config = overlay.getConfig();
      expect(config.theme).toBe('light');
      expect(config.opacityPercent).toBe(50);
      expect(config.position).toBe('top-right');
    });

    it('should toggle rating display', () => {
      overlay.updateConfig({ showRatings: false });
      expect(overlay.getConfig().showRatings).toBe(false);

      overlay.updateConfig({ showRatings: true });
      expect(overlay.getConfig().showRatings).toBe(true);
    });
  });

  describe('Rendering', () => {
    it('should render empty overlay', () => {
      const html = overlay.renderHTML();
      expect(html).toContain('chess-overlay');
      expect(html).toContain('dark');
    });

    it('should render with player cards', () => {
      overlay.updatePlayerStats('white', {
        name: 'Alpha',
        rating: 2500,
        material: 100,
        moveCount: 10,
        avgMoveTime: 1000,
        capturedPieces: [],
        isMoving: false,
        clock: 300000,
        accuracy: 95,
      });

      const html = overlay.renderHTML();
      expect(html).toContain('Alpha');
      expect(html).toContain('2500');
    });

    it('should render with clock', () => {
      overlay.updateGameClock({
        white: 300000,
        black: 300000,
        totalTime: 600000,
        increment: 0,
      });

      const html = overlay.renderHTML();
      expect(html).toContain('5:00');
    });

    it('should render evaluation bar', () => {
      overlay.updateEvaluation(150);
      const html = overlay.renderHTML();
      expect(html).toContain('evaluation-bar');
    });

    it('should render events', () => {
      overlay.addEvent({
        type: 'move',
        timestamp: Date.now(),
        description: 'e2-e4',
        severity: 'info',
        duration: 5000,
      });

      const html = overlay.renderHTML();
      expect(html).toContain('e2-e4');
    });

    it('should render JSON data', () => {
      overlay.updatePlayerStats('white', {
        name: 'Stockfish',
        rating: 3200,
        material: 50,
        moveCount: 10,
        avgMoveTime: 1500,
        capturedPieces: ['p'],
        isMoving: false,
        clock: 300000,
        accuracy: 98.5,
      });

      const json = overlay.renderJSON();
      expect(json.players.white?.name).toBe('Stockfish');
      expect(json.config.theme).toBe('dark');
      expect(json.matchDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Clearing', () => {
    it('should clear all display data', () => {
      overlay.updateEvaluation(150);
      overlay.addEvent({
        type: 'move',
        timestamp: Date.now(),
        description: 'test',
        severity: 'info',
        duration: 5000,
      });

      overlay.clear();

      const events = overlay.getRecentEvents();
      const eval_bar = overlay.getEvaluationBar();

      expect(events).toHaveLength(0);
      expect(eval_bar?.centipawns).toBe(0);
    });
  });

  describe('Theme Rendering', () => {
    it('should render with light theme', () => {
      overlay.updateConfig({ theme: 'light' });
      const html = overlay.renderHTML();
      expect(html).toContain('light');
    });

    it('should apply position class', () => {
      overlay.updateConfig({ position: 'top-right' });
      const html = overlay.renderHTML();
      expect(html).toContain('top-right');
    });

    it('should apply opacity style', () => {
      overlay.updateConfig({ opacityPercent: 60 });
      const html = overlay.renderHTML();
      expect(html).toContain('opacity');
    });
  });

  describe('Edge Cases', () => {
    it('should handle large material values', () => {
      overlay.updatePlayerStats('white', {
        name: 'Player',
        rating: 2000,
        material: 5000,
        moveCount: 50,
        avgMoveTime: 5000,
        capturedPieces: ['p', 'p', 'n', 'b', 'r', 'r'],
        isMoving: false,
        clock: 1,
        accuracy: 100,
      });

      const html = overlay.renderHTML();
      expect(html).toContain('50');
    });

    it('should handle extreme evaluation', () => {
      overlay.updateEvaluation(-10000);
      const eval_bar = overlay.getEvaluationBar();
      expect(eval_bar?.percentage).toBe(0);
    });

    it('should handle many events', () => {
      for (let i = 0; i < 20; i++) {
        overlay.addEvent({
          type: i % 2 === 0 ? 'move' : 'capture',
          timestamp: Date.now(),
          description: `event-${i}`,
          severity: 'info',
          duration: 5000,
        });
      }

      const events = overlay.getRecentEvents();
      expect(events).toHaveLength(10);
    });
  });
});
