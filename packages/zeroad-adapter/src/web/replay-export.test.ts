import { describe, it, expect } from 'vitest';
import { ReplayExport } from './replay-export.js';
import type { ReplayMetadata } from './replay-storage.js';
import type { DecisionEvent } from '../match/decision-overlay.js';
import type { TimelineSnapshot } from '../match/match-timeline.js';

describe('ReplayExport', () => {
  const baseTime = Date.now();

  const metadata: ReplayMetadata = {
    matchId: 'match-test-001',
    timestamp: baseTime,
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

  const decisions: DecisionEvent[] = [
    {
      tick: 0,
      timestamp: baseTime,
      player: 'player1',
      brainName: 'Ollama-1',
      reasoning: 'Expanding territory',
      commands: ['move-unit', 'train-soldier'],
      commandCount: 2,
      durationMs: 250,
    },
    {
      tick: 1,
      timestamp: baseTime + 100,
      player: 'player2',
      brainName: 'Ollama-2',
      reasoning: 'Defending fortress',
      commands: ['build-defense', 'train-archer'],
      commandCount: 2,
      durationMs: 300,
    },
  ];

  const snapshots: TimelineSnapshot[] = [
    {
      tick: 0,
      timestamp: baseTime,
      gameState: {
        unitCount: 10,
        buildingCount: 5,
        playerCount: 2,
        resourcesPerPlayer: [
          { wood: 100, stone: 50 },
          { wood: 100, stone: 50 },
        ],
      },
      decisions: [],
    },
    {
      tick: 1,
      timestamp: baseTime + 100,
      gameState: {
        unitCount: 12,
        buildingCount: 6,
        playerCount: 2,
        resourcesPerPlayer: [
          { wood: 95, stone: 45 },
          { wood: 98, stone: 48 },
        ],
      },
      decisions: [],
    },
  ];

  describe('toJSON', () => {
    it('should export complete replay as JSON', () => {
      const json = ReplayExport.toJSON(metadata, decisions, snapshots);
      const parsed = JSON.parse(json);

      expect(parsed.metadata.matchId).toBe('match-test-001');
      expect(parsed.decisions).toHaveLength(2);
      expect(parsed.snapshots).toHaveLength(2);
    });

    it('should support excluding decisions', () => {
      const json = ReplayExport.toJSON(metadata, decisions, snapshots, { includeDecisions: false });
      const parsed = JSON.parse(json);

      expect(parsed.decisions).toBeUndefined();
      expect(parsed.snapshots).toBeDefined();
    });

    it('should support excluding snapshots', () => {
      const json = ReplayExport.toJSON(metadata, decisions, snapshots, { includeSnapshots: false });
      const parsed = JSON.parse(json);

      expect(parsed.decisions).toBeDefined();
      expect(parsed.snapshots).toBeUndefined();
    });

    it('should pretty-print by default', () => {
      const json = ReplayExport.toJSON(metadata, decisions, snapshots);
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });

    it('should support compact format', () => {
      const json = ReplayExport.toJSON(metadata, decisions, snapshots, { prettyPrint: false });
      expect(json).not.toContain('\n  ');
    });
  });

  describe('toCSV', () => {
    it('should export metadata as CSV', () => {
      const csv = ReplayExport.toCSV(metadata, decisions);

      expect(csv).toContain('Match ID,match-test-001');
      expect(csv).toContain('Brain 1,Ollama-1');
      expect(csv).toContain('Brain 2,Ollama-2');
      expect(csv).toContain('Winner,Ollama-1');
    });

    it('should include decision timeline', () => {
      const csv = ReplayExport.toCSV(metadata, decisions);

      expect(csv).toContain('Decision Timeline');
      expect(csv).toContain('Tick,Player,Brain,Commands');
      expect(csv).toContain('Player 1');
      expect(csv).toContain('Player 2');
    });

    it('should escape CSV special characters', () => {
      const metaWithComma: ReplayMetadata = {
        ...metadata,
        brain1Name: 'Brain,With,Commas',
      };

      const csv = ReplayExport.toCSV(metaWithComma, decisions);
      expect(csv).toContain('"Brain,With,Commas"');
    });

    it('should show error rates', () => {
      const csv = ReplayExport.toCSV(metadata, decisions);

      expect(csv).toContain('Player 1 Commands,50');
      expect(csv).toContain('Player 1 Errors,2');
      expect(csv).toContain('Player 2 Commands,48');
      expect(csv).toContain('Player 2 Errors,3');
    });
  });

  describe('toHTML', () => {
    it('should generate valid HTML', () => {
      const html = ReplayExport.toHTML(metadata, decisions, snapshots);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('should include match header', () => {
      const html = ReplayExport.toHTML(metadata, decisions, snapshots);

      expect(html).toContain('match-test-001');
      expect(html).toContain('Ollama-1');
      expect(html).toContain('Ollama-2');
    });

    it('should display winner information', () => {
      const html = ReplayExport.toHTML(metadata, decisions, snapshots);

      expect(html).toContain('Winner');
      expect(html).toContain('Ollama-1');
    });

    it('should show player statistics', () => {
      const html = ReplayExport.toHTML(metadata, decisions, snapshots);

      expect(html).toContain('Player Statistics');
      expect(html).toContain('Commands');
      expect(html).toContain('Errors');
      expect(html).toContain('Error Rate');
    });

    it('should display decision timeline summary', () => {
      const html = ReplayExport.toHTML(metadata, decisions, snapshots);

      expect(html).toContain('Decision Timeline Summary');
      expect(html).toContain('Total decisions');
      expect(html).toContain('Average decision time');
    });

    it('should escape HTML special characters', () => {
      const metaWithHTML: ReplayMetadata = {
        ...metadata,
        brain1Name: '<script>alert("xss")</script>',
      };

      const html = ReplayExport.toHTML(metaWithHTML, decisions, snapshots);

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should include top decisions table', () => {
      const html = ReplayExport.toHTML(metadata, decisions, snapshots);

      expect(html).toContain('Top Decisions by Duration');
      expect(html).toContain('Tick');
      expect(html).toContain('Duration');
    });
  });

  describe('toMetadata', () => {
    it('should export metadata as JSON', () => {
      const json = ReplayExport.toMetadata(metadata);
      const parsed = JSON.parse(json);

      expect(parsed.matchId).toBe('match-test-001');
      expect(parsed.brain1Name).toBe('Ollama-1');
      expect(parsed.winner).toBe('Ollama-1');
    });
  });

  describe('Draw handling', () => {
    it('should handle draw matches in CSV', () => {
      const drawMeta: ReplayMetadata = {
        ...metadata,
        winner: undefined,
      };

      const csv = ReplayExport.toCSV(drawMeta, decisions);
      expect(csv).toContain('Winner,Draw');
    });

    it('should handle draw matches in HTML', () => {
      const drawMeta: ReplayMetadata = {
        ...metadata,
        winner: undefined,
      };

      const html = ReplayExport.toHTML(drawMeta, decisions, snapshots);
      expect(html).toContain('Draw');
    });
  });

  describe('Error rate calculation', () => {
    it('should calculate error rate in HTML', () => {
      const html = ReplayExport.toHTML(metadata, decisions, snapshots);

      // Player 1: 2 errors / 50 commands = 4%
      expect(html).toContain('4.00%');
      // Player 2: 3 errors / 48 commands = 6.25%
      expect(html).toContain('6.25%');
    });

    it('should handle zero commands', () => {
      const zeroMeta: ReplayMetadata = {
        ...metadata,
        player1Commands: 0,
        player1Errors: 0,
      };

      const html = ReplayExport.toHTML(zeroMeta, decisions, snapshots);
      expect(html).toContain('0.00%');
    });
  });
});
