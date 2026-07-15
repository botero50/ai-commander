import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MatchLoader } from './match-loader.js';
import { MatchArchive } from './match-archive.js';
import { Logger } from '../config/logger.js';
import * as fs from 'fs';

describe('MatchLoader', () => {
  let loader: MatchLoader;
  let archive: MatchArchive;
  const testDir = './test-matches-loader';
  const logger = new Logger('error');

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    archive = new MatchArchive(testDir, logger);
    loader = new MatchLoader(testDir, logger);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  const createMatchData = (overrides: any = {}) => ({
    duration: { totalMs: 10000, totalSeconds: 10, ticks: 300 },
    players: [
      {
        id: 1,
        civilization: 'Athenians',
        brain: 'Ollama',
        startingUnits: 10,
        endingUnits: 23,
        totalCommands: 534,
      },
      {
        id: 2,
        civilization: 'Spartans',
        brain: 'Petra',
        startingUnits: 9,
        endingUnits: 22,
        totalCommands: 0,
      },
    ],
    winner: { playerId: 1, reason: 'tick_limit' },
    map: 'acropolis_bay_2p',
    gameVersion: '0.26.13',
    statistics: {
      player1: {
        units: { start: 10, end: 23, growth: 13 },
        commands: 534,
        commandsPerTick: 1.78,
      },
      player2: {
        units: { start: 9, end: 22, growth: 13 },
        commands: 0,
        commandsPerTick: 0,
      },
      totalCommands: 534,
      commandThroughput: 53.4,
      activeTicks: 267,
      idleTicks: 33,
      idlePercentage: 11,
    },
    tickHistory: [
      { tick: 0, player1Units: 10, player2Units: 9 },
      { tick: 1, player1Units: 10, player2Units: 9 },
      { tick: 2, player1Units: 11, player2Units: 9 },
    ],
    ...overrides,
  });

  describe('loadMatch', () => {
    it('should load a complete match by ID', () => {
      const matchData = createMatchData();
      const matchId = archive.archive(matchData);

      const loaded = loader.loadMatch(matchId);

      expect(loaded).toBeDefined();
      expect(loaded?.archive.matchId).toBe(matchId);
      expect(loaded?.archive.players.length).toBe(2);
      expect(loaded?.metadata).toBeDefined();
    });

    it('should return null for non-existent match', () => {
      const loaded = loader.loadMatch('nonexistent-id');
      expect(loaded).toBeNull();
    });

    it('should load all associated files', () => {
      const matchData = createMatchData();
      const matchId = archive.archive(matchData);

      const loaded = loader.loadMatch(matchId);

      expect(loaded?.archive).toBeDefined();
      expect(loaded?.metadata).toBeDefined();
      expect(loaded?.telemetry).toBeDefined();
      expect(loaded?.config).toBeDefined();
      expect(loaded?.stats).toBeDefined();
    });

    it('should preserve full tick history', () => {
      const tickHistory = [
        { tick: 0, player1Units: 10, player2Units: 9, commands: 2 },
        { tick: 1, player1Units: 10, player2Units: 9, commands: 1 },
      ];

      const matchData = createMatchData({ tickHistory });
      const matchId = archive.archive(matchData);

      const loaded = loader.loadMatch(matchId);

      expect(loaded?.archive.tickHistory).toEqual(tickHistory);
    });
  });

  describe('loadReplay', () => {
    it('should load just the replay data (tickHistory)', () => {
      const tickHistory = [
        { tick: 0, player1Units: 10, player2Units: 9 },
        { tick: 1, player1Units: 11, player2Units: 9 },
        { tick: 2, player1Units: 11, player2Units: 10 },
      ];

      const matchData = createMatchData({ tickHistory });
      const matchId = archive.archive(matchData);

      const replay = loader.loadReplay(matchId);

      expect(replay).toEqual(tickHistory);
      expect(replay?.length).toBe(3);
    });

    it('should return null for non-existent match', () => {
      const replay = loader.loadReplay('nonexistent-id');
      expect(replay).toBeNull();
    });
  });

  describe('getTick', () => {
    it('should get a specific tick by index', () => {
      const tickHistory = [
        { tick: 0, player1Units: 10, player2Units: 9 },
        { tick: 1, player1Units: 11, player2Units: 9 },
        { tick: 2, player1Units: 11, player2Units: 10 },
      ];

      const matchData = createMatchData({ tickHistory });
      const matchId = archive.archive(matchData);

      const tick = loader.getTick(matchId, 1);

      expect(tick).toEqual({ tick: 1, player1Units: 11, player2Units: 9 });
    });

    it('should return null for out-of-range index', () => {
      const matchData = createMatchData();
      const matchId = archive.archive(matchData);

      expect(loader.getTick(matchId, -1)).toBeNull();
      expect(loader.getTick(matchId, 9999)).toBeNull();
    });
  });

  describe('getTickRange', () => {
    it('should get ticks in a range', () => {
      const tickHistory = [
        { tick: 0, player1Units: 10 },
        { tick: 1, player1Units: 11 },
        { tick: 2, player1Units: 12 },
        { tick: 3, player1Units: 13 },
      ];

      const matchData = createMatchData({ tickHistory });
      const matchId = archive.archive(matchData);

      const range = loader.getTickRange(matchId, 1, 2);

      expect(range).toHaveLength(2);
      expect(range?.[0].tick).toBe(1);
      expect(range?.[1].tick).toBe(2);
    });

    it('should handle range boundaries', () => {
      const tickHistory = Array.from({ length: 10 }, (_, i) => ({ tick: i, units: i }));

      const matchData = createMatchData({ tickHistory });
      const matchId = archive.archive(matchData);

      const range = loader.getTickRange(matchId, -5, 15);
      expect(range).toHaveLength(10);
    });
  });

  describe('searchMatches', () => {
    beforeEach(() => {
      // Create multiple matches with different properties
      archive.archive(createMatchData({ map: 'acropolis_bay_2p', duration: { totalMs: 10000, totalSeconds: 10, ticks: 300 } }));
      archive.archive(
        createMatchData({
          map: 'alpine_mountains_3p',
          players: [
            { id: 1, civilization: 'Persians', brain: 'Ollama', startingUnits: 10, endingUnits: 25, totalCommands: 500 },
            { id: 2, civilization: 'Britons', brain: 'Petra', startingUnits: 9, endingUnits: 20, totalCommands: 0 },
          ],
          duration: { totalMs: 15000, totalSeconds: 15, ticks: 450 },
        })
      );
      archive.archive(
        createMatchData({
          map: 'acropolis_bay_2p',
          duration: { totalMs: 5000, totalSeconds: 5, ticks: 150 },
        })
      );
    });

    it('should find all matches', () => {
      const results = loader.searchMatches();
      expect(results.length).toBe(3);
    });

    it('should filter by map', () => {
      const results = loader.searchMatches({ map: 'acropolis_bay_2p' });
      expect(results.length).toBe(2);
      expect(results.every(m => m.map === 'acropolis_bay_2p')).toBe(true);
    });

    it('should filter by civilization', () => {
      const results = loader.searchMatches({ civilization: 'Persians' });
      expect(results.length).toBe(1);
    });

    it('should filter by tick count', () => {
      const results = loader.searchMatches({ minTicks: 200, maxTicks: 400 });
      expect(results.length).toBe(1);
      expect(results[0].ticks).toBe(300);
    });

    it('should apply limit', () => {
      const results = loader.searchMatches({ limit: 2 });
      expect(results.length).toBe(2);
    });

    it('should return matches with all fields', () => {
      const results = loader.searchMatches({ limit: 1 });
      expect(results[0].matchId).toBeDefined();
      expect(results[0].timestamp).toBeDefined();
      expect(results[0].ticks).toBeGreaterThan(0);
    });
  });

  describe('getMatchStatistics', () => {
    beforeEach(() => {
      archive.archive(createMatchData({ map: 'acropolis_bay_2p', duration: { totalMs: 10000, totalSeconds: 10, ticks: 300 } }));
      archive.archive(createMatchData({ map: 'alpine_mountains_3p', duration: { totalMs: 15000, totalSeconds: 15, ticks: 450 } }));
    });

    it('should calculate aggregate statistics', () => {
      const stats = loader.getMatchStatistics();

      expect(stats.totalMatches).toBe(2);
      expect(stats.totalTicks).toBe(750);
      expect(stats.averageTicksPerMatch).toBe(375);
      expect(stats.averageCommandsPerMatch).toBeGreaterThan(0);
    });

    it('should break down by map', () => {
      const stats = loader.getMatchStatistics();

      expect(stats.mapBreakdown['acropolis_bay_2p']).toBe(1);
      expect(stats.mapBreakdown['alpine_mountains_3p']).toBe(1);
    });

    it('should calculate win rates', () => {
      const stats = loader.getMatchStatistics();

      expect(stats.winRates['Player 1']).toBeGreaterThan(0);
    });
  });

  describe('getRecentMatches', () => {
    it('should return the most recent matches', () => {
      archive.archive(createMatchData());
      archive.archive(createMatchData());
      archive.archive(createMatchData());

      const recent = loader.getRecentMatches(2);

      expect(recent.length).toBe(2);
      expect(recent[0].matchId).toBeDefined();
    });
  });

  describe('getMatchesByCivilization', () => {
    beforeEach(() => {
      archive.archive(createMatchData());
      archive.archive(
        createMatchData({
          players: [
            { id: 1, civilization: 'Persians', brain: 'Ollama', startingUnits: 10, endingUnits: 25, totalCommands: 500 },
            { id: 2, civilization: 'Romans', brain: 'Petra', startingUnits: 9, endingUnits: 20, totalCommands: 0 },
          ],
        })
      );
    });

    it('should find matches by civilization', () => {
      const matches = loader.getMatchesByCivilization('Athenians');
      expect(matches.length).toBe(1);
    });

    it('should return empty for non-existent civilization', () => {
      const matches = loader.getMatchesByCivilization('NonExistent');
      expect(matches.length).toBe(0);
    });
  });

  describe('getMatchesByMap', () => {
    beforeEach(() => {
      archive.archive(createMatchData({ map: 'acropolis_bay_2p' }));
      archive.archive(createMatchData({ map: 'alpine_mountains_3p' }));
    });

    it('should find matches by map', () => {
      const matches = loader.getMatchesByMap('acropolis_bay_2p');
      expect(matches.length).toBe(1);
      expect(matches[0].map).toBe('acropolis_bay_2p');
    });
  });

  describe('exportMatch', () => {
    it('should export match as JSON string', () => {
      const matchData = createMatchData();
      const matchId = archive.archive(matchData);

      const exported = loader.exportMatch(matchId);

      expect(exported).toBeDefined();
      expect(typeof exported).toBe('string');

      const parsed = JSON.parse(exported!);
      expect(parsed.archive).toBeDefined();
      expect(parsed.metadata).toBeDefined();
    });

    it('should return null for non-existent match', () => {
      const exported = loader.exportMatch('nonexistent-id');
      expect(exported).toBeNull();
    });
  });

  describe('getMatchDuration', () => {
    it('should return match duration in multiple formats', () => {
      const matchData = createMatchData({ duration: { totalMs: 415400, totalSeconds: 415.4, ticks: 300 } });
      const matchId = archive.archive(matchData);

      const duration = loader.getMatchDuration(matchId);

      expect(duration?.realTimeMs).toBe(415400);
      expect(duration?.realTimeSeconds).toBe(415.4);
      expect(duration?.ticks).toBe(300);
    });

    it('should return null for non-existent match', () => {
      const duration = loader.getMatchDuration('nonexistent-id');
      expect(duration).toBeNull();
    });
  });

  describe('getMatchWinner', () => {
    it('should return winner information', () => {
      const matchData = createMatchData({ winner: { playerId: 2, reason: 'elimination' } });
      const matchId = archive.archive(matchData);

      const winner = loader.getMatchWinner(matchId);

      expect(winner?.playerId).toBe(2);
      expect(winner?.reason).toBe('elimination');
    });

    it('should return null for non-existent match', () => {
      const winner = loader.getMatchWinner('nonexistent-id');
      expect(winner).toBeNull();
    });
  });

  describe('Replay playback scenario', () => {
    it('should support seeking through a match replay', () => {
      const tickHistory = Array.from({ length: 100 }, (_, i) => ({
        tick: i,
        player1Units: 10 + i,
        player2Units: 9 + Math.floor(i * 0.8),
        commands: i % 3,
      }));

      const matchData = createMatchData({ tickHistory });
      const matchId = archive.archive(matchData);

      // Get full replay
      const replay = loader.loadReplay(matchId);
      expect(replay?.length).toBe(100);

      // Seek to tick 50
      const tick50 = loader.getTick(matchId, 50);
      expect(tick50.tick).toBe(50);
      expect(tick50.player1Units).toBe(60);

      // Get highlight range (ticks 20-40)
      const highlight = loader.getTickRange(matchId, 20, 40);
      expect(highlight?.length).toBe(21);
      expect(highlight?.[0].tick).toBe(20);
      expect(highlight?.[20].tick).toBe(40);
    });
  });
});
