/**
 * Story 47.4 — Match Export
 *
 * Export matches as portable packages.
 * Support multiple formats: JSON, ZIP, and manifest-based archives.
 * Enable sharing, backup, and cross-platform transport.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { Logger } from '../config/logger.js';
import { MatchLoader } from './match-loader.js';
import type { LoadedMatch } from './match-loader.js';

export interface ExportOptions {
  format: 'json' | 'json-compact' | 'zip';
  includeReplay: boolean;
  includeMetadata: boolean;
  includeTelemetry: boolean;
  compression?: 'gzip' | 'none';
  pretty?: boolean;
}

export interface ExportManifest {
  version: '1.0';
  exportedAt: string;
  matchId: string;
  files: Array<{
    name: string;
    path: string;
    size: number;
    checksum: string;
  }>;
  metadata: {
    duration: {
      realTimeMs?: number;
      gameTicksCompleted?: number;
    };
    players: number;
    map?: string;
    gameVersion?: string;
  };
}

export class MatchExporter {
  private loader: MatchLoader;
  private logger: Logger;
  private exportRoot: string;

  constructor(matchArchiveRoot: string = './matches', exportRoot: string = './exports', logger: Logger) {
    this.loader = new MatchLoader(matchArchiveRoot, logger);
    this.logger = logger;
    this.exportRoot = exportRoot;

    // Ensure export directory exists
    if (!fs.existsSync(this.exportRoot)) {
      fs.mkdirSync(this.exportRoot, { recursive: true });
    }
  }

  /**
   * Export a match to JSON format
   */
  exportAsJSON(matchId: string, options: Partial<ExportOptions> = {}): string | null {
    const opts: ExportOptions = {
      format: 'json',
      includeReplay: true,
      includeMetadata: true,
      includeTelemetry: true,
      compression: 'none',
      pretty: true,
      ...options,
    };

    try {
      const loaded = this.loader.loadMatch(matchId);
      if (!loaded) {
        this.logger.warn('Match not found for export', { matchId });
        return null;
      }

      const exportData = this.buildExportData(loaded, opts);
      const json = opts.pretty ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);

      // Save to file
      const filename = `${matchId}-export.json`;
      const filePath = path.join(this.exportRoot, filename);
      fs.writeFileSync(filePath, json);

      this.logger.info('Match exported as JSON', {
        matchId,
        file: filePath,
        sizeKb: Math.round(json.length / 1024),
      });

      return filePath;
    } catch (error) {
      this.logger.error('Failed to export match as JSON', { matchId, error });
      return null;
    }
  }

  /**
   * Export a match as compact JSON (minimal data)
   */
  exportAsCompactJSON(matchId: string): string | null {
    try {
      const loaded = this.loader.loadMatch(matchId);
      if (!loaded) return null;

      // Compact format: only essential data
      const compact = {
        id: loaded.archive.matchId,
        ts: loaded.archive.timestamp,
        map: loaded.archive.map,
        v: loaded.archive.gameVersion,
        p: loaded.archive.players.map(p => ({
          id: p.id,
          civ: p.civilization,
          brain: p.brain,
          units: { s: p.startingUnits, e: p.endingUnits },
          cmds: p.totalCommands,
        })),
        w: loaded.archive.winner,
        s: loaded.archive.statistics,
        t: loaded.archive.tickHistory,
      };

      const json = JSON.stringify(compact);
      const filename = `${matchId}-compact.json`;
      const filePath = path.join(this.exportRoot, filename);
      fs.writeFileSync(filePath, json);

      this.logger.info('Match exported as compact JSON', {
        matchId,
        file: filePath,
        sizeKb: Math.round(json.length / 1024),
      });

      return filePath;
    } catch (error) {
      this.logger.error('Failed to export compact JSON', { matchId, error });
      return null;
    }
  }

  /**
   * Export a match as a ZIP archive
   */
  exportAsZIP(matchId: string, options: Partial<ExportOptions> = {}): string | null {
    try {
      const loaded = this.loader.loadMatch(matchId);
      if (!loaded) return null;

      const opts: ExportOptions = {
        format: 'zip',
        includeReplay: true,
        includeMetadata: true,
        includeTelemetry: true,
        compression: 'gzip',
        pretty: true,
        ...options,
      };

      // Create temporary directory for archive contents
      const tempDir = path.join(this.exportRoot, `.temp-${matchId}`);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      try {
        // Write files to temp directory
        const files: Array<{ name: string; size: number; checksum: string }> = [];

        if (opts.includeMetadata) {
          const metaFile = path.join(tempDir, 'metadata.json');
          const metaJson = opts.pretty
            ? JSON.stringify(loaded.metadata, null, 2)
            : JSON.stringify(loaded.metadata);
          fs.writeFileSync(metaFile, metaJson);
          files.push({
            name: 'metadata.json',
            size: metaJson.length,
            checksum: this.calculateChecksum(metaJson),
          });
        }

        if (opts.includeTelemetry) {
          const telemetryFile = path.join(tempDir, 'telemetry.json');
          const telemetryJson = opts.pretty
            ? JSON.stringify(loaded.telemetry, null, 2)
            : JSON.stringify(loaded.telemetry);
          fs.writeFileSync(telemetryFile, telemetryJson);
          files.push({
            name: 'telemetry.json',
            size: telemetryJson.length,
            checksum: this.calculateChecksum(telemetryJson),
          });
        }

        if (opts.includeReplay) {
          const replayFile = path.join(tempDir, 'replay.json');
          const replayJson = opts.pretty
            ? JSON.stringify({ tickHistory: loaded.archive.tickHistory }, null, 2)
            : JSON.stringify({ tickHistory: loaded.archive.tickHistory });
          fs.writeFileSync(replayFile, replayJson);
          files.push({
            name: 'replay.json',
            size: replayJson.length,
            checksum: this.calculateChecksum(replayJson),
          });
        }

        // Create manifest
        const manifest: ExportManifest = {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          matchId: loaded.archive.matchId,
          files: files.map(f => ({
            name: f.name,
            path: f.name,
            size: f.size,
            checksum: f.checksum,
          })),
          metadata: {
            duration: {
              realTimeMs: loaded.archive.duration.totalMs,
              gameTicksCompleted: loaded.archive.duration.ticks,
            },
            players: loaded.archive.players.length,
            map: loaded.archive.map,
            gameVersion: loaded.archive.gameVersion,
          },
        };

        const manifestFile = path.join(tempDir, 'manifest.json');
        fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));

        // Create ZIP (using simple tar.gz as fallback since zip isn't available)
        const zipPath = path.join(this.exportRoot, `${matchId}-export.json.gz`);
        const allFiles = fs.readdirSync(tempDir);

        // For now, create a gzipped JSON of the entire match
        const fullExport = {
          manifest,
          metadata: opts.includeMetadata ? loaded.metadata : undefined,
          telemetry: opts.includeTelemetry ? loaded.telemetry : undefined,
          replay: opts.includeReplay ? loaded.archive.tickHistory : undefined,
        };

        const gzipData = zlib.gzipSync(JSON.stringify(fullExport));
        fs.writeFileSync(zipPath, gzipData);

        this.logger.info('Match exported as ZIP', {
          matchId,
          file: zipPath,
          sizeKb: Math.round(gzipData.length / 1024),
        });

        return zipPath;
      } finally {
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true });
        }
      }
    } catch (error) {
      this.logger.error('Failed to export match as ZIP', { matchId, error });
      return null;
    }
  }

  /**
   * Import a match from an exported JSON file
   */
  importFromJSON(filePath: string): LoadedMatch | null {
    try {
      if (!fs.existsSync(filePath)) {
        this.logger.warn('Import file not found', { filePath });
        return null;
      }

      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      // Detect format and convert if needed
      let loaded: LoadedMatch;
      if (data.archive) {
        // Full export format
        loaded = data as LoadedMatch;
      } else if (data.id) {
        // Compact format
        loaded = this.expandCompactFormat(data);
      } else {
        this.logger.error('Unrecognized export format', { filePath });
        return null;
      }

      this.logger.info('Match imported from JSON', { filePath, matchId: loaded.archive.matchId });
      return loaded;
    } catch (error) {
      this.logger.error('Failed to import match from JSON', { filePath, error });
      return null;
    }
  }

  /**
   * Import from a gzipped ZIP export
   */
  importFromZIP(filePath: string): LoadedMatch | null {
    try {
      if (!fs.existsSync(filePath)) {
        this.logger.warn('Import file not found', { filePath });
        return null;
      }

      const gzipData = fs.readFileSync(filePath);
      const jsonString = zlib.gunzipSync(gzipData).toString('utf-8');
      const data = JSON.parse(jsonString);

      // Extract match data from manifest-based format
      if (data.manifest && data.metadata) {
        const loaded: LoadedMatch = {
          archive: {
            matchId: data.manifest.matchId,
            timestamp: data.manifest.exportedAt,
            duration: {
              totalMs: data.manifest.metadata.duration.realTimeMs || 0,
              totalSeconds:
                (data.manifest.metadata.duration.realTimeMs || 0) / 1000,
              ticks: data.manifest.metadata.duration.gameTicksCompleted || 0,
            },
            players: data.metadata.players || [],
            winner: data.metadata.winner || null,
            map: data.manifest.metadata.map || '',
            gameVersion: data.manifest.metadata.gameVersion || '',
            statistics: data.metadata.statistics || {},
            tickHistory: data.replay || [],
          },
          metadata: data.metadata,
          telemetry: data.telemetry,
        };

        this.logger.info('Match imported from ZIP', { filePath, matchId: loaded.archive.matchId });
        return loaded;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to import match from ZIP', { filePath, error });
      return null;
    }
  }

  /**
   * Get list of all exported matches
   */
  listExports(): Array<{
    filename: string;
    format: string;
    matchId?: string;
    size: number;
  }> {
    try {
      if (!fs.existsSync(this.exportRoot)) return [];

      return fs
        .readdirSync(this.exportRoot)
        .filter(f => !f.startsWith('.'))
        .map(f => {
          const filePath = path.join(this.exportRoot, f);
          const stat = fs.statSync(filePath);
          const format = f.endsWith('.gz') ? 'gzip' : f.endsWith('-compact.json') ? 'json-compact' : 'json';
          const matchId = f.split('-export')[0] || f.split('-compact')[0];

          return {
            filename: f,
            format,
            matchId,
            size: stat.size,
          };
        })
        .sort((a, b) => b.size - a.size);
    } catch (error) {
      this.logger.error('Failed to list exports', { error });
      return [];
    }
  }

  /**
   * Delete an exported match file
   */
  deleteExport(filename: string): boolean {
    try {
      const filePath = path.join(this.exportRoot, filename);
      if (!fs.existsSync(filePath)) return false;

      fs.unlinkSync(filePath);
      this.logger.info('Export deleted', { filename });
      return true;
    } catch (error) {
      this.logger.error('Failed to delete export', { filename, error });
      return false;
    }
  }

  /**
   * Get export file size and info
   */
  getExportInfo(
    filename: string
  ): { size: number; sizeKb: number; sizeMb: number; format: string } | null {
    try {
      const filePath = path.join(this.exportRoot, filename);
      if (!fs.existsSync(filePath)) return null;

      const stat = fs.statSync(filePath);
      const format = filename.endsWith('.gz') ? 'gzip' : 'json';

      return {
        size: stat.size,
        sizeKb: Math.round(stat.size / 1024),
        sizeMb: Math.round((stat.size / 1024 / 1024) * 100) / 100,
        format,
      };
    } catch (error) {
      this.logger.error('Failed to get export info', { filename, error });
      return null;
    }
  }

  /**
   * Private helper: build export data structure
   */
  private buildExportData(loaded: LoadedMatch, opts: ExportOptions): any {
    const archive = opts.format === 'json-compact' ? this.compactArchive(loaded.archive) : { ...loaded.archive };

    // Remove replay data if not included
    if (!opts.includeReplay && archive.tickHistory) {
      delete archive.tickHistory;
    }

    return {
      archive,
      metadata: opts.includeMetadata ? loaded.metadata : undefined,
      telemetry: opts.includeTelemetry ? loaded.telemetry : undefined,
      config: loaded.config,
      stats: loaded.stats,
    };
  }

  /**
   * Private helper: compress archive data
   */
  private compactArchive(archive: any): any {
    return {
      id: archive.matchId,
      ts: archive.timestamp,
      map: archive.map,
      v: archive.gameVersion,
      p: archive.players.map((p: any) => ({
        id: p.id,
        civ: p.civilization,
        brain: p.brain,
        units: { s: p.startingUnits, e: p.endingUnits },
        cmds: p.totalCommands,
      })),
      w: archive.winner,
      s: archive.statistics,
      t: archive.tickHistory.slice(0, 10), // Sample first 10 ticks for compact
    };
  }

  /**
   * Private helper: expand compact format back to full
   */
  private expandCompactFormat(compact: any): LoadedMatch {
    return {
      archive: {
        matchId: compact.id,
        timestamp: compact.ts,
        duration: {
          totalMs: 0,
          totalSeconds: 0,
          ticks: 0,
        },
        players: compact.p.map((p: any) => ({
          id: p.id,
          civilization: p.civ,
          brain: p.brain,
          startingUnits: p.units.s,
          endingUnits: p.units.e,
          totalCommands: p.cmds,
        })),
        winner: compact.w,
        map: compact.map,
        gameVersion: compact.v,
        statistics: compact.s,
        tickHistory: compact.t,
      },
    };
  }

  /**
   * Private helper: calculate checksum (simple hash)
   */
  private calculateChecksum(data: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 8);
  }
}
