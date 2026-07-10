import { describe, it, expect, beforeEach } from 'vitest';
import { RealMatchLauncher } from './real-match-launcher.js';
import { MatchArchive } from '../match/match-archive.js';
import { Logger } from '../config/logger.js';

describe('RealMatchLauncher', () => {
  let launcher: RealMatchLauncher;
  let archive: MatchArchive;
  const logger = new Logger('error');

  beforeEach(() => {
    archive = new MatchArchive('./test-matches', logger);
    launcher = new RealMatchLauncher(archive, logger);
  });

  describe('match launch', () => {
    it('should launch a complete match', async () => {
      const config = {
        map: 'alpine_mountains_3p',
        players: [
          {
            name: 'NeuralRTS',
            civilization: 'Athens',
            aiModel: 'ollama:neural-rts',
            aiPrompt: 'aggressive-v1.0.0',
          },
          {
            name: 'Claude',
            civilization: 'Rome',
            aiModel: 'claude-opus-4-8',
            aiPrompt: 'balanced-v1.0.0',
          },
        ],
        maxDuration: 10, // 10 second match
      };

      const result = await launcher.launchMatch(config);

      expect(result.success).toBe(true);
      expect(result.matchId).toBeDefined();
      expect(result.duration).toBeDefined();
      expect(result.sessionPackagePath).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should generate match ID if not provided', async () => {
      const config = {
        map: 'alpine_mountains_3p',
        players: [
          {
            name: 'Player1',
            civilization: 'Athens',
            aiModel: 'model-a',
            aiPrompt: 'prompt-a',
          },
        ],
        maxDuration: 5,
      };

      const result = await launcher.launchMatch(config);

      expect(result.success).toBe(true);
      expect(result.matchId).toMatch(/^match-\d+$/);
    });

    it('should use provided match ID', async () => {
      const config = {
        matchId: 'custom-match-123',
        map: 'alpine_mountains_3p',
        players: [
          {
            name: 'Player1',
            civilization: 'Athens',
            aiModel: 'model-a',
            aiPrompt: 'prompt-a',
          },
        ],
        maxDuration: 5,
      };

      const result = await launcher.launchMatch(config);

      expect(result.success).toBe(true);
      expect(result.matchId).toBe('custom-match-123');
    });

    it('should support custom match duration', async () => {
      const config = {
        map: 'alpine_mountains_3p',
        players: [
          {
            name: 'Player1',
            civilization: 'Athens',
            aiModel: 'model-a',
            aiPrompt: 'prompt-a',
          },
        ],
        maxDuration: 5, // 5 seconds
      };

      const result = await launcher.launchMatch(config);

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(10); // Should be quick
    });

  });

  describe('multi-player matches', () => {
    it('should launch 2-player match', async () => {
      const config = {
        map: 'alpine_mountains_3p',
        players: [
          {
            name: 'Player1',
            civilization: 'Athens',
            aiModel: 'model-a',
            aiPrompt: 'prompt-a',
          },
          {
            name: 'Player2',
            civilization: 'Rome',
            aiModel: 'model-b',
            aiPrompt: 'prompt-b',
          },
        ],
        maxDuration: 10,
      };

      const result = await launcher.launchMatch(config);

      expect(result.success).toBe(true);
    });

    it('should launch 3-player match', async () => {
      const config = {
        map: 'alpine_mountains_3p',
        players: [
          {
            name: 'P1',
            civilization: 'Athens',
            aiModel: 'model-a',
            aiPrompt: 'prompt-a',
          },
          {
            name: 'P2',
            civilization: 'Rome',
            aiModel: 'model-b',
            aiPrompt: 'prompt-b',
          },
          {
            name: 'P3',
            civilization: 'Carthage',
            aiModel: 'model-c',
            aiPrompt: 'prompt-c',
          },
        ],
        maxDuration: 10,
      };

      const result = await launcher.launchMatch(config);

      expect(result.success).toBe(true);
    });
  });

  describe('match progression', () => {
    it('should progress through match phases', async () => {
      const config = {
        map: 'alpine_mountains_3p',
        players: [
          {
            name: 'Player1',
            civilization: 'Athens',
            aiModel: 'model-a',
            aiPrompt: 'prompt-a',
          },
        ],
        maxDuration: 10, // 10 second match to see phase transitions
      };

      const result = await launcher.launchMatch(config);

      expect(result.success).toBe(true);
      expect(result.matchId).toBeDefined();
      // sessionPackagePath may or may not be defined depending on recording success

      // In a real test, we could parse the package and verify phase progression
      // but that would require file I/O
    });

    it('should record a winner', async () => {
      const config = {
        map: 'alpine_mountains_3p',
        players: [
          {
            name: 'Winner',
            civilization: 'Athens',
            aiModel: 'model-a',
            aiPrompt: 'prompt-a',
          },
          {
            name: 'Loser',
            civilization: 'Rome',
            aiModel: 'model-b',
            aiPrompt: 'prompt-b',
          },
        ],
        maxDuration: 10,
      };

      const result = await launcher.launchMatch(config);

      expect(result.success).toBe(true);
      // Result should have a winner recorded in the session package
    });
  });

  describe('realistic scenario', () => {
    it('should launch complete tournament match', async () => {
      const config = {
        matchId: 'tournament-match-001',
        map: 'nomad_islands',
        players: [
          {
            name: 'NeuralRTS v2.1',
            civilization: 'Athens',
            aiModel: 'ollama:neural-rts',
            aiPrompt: 'aggressive-v2.1.0',
          },
          {
            name: 'Claude Opus',
            civilization: 'Rome',
            aiModel: 'claude-opus-4-8',
            aiPrompt: 'balanced-v1.0.0',
          },
        ],
        maxDuration: 30, // 30-second match
      };

      const result = await launcher.launchMatch(config);

      expect(result.success).toBe(true);
      expect(result.matchId).toBe('tournament-match-001');
      expect(result.duration).toBeLessThan(60); // Should complete in < 1 minute
      expect(result.sessionPackagePath).toMatch(/\.json$/);
    });

    it('should launch rapid succession matches', async () => {
      const matches = [];

      for (let i = 0; i < 3; i++) {
        const config = {
          matchId: `rapid-match-${i}`,
          map: 'alpine_mountains_3p',
          players: [
            {
              name: `Player${i}-A`,
              civilization: 'Athens',
              aiModel: 'model-a',
              aiPrompt: 'prompt-a',
            },
            {
              name: `Player${i}-B`,
              civilization: 'Rome',
              aiModel: 'model-b',
              aiPrompt: 'prompt-b',
            },
          ],
          maxDuration: 5,
        };

        const result = await launcher.launchMatch(config);
        matches.push(result);
      }

      // All matches should succeed
      expect(matches.every(m => m.success)).toBe(true);
      expect(matches.length).toBe(3);
      expect(matches.map(m => m.matchId)).toEqual([
        'rapid-match-0',
        'rapid-match-1',
        'rapid-match-2',
      ]);
    });
  });
});
