import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MatchArchive, type MatchArchiveData } from './match-archive.js';
import { Logger } from '../config/logger.js';
import * as fs from 'fs';
import * as path from 'path';

describe('MatchArchive', () => {
  let archive: MatchArchive;
  const testDir = './test-matches';
  const logger = new Logger('error'); // Suppress logs during tests

  beforeEach(() => {
    // Clean up test directory before each test
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    archive = new MatchArchive(testDir, logger);
  });

  afterEach(() => {
    // Clean up test directory after each test
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it('should create archive directory on initialization', () => {
    expect(fs.existsSync(testDir)).toBe(true);
  });

  it('should archive a match with all files', () => {
    const matchData: Omit<MatchArchiveData, 'matchId' | 'timestamp'> = {
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
        {
          tick: 0,
          player1Units: 10,
          player2Units: 9,
          player1Commands: 2,
          player2Commands: 0,
        },
      ],
    };

    const matchId = archive.archive(matchData);

    // Verify match ID format
    expect(matchId).toMatch(/^\d{4}-\d{2}-\d{2}-[A-Z0-9]{6}$/);

    // Verify directory structure
    const dateDir = matchId.substring(0, 10); // YYYY-MM-DD
    const matchDir = path.join(testDir, dateDir, `match-${matchId}`);
    expect(fs.existsSync(matchDir)).toBe(true);

    // Verify all files exist
    expect(fs.existsSync(path.join(matchDir, 'match.json'))).toBe(true);
    expect(fs.existsSync(path.join(matchDir, 'telemetry.json'))).toBe(true);
    expect(fs.existsSync(path.join(matchDir, 'config.json'))).toBe(true);
    expect(fs.existsSync(path.join(matchDir, 'stats.json'))).toBe(true);
    expect(fs.existsSync(path.join(matchDir, 'metadata.json'))).toBe(true);
  });

  it('should load a previously archived match', () => {
    const matchData: Omit<MatchArchiveData, 'matchId' | 'timestamp'> = {
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
        {
          tick: 0,
          player1Units: 10,
          player2Units: 9,
          player1Commands: 2,
          player2Commands: 0,
        },
      ],
    };

    const matchId = archive.archive(matchData);
    const loaded = archive.loadMatch(matchId);

    expect(loaded).toBeDefined();
    expect(loaded?.matchId).toBe(matchId);
    expect(loaded?.players[0].civilization).toBe('Athenians');
    expect(loaded?.statistics.totalCommands).toBe(534);
  });

  it('should list all archived matches', () => {
    const matchData: Omit<MatchArchiveData, 'matchId' | 'timestamp'> = {
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
      tickHistory: [],
    };

    // Archive 3 matches
    const ids = [
      archive.archive(matchData),
      archive.archive(matchData),
      archive.archive(matchData),
    ];

    const matches = archive.listMatches();

    expect(matches.length).toBe(3);
    expect(matches[0].matchId).toBeDefined();
    expect(matches[0].map).toBe('acropolis_bay_2p');
  });

  it('should return stats across all matches', () => {
    const matchData: Omit<MatchArchiveData, 'matchId' | 'timestamp'> = {
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
      tickHistory: [],
    };

    archive.archive(matchData);
    archive.archive(matchData);

    const stats = archive.getStats();

    expect(stats.totalMatches).toBe(2);
    expect(stats.totalTicks).toBe(600);
    expect(stats.averageMatchDuration).toBe(300);
  });

  it('should delete a match', () => {
    const matchData: Omit<MatchArchiveData, 'matchId' | 'timestamp'> = {
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
      tickHistory: [],
    };

    const matchId = archive.archive(matchData);
    expect(archive.loadMatch(matchId)).toBeDefined();

    const deleted = archive.deleteMatch(matchId);
    expect(deleted).toBe(true);
    expect(archive.loadMatch(matchId)).toBeNull();
  });

  it('should handle non-existent match gracefully', () => {
    const loaded = archive.loadMatch('nonexistent-id');
    expect(loaded).toBeNull();
  });

  it('should store replay in tickHistory', () => {
    const tickHistory = [
      {
        tick: 0,
        player1Units: 10,
        player2Units: 9,
        player1Commands: 2,
        player2Commands: 0,
      },
      {
        tick: 1,
        player1Units: 10,
        player2Units: 9,
        player1Commands: 1,
        player2Commands: 0,
      },
    ];

    const matchData: Omit<MatchArchiveData, 'matchId' | 'timestamp'> = {
      duration: { totalMs: 2000, totalSeconds: 2, ticks: 2 },
      players: [
        {
          id: 1,
          civilization: 'Athenians',
          brain: 'Ollama',
          startingUnits: 10,
          endingUnits: 10,
          totalCommands: 3,
        },
        {
          id: 2,
          civilization: 'Spartans',
          brain: 'Petra',
          startingUnits: 9,
          endingUnits: 9,
          totalCommands: 0,
        },
      ],
      winner: null,
      map: 'acropolis_bay_2p',
      gameVersion: '0.26.13',
      statistics: {
        player1: {
          units: { start: 10, end: 10, growth: 0 },
          commands: 3,
          commandsPerTick: 1.5,
        },
        player2: {
          units: { start: 9, end: 9, growth: 0 },
          commands: 0,
          commandsPerTick: 0,
        },
        totalCommands: 3,
        commandThroughput: 1.5,
        activeTicks: 2,
        idleTicks: 0,
        idlePercentage: 0,
      },
      tickHistory,
    };

    const matchId = archive.archive(matchData);
    const loaded = archive.loadMatch(matchId);

    expect(loaded?.tickHistory).toEqual(tickHistory);
    expect(loaded?.tickHistory.length).toBe(2);
  });
});
