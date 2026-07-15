import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MatchExporter } from './match-export.js';
import { MatchArchive } from './match-archive.js';
import { Logger } from '../config/logger.js';
import * as fs from 'fs';

describe('MatchExporter', () => {
  let exporter: MatchExporter;
  let archive: MatchArchive;
  const archiveDir = './test-matches-export-archive';
  const exportDir = './test-matches-export-dir';
  const logger = new Logger('error');

  beforeEach(() => {
    if (fs.existsSync(archiveDir)) {
      fs.rmSync(archiveDir, { recursive: true });
    }
    if (fs.existsSync(exportDir)) {
      fs.rmSync(exportDir, { recursive: true });
    }

    archive = new MatchArchive(archiveDir, logger);
    exporter = new MatchExporter(archiveDir, exportDir, logger);
  });

  afterEach(() => {
    if (fs.existsSync(archiveDir)) {
      fs.rmSync(archiveDir, { recursive: true });
    }
    if (fs.existsSync(exportDir)) {
      fs.rmSync(exportDir, { recursive: true });
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
      player1: { units: { start: 10, end: 23, growth: 13 }, commands: 534, commandsPerTick: 1.78 },
      player2: { units: { start: 9, end: 22, growth: 13 }, commands: 0, commandsPerTick: 0 },
      totalCommands: 534,
      commandThroughput: 53.4,
      activeTicks: 267,
      idleTicks: 33,
      idlePercentage: 11,
    },
    tickHistory: [
      { tick: 0, player1Units: 10, player2Units: 9, commands: 2 },
      { tick: 1, player1Units: 10, player2Units: 9, commands: 1 },
      { tick: 2, player1Units: 11, player2Units: 9, commands: 2 },
    ],
    ...overrides,
  });

  describe('exportAsJSON', () => {
    it('should export match as JSON file', () => {
      const matchData = createMatchData();
      const matchId = archive.archive(matchData);

      const filePath = exporter.exportAsJSON(matchId);

      expect(filePath).toBeDefined();
      expect(fs.existsSync(filePath!)).toBe(true);
      expect(filePath).toContain('-export.json');

      const exported = JSON.parse(fs.readFileSync(filePath!, 'utf-8'));
      expect(exported.archive.matchId).toBe(matchId);
      expect(exported.metadata).toBeDefined();
    });

    it('should handle missing match gracefully', () => {
      const filePath = exporter.exportAsJSON('nonexistent-id');
      expect(filePath).toBeNull();
    });

    it('should respect includeMetadata option', () => {
      const matchData = createMatchData();
      const matchId = archive.archive(matchData);

      const filePath = exporter.exportAsJSON(matchId, { includeMetadata: false });
      const exported = JSON.parse(fs.readFileSync(filePath!, 'utf-8'));

      expect(exported.metadata).toBeUndefined();
      expect(exported.archive).toBeDefined();
    });

    it('should respect includeReplay option', () => {
      const matchData = createMatchData();
      const matchId = archive.archive(matchData);

      const filePath = exporter.exportAsJSON(matchId, { includeReplay: false });
      const exported = JSON.parse(fs.readFileSync(filePath!, 'utf-8'));

      expect(exported.archive.tickHistory).toBeUndefined();
      expect(exported.archive.matchId).toBeDefined();
    });

    it('should format JSON with proper indentation when pretty=true', () => {
      const matchData = createMatchData();
      const matchId = archive.archive(matchData);

      const filePath = exporter.exportAsJSON(matchId, { pretty: true });
      const content = fs.readFileSync(filePath!, 'utf-8');

      expect(content).toContain('  '); // Has indentation
      expect(content).toContain('\n'); // Has newlines
    });

    it('should create compact JSON when specified', () => {
      const matchData = createMatchData();
      const matchId = archive.archive(matchData);

      const filePath = exporter.exportAsCompactJSON(matchId);

      expect(filePath).toBeDefined();
      expect(fs.existsSync(filePath!)).toBe(true);
      expect(filePath).toContain('-compact.json');

      const exported = JSON.parse(fs.readFileSync(filePath!, 'utf-8'));
      expect(exported.id).toBe(matchId);
      expect(exported.p).toHaveLength(2); // Players
    });
  });

  describe('exportAsZIP', () => {
    it('should export match as gzipped archive', () => {
      const matchData = createMatchData();
      const matchId = archive.archive(matchData);

      const filePath = exporter.exportAsZIP(matchId);

      expect(filePath).toBeDefined();
      expect(fs.existsSync(filePath!)).toBe(true);
      expect(filePath).toContain('.gz');
    });

    it('should create valid gzipped content', () => {
      const matchData = createMatchData();
      const matchId = archive.archive(matchData);

      const filePath = exporter.exportAsZIP(matchId);
      const buffer = fs.readFileSync(filePath!);

      // Check gzip magic number
      expect(buffer[0]).toBe(0x1f);
      expect(buffer[1]).toBe(0x8b);
    });

    it('should respect export options', () => {
      const matchData = createMatchData();
      const matchId = archive.archive(matchData);

      const filePath = exporter.exportAsZIP(matchId, {
        includeReplay: false,
        includeMetadata: true,
      });

      expect(filePath).toBeDefined();
      expect(fs.existsSync(filePath!)).toBe(true);
    });
  });

  describe('importFromJSON', () => {
    it('should import a full export JSON', () => {
      const matchData = createMatchData();
      const matchId = archive.archive(matchData);
      const exportPath = exporter.exportAsJSON(matchId);

      const imported = exporter.importFromJSON(exportPath!);

      expect(imported).toBeDefined();
      expect(imported?.archive.matchId).toBe(matchId);
      expect(imported?.metadata).toBeDefined();
    });

    it('should import compact JSON format', () => {
      const matchData = createMatchData();
      const matchId = archive.archive(matchData);
      const exportPath = exporter.exportAsCompactJSON(matchId);

      const imported = exporter.importFromJSON(exportPath!);

      expect(imported).toBeDefined();
      expect(imported?.archive.matchId).toBe(matchId);
    });

    it('should handle missing import file', () => {
      const imported = exporter.importFromJSON('/nonexistent/path.json');
      expect(imported).toBeNull();
    });

    it('should preserve match data through export/import cycle', () => {
      const matchData = createMatchData();
      const originalMatchId = archive.archive(matchData);

      const exportPath = exporter.exportAsJSON(originalMatchId);
      const imported = exporter.importFromJSON(exportPath!);

      expect(imported?.archive.map).toBe('acropolis_bay_2p');
      expect(imported?.archive.players[0].civilization).toBe('Athenians');
      expect(imported?.archive.statistics.totalCommands).toBe(534);
    });
  });

  describe('importFromZIP', () => {
    it('should import from gzipped archive', () => {
      const matchData = createMatchData();
      const matchId = archive.archive(matchData);
      const exportPath = exporter.exportAsZIP(matchId);

      const imported = exporter.importFromZIP(exportPath!);

      expect(imported).toBeDefined();
      expect(imported?.archive.matchId).toBe(matchId);
    });

    it('should handle missing ZIP file', () => {
      const imported = exporter.importFromZIP('/nonexistent/archive.gz');
      expect(imported).toBeNull();
    });

    it('should decompress and parse ZIP correctly', () => {
      const matchData = createMatchData();
      const matchId = archive.archive(matchData);
      const exportPath = exporter.exportAsZIP(matchId);

      const imported = exporter.importFromZIP(exportPath!);

      expect(imported?.archive.players.length).toBe(2);
      expect(imported?.metadata).toBeDefined();
    });
  });

  describe('listExports', () => {
    it('should list all exported files', () => {
      const matchData = createMatchData();
      const id1 = archive.archive(matchData);
      const id2 = archive.archive(matchData);

      exporter.exportAsJSON(id1);
      exporter.exportAsCompactJSON(id2);

      const exports = exporter.listExports();

      expect(exports.length).toBeGreaterThanOrEqual(2);
      expect(exports.some(e => e.format === 'json')).toBe(true);
      expect(exports.some(e => e.format === 'json-compact')).toBe(true);
    });

    it('should include file size information', () => {
      const matchData = createMatchData();
      const matchId = archive.archive(matchData);

      exporter.exportAsJSON(matchId);

      const exports = exporter.listExports();
      expect(exports[0].size).toBeGreaterThan(0);
    });

    it('should handle empty export directory', () => {
      const exports = exporter.listExports();
      expect(exports).toEqual([]);
    });
  });

  describe('getExportInfo', () => {
    it('should get info about an export file', () => {
      const matchData = createMatchData();
      const matchId = archive.archive(matchData);

      const filePath = exporter.exportAsJSON(matchId)!;
      const filename = filePath.split(/[/\\]/).pop()!;

      const info = exporter.getExportInfo(filename);

      expect(info).toBeDefined();
      expect(info?.size).toBeGreaterThan(0);
      expect(info?.sizeKb).toBeGreaterThan(0);
      expect(info?.format).toBe('json');
    });

    it('should return null for non-existent file', () => {
      const info = exporter.getExportInfo('nonexistent.json');
      expect(info).toBeNull();
    });

    it('should correctly convert byte sizes', () => {
      const matchData = createMatchData();
      const matchId = archive.archive(matchData);

      const filePath = exporter.exportAsJSON(matchId)!;
      const filename = filePath.split(/[/\\]/).pop()!;

      const info = exporter.getExportInfo(filename)!;

      // sizeKb is rounded, so allow some tolerance
      expect(Math.abs(info.sizeKb * 1024 - info.size)).toBeLessThan(1024);
    });
  });

  describe('deleteExport', () => {
    it('should delete an export file', () => {
      const matchData = createMatchData();
      const matchId = archive.archive(matchData);

      const filePath = exporter.exportAsJSON(matchId)!;
      const filename = filePath.split(/[/\\]/).pop()!;

      expect(fs.existsSync(filePath)).toBe(true);

      const deleted = exporter.deleteExport(filename);

      expect(deleted).toBe(true);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should return false for non-existent file', () => {
      const deleted = exporter.deleteExport('nonexistent.json');
      expect(deleted).toBe(false);
    });
  });

  describe('Export format compatibility', () => {
    it('should support roundtrip JSON export/import', () => {
      const tickHistory = [
        { tick: 0, player1Units: 10, player2Units: 9, commands: 2 },
        { tick: 1, player1Units: 11, player2Units: 9, commands: 1 },
      ];

      const matchData = createMatchData({ tickHistory });
      const originalId = archive.archive(matchData);

      // Export as JSON
      const jsonPath = exporter.exportAsJSON(originalId)!;

      // Import back
      const imported = exporter.importFromJSON(jsonPath)!;

      // Verify integrity
      expect(imported.archive.tickHistory).toEqual(tickHistory);
      expect(imported.archive.players[0].civilization).toBe('Athenians');
    });

    it('should support roundtrip gzip export/import', () => {
      const matchData = createMatchData();
      const originalId = archive.archive(matchData);

      // Export as gzip
      const gzipPath = exporter.exportAsZIP(originalId)!;

      // Import back
      const imported = exporter.importFromZIP(gzipPath)!;

      // Verify integrity
      expect(imported.archive.matchId).toBe(originalId);
      expect(imported.metadata).toBeDefined();
    });

    it('should preserve all match data through export/import cycle', () => {
      const matchData = createMatchData();
      const originalId = archive.archive(matchData);

      // Test both formats
      const jsonPath = exporter.exportAsJSON(originalId)!;
      const importedJson = exporter.importFromJSON(jsonPath)!;

      const gzipPath = exporter.exportAsZIP(originalId)!;
      const importedGzip = exporter.importFromZIP(gzipPath)!;

      // Both should have same match ID
      expect(importedJson.archive.matchId).toBe(importedGzip.archive.matchId);

      // Both should have same map
      expect(importedJson.archive.map).toBe(importedGzip.archive.map);

      // Both should have same players
      expect(importedJson.archive.players.length).toBe(importedGzip.archive.players.length);
    });
  });
});
