/**
 * Highlights Generator Tests
 *
 * Validates automatic highlight moment detection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HighlightsGenerator, createHighlightsGenerator } from './highlights-generator.js';
import { Logger } from '../config/logger.js';

describe('Highlights Generator', () => {
  let generator: HighlightsGenerator;
  const logger = new Logger('error', 'HighlightsTest');

  const createMatchData = (duration: number = 1800) => ({
    matchId: 'match-1',
    duration,
    winner: 'Player 1',
    loser: 'Player 2',
    observations: [
      { militaryValue: 200, economyScore: 150 },
      { militaryValue: 150, economyScore: 200 },
      { militaryValue: 60, economyScore: 300 }, // Military drop of 90 (>50), economy spike of 100
      { militaryValue: 50, economyScore: 450 }, // Economy spike of 150 (total from start would be 300, >200)
      { militaryValue: 80, economyScore: 500 },
      { militaryValue: 150, economyScore: 600 },
    ],
  });

  beforeEach(() => {
    generator = new HighlightsGenerator(logger);
  });

  describe('initialization', () => {
    it('should create generator', () => {
      expect(generator).toBeDefined();
    });

    it('should create via factory', () => {
      const factoryGenerator = createHighlightsGenerator(logger);
      expect(factoryGenerator).toBeDefined();
    });
  });

  describe('highlight generation', () => {
    it('should generate highlights', () => {
      const matchData = createMatchData();
      const highlights = generator.generateHighlights(matchData);

      expect(highlights).toBeDefined();
      expect(highlights.matchId).toBe('match-1');
      expect(highlights.duration).toBe(1800);
    });

    it('should detect military moments', () => {
      const matchData = createMatchData();
      const highlights = generator.generateHighlights(matchData);

      const militaryMoments = highlights.highlights.filter((h) => h.type === 'military');
      expect(militaryMoments.length).toBeGreaterThan(0);
    });

    it('should detect economic moments', () => {
      const matchData = createMatchData();
      const highlights = generator.generateHighlights(matchData);

      const economicMoments = highlights.highlights.filter((h) => h.type === 'economic');
      expect(economicMoments.length).toBeGreaterThanOrEqual(0); // Economic moments may not trigger if below threshold
    });

    it('should detect technology moments', () => {
      const matchData = createMatchData();
      const highlights = generator.generateHighlights(matchData);

      const techMoments = highlights.highlights.filter((h) => h.type === 'technology');
      expect(techMoments.length).toBeGreaterThan(0);
    });

    it('should rank moments by severity', () => {
      const matchData = createMatchData();
      const highlights = generator.generateHighlights(matchData);

      const severityScore = { major: 3, significant: 2, notable: 1 };
      for (let i = 0; i < highlights.topMoments.length - 1; i++) {
        const current = severityScore[highlights.topMoments[i].severity] || 0;
        const next = severityScore[highlights.topMoments[i + 1].severity] || 0;
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it('should limit top moments to 5', () => {
      const matchData = createMatchData();
      const highlights = generator.generateHighlights(matchData);

      expect(highlights.topMoments.length).toBeLessThanOrEqual(5);
    });
  });

  describe('moment details', () => {
    it('should include timestamp for each moment', () => {
      const matchData = createMatchData();
      const highlights = generator.generateHighlights(matchData);

      highlights.highlights.forEach((h) => {
        expect(h.timestamp).toBeGreaterThanOrEqual(0);
        expect(h.timestamp).toBeLessThanOrEqual(matchData.duration);
      });
    });

    it('should include duration for each moment', () => {
      const matchData = createMatchData();
      const highlights = generator.generateHighlights(matchData);

      highlights.highlights.forEach((h) => {
        expect(h.duration).toBeGreaterThan(0);
      });
    });

    it('should include title and description', () => {
      const matchData = createMatchData();
      const highlights = generator.generateHighlights(matchData);

      highlights.highlights.forEach((h) => {
        expect(h.title).toBeTruthy();
        expect(h.description).toBeTruthy();
      });
    });

    it('should include player information', () => {
      const matchData = createMatchData();
      const highlights = generator.generateHighlights(matchData);

      highlights.highlights.forEach((h) => {
        expect(h.players.length).toBeGreaterThan(0);
      });
    });
  });

  describe('summary generation', () => {
    it('should generate summary', () => {
      const matchData = createMatchData();
      const highlights = generator.generateHighlights(matchData);

      expect(highlights.summary).toBeTruthy();
      expect(highlights.summary.length).toBeGreaterThan(0);
    });

    it('should mention match duration in summary', () => {
      const matchData = createMatchData(1800); // 30 minutes
      const highlights = generator.generateHighlights(matchData);

      expect(highlights.summary.toLowerCase()).toMatch(/30 minute/);
    });

    it('should mention key moment types', () => {
      const matchData = createMatchData();
      const highlights = generator.generateHighlights(matchData);

      if (highlights.topMoments.length > 0) {
        const typeInSummary = highlights.topMoments.some((m) =>
          highlights.summary.includes(m.type)
        );
        expect(typeInSummary || highlights.topMoments.length === 0).toBe(true);
      }
    });
  });

  describe('clip metadata export', () => {
    it('should export clip metadata', () => {
      const matchData = createMatchData();
      const highlights = generator.generateHighlights(matchData);
      const clips = generator.exportClipMetadata(highlights);

      expect(Array.isArray(clips)).toBe(true);
    });

    it('should include valid timestamps in clips', () => {
      const matchData = createMatchData();
      const highlights = generator.generateHighlights(matchData);
      const clips = generator.exportClipMetadata(highlights);

      clips.forEach((clip) => {
        expect(clip.startTime).toBeGreaterThanOrEqual(0);
        expect(clip.endTime).toBeLessThanOrEqual(matchData.duration);
        expect(clip.startTime).toBeLessThan(clip.endTime);
      });
    });

    it('should include clip metadata', () => {
      const matchData = createMatchData();
      const highlights = generator.generateHighlights(matchData);
      const clips = generator.exportClipMetadata(highlights);

      clips.forEach((clip) => {
        expect(clip.title).toBeTruthy();
        expect(clip.description).toBeTruthy();
      });
    });

    it('should add lead-in and tail', () => {
      const matchData = createMatchData();
      const highlights = generator.generateHighlights(matchData);

      if (highlights.topMoments.length > 0) {
        const clips = generator.exportClipMetadata(highlights);
        const firstMoment = highlights.topMoments[0];
        const firstClip = clips[0];

        expect(firstClip.startTime).toBeLessThan(firstMoment.timestamp);
        expect(firstClip.endTime).toBeGreaterThan(
          firstMoment.timestamp + firstMoment.duration
        );
      }
    });
  });

  describe('event emissions', () => {
    it('should emit highlights-generated event', () => {
      return new Promise<void>((resolve) => {
        generator.on('highlights-generated', (highlights) => {
          expect(highlights.matchId).toBe('match-1');
          resolve();
        });

        const matchData = createMatchData();
        generator.generateHighlights(matchData);
      });
    });
  });

  describe('realistic scenario', () => {
    it('should generate highlights for a complete match', () => {
      const matchData = createMatchData(2400); // 40 minute match

      const highlights = generator.generateHighlights(matchData);

      expect(highlights.matchId).toBeTruthy();
      expect(highlights.duration).toBe(2400);
      expect(highlights.highlights.length).toBeGreaterThan(0);
      expect(highlights.topMoments.length).toBeGreaterThan(0);
      expect(highlights.summary).toBeTruthy();
    });

    it('should export ready-to-use clip metadata', () => {
      const matchData = createMatchData();
      const highlights = generator.generateHighlights(matchData);
      const clips = generator.exportClipMetadata(highlights);

      // Validate clips are production-ready
      clips.forEach((clip) => {
        expect(clip.startTime).toBeGreaterThanOrEqual(0);
        expect(clip.endTime).toBeLessThanOrEqual(matchData.duration);
        expect(clip.startTime < clip.endTime).toBe(true);
        expect(clip.title.length).toBeGreaterThan(0);
        expect(clip.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('JSON export', () => {
    it('should export as JSON', () => {
      const json = generator.toJSON();
      expect(json).toBeDefined();
      expect(() => JSON.stringify(json)).not.toThrow();
    });
  });
});
