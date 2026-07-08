import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReplayStorage, type ReplayMetadata } from './replay-storage.js';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ReplayStorage', () => {
  let testDir: string;
  let storage: ReplayStorage;

  beforeEach(async () => {
    testDir = join(tmpdir(), `replay-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    storage = new ReplayStorage(testDir);
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should save a replay', async () => {
    const metadata: ReplayMetadata = {
      matchId: 'match-001',
      timestamp: Date.now(),
      brain1Name: 'Ollama-1',
      brain2Name: 'Ollama-2',
      winner: 'Ollama-1',
      duration: 5000,
      ticksRan: 100,
      player1Commands: 50,
      player1Errors: 2,
      player2Commands: 48,
      player2Errors: 3,
    };

    const decisions = [
      {
        tick: 0,
        timestamp: Date.now(),
        player: 'player1' as const,
        brainName: 'Ollama-1',
        reasoning: 'Expanding territory',
        commands: ['move-unit', 'train-soldier'],
        duration: 250,
      },
    ];

    const snapshots = [
      {
        tick: 0,
        timestamp: Date.now(),
        unitCount: 10,
        buildingCount: 5,
        playerCount: 2,
        resourcesPerPlayer: [{ wood: 100, stone: 50 }, { wood: 100, stone: 50 }],
      },
    ];

    const filepath = await storage.saveReplay(metadata, decisions, snapshots);
    expect(filepath).toContain('match-001.json');
  });

  it('should load a saved replay', async () => {
    const metadata: ReplayMetadata = {
      matchId: 'match-002',
      timestamp: Date.now(),
      brain1Name: 'Ollama-1',
      brain2Name: 'Ollama-2',
      winner: undefined,
      duration: 3000,
      ticksRan: 60,
      player1Commands: 30,
      player1Errors: 1,
      player2Commands: 32,
      player2Errors: 2,
    };

    const decisions = [];
    const snapshots = [];

    await storage.saveReplay(metadata, decisions, snapshots);
    const loaded = await storage.loadReplay('match-002');

    expect(loaded).not.toBeNull();
    expect(loaded?.metadata.matchId).toBe('match-002');
    expect(loaded?.metadata.brain1Name).toBe('Ollama-1');
  });

  it('should return null for non-existent replay', async () => {
    const loaded = await storage.loadReplay('nonexistent-match');
    expect(loaded).toBeNull();
  });

  it('should list all replays sorted by timestamp descending', async () => {
    const baseTime = Date.now();

    const metadata1: ReplayMetadata = {
      matchId: 'match-a',
      timestamp: baseTime + 1000,
      brain1Name: 'Brain1',
      brain2Name: 'Brain2',
      duration: 5000,
      ticksRan: 100,
      player1Commands: 50,
      player1Errors: 0,
      player2Commands: 48,
      player2Errors: 0,
    };

    const metadata2: ReplayMetadata = {
      matchId: 'match-b',
      timestamp: baseTime + 3000,
      brain1Name: 'Brain1',
      brain2Name: 'Brain2',
      duration: 6000,
      ticksRan: 120,
      player1Commands: 55,
      player1Errors: 1,
      player2Commands: 52,
      player2Errors: 1,
    };

    await storage.saveReplay(metadata1, [], []);
    await storage.saveReplay(metadata2, [], []);

    const replays = await storage.listReplays();

    expect(replays).toHaveLength(2);
    expect(replays[0].matchId).toBe('match-b'); // Newest first
    expect(replays[1].matchId).toBe('match-a');
  });

  it('should handle empty replay directory', async () => {
    const replays = await storage.listReplays();
    expect(replays).toEqual([]);
  });

  it('should get replay metadata without full load', async () => {
    const metadata: ReplayMetadata = {
      matchId: 'match-003',
      timestamp: Date.now(),
      brain1Name: 'Brain1',
      brain2Name: 'Brain2',
      winner: 'Brain1',
      duration: 5000,
      ticksRan: 100,
      player1Commands: 50,
      player1Errors: 0,
      player2Commands: 48,
      player2Errors: 0,
    };

    await storage.saveReplay(metadata, [], []);
    const loaded = await storage.getReplayMetadata('match-003');

    expect(loaded).not.toBeNull();
    expect(loaded?.matchId).toBe('match-003');
  });

  it('should get replay file size', async () => {
    const metadata: ReplayMetadata = {
      matchId: 'match-004',
      timestamp: Date.now(),
      brain1Name: 'Brain1',
      brain2Name: 'Brain2',
      duration: 5000,
      ticksRan: 100,
      player1Commands: 50,
      player1Errors: 0,
      player2Commands: 48,
      player2Errors: 0,
    };

    await storage.saveReplay(metadata, [], []);
    const size = await storage.getReplaySize('match-004');

    expect(size).toBeGreaterThan(0);
  });
});
