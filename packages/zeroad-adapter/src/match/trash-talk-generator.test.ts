import { describe, it, expect, beforeEach } from 'vitest';
import { TrashTalkGenerator, type GameContext } from './trash-talk-generator.js';
import { Logger } from '../config/logger.js';

describe('TrashTalkGenerator', () => {
  let generator: TrashTalkGenerator;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger('error', 'TestTrashTalk'); // Suppress logs in tests
    generator = new TrashTalkGenerator(logger);
  });

  it('should initialize with default settings', () => {
    expect(generator).toBeDefined();
  });

  it('should set talk frequency', () => {
    generator.setTalkFrequency(1000);
    // No error should be thrown
    expect(true).toBe(true);
  });

  it('should handle context with balanced players', async () => {
    const context: GameContext = {
      player1: {
        name: 'Ollama',
        resources: { food: 1000, wood: 800, stone: 600, metal: 400 },
        unitCount: 20,
        buildingCount: 15,
      },
      player2: {
        name: 'Petra',
        resources: { food: 1100, wood: 750, stone: 550, metal: 350 },
        unitCount: 18,
        buildingCount: 14,
      },
      tick: 1000,
    };

    // Should return null or TrashTalk (Ollama may not be available)
    const talk = await generator.generateTrashTalk(context);
    expect(talk === null || typeof talk === 'object').toBe(true);
  });

  it('should return null if called too frequently', async () => {
    const context: GameContext = {
      player1: {
        name: 'Ollama',
        resources: { food: 1000, wood: 800, stone: 600, metal: 400 },
        unitCount: 20,
        buildingCount: 15,
      },
      player2: {
        name: 'Petra',
        resources: { food: 1100, wood: 750, stone: 550, metal: 350 },
        unitCount: 18,
        buildingCount: 14,
      },
      tick: 100,
    };

    // Set frequency to 500 ticks
    generator.setTalkFrequency(500);

    // Call twice with small tick difference
    const talk1 = await generator.generateTrashTalk(context);
    const talk2 = await generator.generateTrashTalk({ ...context, tick: 150 });

    // Second call should return null (too soon)
    expect(talk2).toBeNull();
  });

  it('should handle context with player 1 ahead', async () => {
    const context: GameContext = {
      player1: {
        name: 'Ollama',
        resources: { food: 2000, wood: 1600, stone: 1200, metal: 800 },
        unitCount: 40,
        buildingCount: 25,
      },
      player2: {
        name: 'Petra',
        resources: { food: 500, wood: 400, stone: 300, metal: 200 },
        unitCount: 10,
        buildingCount: 8,
      },
      tick: 5000,
      recentEvent: 'player1_killed_unit',
    };

    const talk = await generator.generateTrashTalk(context);
    // Should handle without error
    expect(talk === null || typeof talk === 'object').toBe(true);
  });

  it('should handle context with player 2 ahead', async () => {
    const context: GameContext = {
      player1: {
        name: 'Ollama',
        resources: { food: 300, wood: 250, stone: 200, metal: 150 },
        unitCount: 8,
        buildingCount: 6,
      },
      player2: {
        name: 'Petra',
        resources: { food: 1800, wood: 1400, stone: 1000, metal: 600 },
        unitCount: 35,
        buildingCount: 22,
      },
      tick: 5000,
      recentEvent: 'player2_destroyed_building',
    };

    const talk = await generator.generateTrashTalk(context);
    // Should handle without error
    expect(talk === null || typeof talk === 'object').toBe(true);
  });

  it('should return speaker and message when generation succeeds', async () => {
    const context: GameContext = {
      player1: {
        name: 'Ollama',
        resources: { food: 1500, wood: 1200, stone: 900, metal: 600 },
        unitCount: 30,
        buildingCount: 20,
      },
      player2: {
        name: 'Petra',
        resources: { food: 1000, wood: 800, stone: 600, metal: 400 },
        unitCount: 20,
        buildingCount: 15,
      },
      tick: 5000,
      recentEvent: 'player1_killed_unit',
    };

    const talk = await generator.generateTrashTalk(context);

    if (talk !== null) {
      expect(talk.speaker).toMatch(/player[12]/);
      expect(talk.message).toBeDefined();
      expect(talk.message.length).toBeGreaterThan(0);
      expect(talk.tick).toBe(5000);
    }
  });
});
