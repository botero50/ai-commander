/**
 * Story 58 — Map Discovery Service
 *
 * Automatically discovers available maps in 0 A.D. installation.
 * Supports both built-in and user-created maps.
 *
 * Features:
 * - Discover maps from game installation
 * - Cache results for performance
 * - Filter by player count / map type
 * - Fallback to hardcoded list if discovery fails
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../config/logger.js';

export interface MapInfo {
  name: string; // map identifier (e.g., 'acropolis_bay_2p')
  displayName: string; // human-readable name
  filePath: string; // relative path (e.g., 'skirmishes/acropolis_bay_2p')
  players: number; // player count (extracted from filename or metadata)
  isBuiltin: boolean; // true if from 0 A.D. default installation
}

/**
 * Discovers and manages available maps in 0 A.D.
 */
export class MapDiscovery {
  private logger: Logger;
  private maps: Map<string, MapInfo> = new Map();
  private mapsLoaded: boolean = false;
  private gameDataPath: string;

  // Fallback hardcoded maps (verified to work with 0 A.D.)
  // Only includes maps that have been tested and confirmed ACTUALLY WORKING
  // Removed: Bactriana, Caspian Sea, Coele-Syria, Dueling Cliffs, Egypt, Gold Oasis, Island of Meroë, Mediterranean Coves, Cisalpine Winter (buggy)
  // See test-user-maps.ts for verification results
  // Maps are organized by player count for balanced arena rotation
  private readonly FALLBACK_MAPS: MapInfo[] = [
    // 2-Player Maps (28 verified)
    { name: 'acropolis_bay_2p', displayName: 'Acropolis Bay', filePath: 'skirmishes/acropolis_bay_2p', players: 2, isBuiltin: true },
    { name: 'alpine_valleys_2p', displayName: 'Alpine Valleys', filePath: 'skirmishes/alpine_valleys_2p', players: 2, isBuiltin: true },
    { name: 'arabian_oases_2p', displayName: 'Arabian Oases', filePath: 'skirmishes/arabian_oases_2p', players: 2, isBuiltin: true },
    { name: 'belgian_bog_2p', displayName: 'Belgian Bog', filePath: 'skirmishes/belgian_bog_2p', players: 2, isBuiltin: true },
    { name: 'corinthian_isthmus_2p', displayName: 'Corinthian Isthmus', filePath: 'skirmishes/corinthian_isthmus_2p', players: 2, isBuiltin: true },
    { name: 'death_canyon_2p', displayName: 'Death Canyon', filePath: 'skirmishes/death_canyon_2p', players: 2, isBuiltin: true },
    { name: 'deccan_plateau_2p', displayName: 'Deccan Plateau', filePath: 'skirmishes/deccan_plateau_2p', players: 2, isBuiltin: true },
    { name: 'farmland_2p', displayName: 'Farmland', filePath: 'skirmishes/farmland_2p', players: 2, isBuiltin: true },
    { name: 'gallic_highlands_2p', displayName: 'Gallic Highlands', filePath: 'skirmishes/gallic_highlands_2p', players: 2, isBuiltin: true },
    { name: 'golden_island_2p', displayName: 'Golden Island', filePath: 'skirmishes/golden_island_2p', players: 2, isBuiltin: true },
    { name: 'greek_acropolis_2p', displayName: 'Greek Acropolis', filePath: 'skirmishes/greek_acropolis_2p', players: 2, isBuiltin: true },
    { name: 'hindu_kush_2p', displayName: 'Hindu Kush', filePath: 'skirmishes/hindu_kush_2p', players: 2, isBuiltin: true },
    { name: 'isthmus_of_corinth_2p', displayName: 'Isthmus of Corinth', filePath: 'skirmishes/isthmus_of_corinth_2p', players: 2, isBuiltin: true },
    { name: 'libyan_oasis_2p', displayName: 'Libyan Oasis', filePath: 'skirmishes/libyan_oasis_2p', players: 2, isBuiltin: true },
    { name: 'lorraine_plain_2p', displayName: 'Lorraine Plain', filePath: 'skirmishes/lorraine_plain_2p', players: 2, isBuiltin: true },
    { name: 'magadha_2p', displayName: 'Magadha', filePath: 'skirmishes/magadha_2p', players: 2, isBuiltin: true },
    { name: 'median_oasis_2p', displayName: 'Median Oasis', filePath: 'skirmishes/median_oasis_2p', players: 2, isBuiltin: true },
    { name: 'miletus_peninsula_2p', displayName: 'Miletus Peninsula', filePath: 'skirmishes/miletus_peninsula_2p', players: 2, isBuiltin: true },
    { name: 'neareastern_badlands_2p', displayName: 'Neareastern Badlands', filePath: 'skirmishes/neareastern_badlands_2p', players: 2, isBuiltin: true },
    { name: 'oceanside_2p', displayName: 'Oceanside', filePath: 'skirmishes/oceanside_2p', players: 2, isBuiltin: true },
    { name: 'punjab_2p', displayName: 'Punjab', filePath: 'skirmishes/punjab_2p', players: 2, isBuiltin: true },
    { name: 'saharan_oases_2p', displayName: 'Saharan Oases', filePath: 'skirmishes/saharan_oases_2p', players: 2, isBuiltin: true },
    { name: 'savanna_river_2p', displayName: 'Savanna River', filePath: 'skirmishes/savanna_river_2p', players: 2, isBuiltin: true },
    { name: 'sicilia_2p', displayName: 'Sicilia', filePath: 'skirmishes/sicilia_2p', players: 2, isBuiltin: true },
    { name: 'sicilia_nomad_2p', displayName: 'Sicilia Nomad', filePath: 'skirmishes/sicilia_nomad_2p', players: 2, isBuiltin: true },
    { name: 'tarim_basin_2p', displayName: 'Tarim Basin', filePath: 'skirmishes/tarim_basin_2p', players: 2, isBuiltin: true },
    { name: 'temperate_roadway_2p', displayName: 'Temperate Roadway', filePath: 'skirmishes/temperate_roadway_2p', players: 2, isBuiltin: true },
    { name: 'zagros_mountains_2p', displayName: 'Zagros Mountains', filePath: 'skirmishes/zagros_mountains_2p', players: 2, isBuiltin: true },

    // 3-Player Maps (4 verified)
    { name: 'alpine_mountains_3p', displayName: 'Alpine Mountains', filePath: 'skirmishes/alpine_mountains_3p', players: 3, isBuiltin: true },
    { name: 'gallic_fields_3p', displayName: 'Gallic Fields', filePath: 'skirmishes/gallic_fields_3p', players: 3, isBuiltin: true },
    { name: 'gambia_river_3p', displayName: 'Gambia River', filePath: 'skirmishes/gambia_river_3p', players: 3, isBuiltin: true },

    // 4-Player Maps (17 verified)
    { name: 'corinthian_isthmus_4p', displayName: 'Corinthian Isthmus 4p', filePath: 'skirmishes/corinthian_isthmus_4p', players: 4, isBuiltin: true },
    { name: 'crocodilopolis_4p', displayName: 'Crocodilopolis', filePath: 'skirmishes/crocodilopolis_4p', players: 4, isBuiltin: true },
    { name: 'forest_battle_4p', displayName: 'Forest Battle', filePath: 'skirmishes/forest_battle_4p', players: 4, isBuiltin: true },
    { name: 'greek_acropolis_4p', displayName: 'Greek Acropolis 4p', filePath: 'skirmishes/greek_acropolis_4p', players: 4, isBuiltin: true },
    { name: 'hydaspes_river_4p', displayName: 'Hydaspes River', filePath: 'skirmishes/hydaspes_river_4p', players: 4, isBuiltin: true },
    { name: 'libyan_oases_4p', displayName: 'Libyan Oases', filePath: 'skirmishes/libyan_oases_4p', players: 4, isBuiltin: true },
    { name: 'median_oasis_4p', displayName: 'Median Oasis 4p', filePath: 'skirmishes/median_oasis_4p', players: 4, isBuiltin: true },
    { name: 'neareastern_badlands_4p', displayName: 'Neareastern Badlands 4p', filePath: 'skirmishes/neareastern_badlands_4p', players: 4, isBuiltin: true },
    { name: 'obedska_bog_4p', displayName: 'Obedska Bog', filePath: 'skirmishes/obedska_bog_4p', players: 4, isBuiltin: true },
    { name: 'obedska_bog_night_4p', displayName: 'Obedska Bog Night', filePath: 'skirmishes/obedska_bog_night_4p', players: 4, isBuiltin: true },
    { name: 'persian_highlands_4p', displayName: 'Persian Highlands', filePath: 'skirmishes/persian_highlands_4p', players: 4, isBuiltin: true },
    { name: 'saharan_oases_4p', displayName: 'Saharan Oases', filePath: 'skirmishes/saharan_oases_4p', players: 4, isBuiltin: true },
    { name: 'sahel_4p', displayName: 'Sahel', filePath: 'skirmishes/sahel_4p', players: 4, isBuiltin: true },
    { name: 'tarim_basin_4p', displayName: 'Tarim Basin', filePath: 'skirmishes/tarim_basin_4p', players: 4, isBuiltin: true },
    { name: 'thessalian_plains_4p', displayName: 'Thessalian Plains', filePath: 'skirmishes/thessalian_plains_4p', players: 4, isBuiltin: true },
    { name: 'tuscan_acropolis_4p', displayName: 'Tuscan Acropolis', filePath: 'skirmishes/tuscan_acropolis_4p', players: 4, isBuiltin: true },
    { name: 'via_augusta_4p', displayName: 'Via Augusta', filePath: 'skirmishes/via_augusta_4p', players: 4, isBuiltin: true },
    { name: 'watering_holes_4p', displayName: 'Watering Holes', filePath: 'skirmishes/watering_holes_4p', players: 4, isBuiltin: true },

    // 5-Player Maps (2 verified)
    { name: 'sahyadri_buttes_5p', displayName: 'Sahyadri Buttes', filePath: 'skirmishes/sahyadri_buttes_5p', players: 5, isBuiltin: true },
    { name: 'white_cliffs_of_dover_5p', displayName: 'White Cliffs of Dover', filePath: 'skirmishes/white_cliffs_of_dover_5p', players: 5, isBuiltin: true },

    // 6-Player Maps (2 verified)
    { name: 'two_seas_6p', displayName: 'Two Seas', filePath: 'skirmishes/two_seas_6p', players: 6, isBuiltin: true },
    { name: 'vesuvius_6p', displayName: 'Vesuvius', filePath: 'skirmishes/vesuvius_6p', players: 6, isBuiltin: true },

    // 8-Player Maps (1 verified)
    { name: 'atlas_valleys_8p', displayName: 'Atlas Valleys', filePath: 'skirmishes/atlas_valleys_8p', players: 8, isBuiltin: true },
  ];

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('info', 'MapDiscovery');

    // Determine 0 A.D. installation path
    const userProfile = process.env.USERPROFILE;
    if (!userProfile) {
      throw new Error('USERPROFILE environment variable not set');
    }

    this.gameDataPath = path.join(
      userProfile,
      'AppData\\Local\\0 A.D. Empires Ascendant\\binaries\\data'
    );
  }

  /**
   * Load available maps (lazy-loaded on first call)
   */
  async discoverMaps(): Promise<MapInfo[]> {
    if (this.mapsLoaded) {
      return Array.from(this.maps.values());
    }

    try {
      this.logger.info('🔍 Discovering available maps...');

      // Try to discover from game installation
      const discovered = await this.discoverFromGameData();

      if (discovered.length > 0) {
        this.logger.info(`✓ Discovered ${discovered.length} maps`, {
          maps: discovered.map(m => m.name).join(', '),
        });
        discovered.forEach(m => this.maps.set(m.name, m));
      } else {
        this.logger.warn('No maps found in game data, using fallback list');
        this.FALLBACK_MAPS.forEach(m => this.maps.set(m.name, m));
      }

      this.mapsLoaded = true;
      return Array.from(this.maps.values());
    } catch (error) {
      this.logger.warn('Map discovery failed, using fallback list', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Use fallback maps
      this.FALLBACK_MAPS.forEach(m => this.maps.set(m.name, m));
      this.mapsLoaded = true;

      return Array.from(this.maps.values());
    }
  }

  /**
   * Discover maps from 0 A.D. installation
   */
  private async discoverFromGameData(): Promise<MapInfo[]> {
    const maps: MapInfo[] = [];

    // Check if game data path exists
    if (!fs.existsSync(this.gameDataPath)) {
      this.logger.warn('Game data path not found', { path: this.gameDataPath });
      return [];
    }

    // Look for maps in multiple directories
    const mapDirs = ['skirmishes', 'random_maps'];

    for (const mapDir of mapDirs) {
      const mapPath = path.join(this.gameDataPath, mapDir);

      if (!fs.existsSync(mapPath)) {
        this.logger.debug(`Map directory not found: ${mapDir}`);
        continue;
      }

      try {
        const files = fs.readdirSync(mapPath);

        for (const file of files) {
          // Map directories contain .pmp files
          if (file.endsWith('.pmp')) {
            const mapName = file.replace('.pmp', '');
            const players = this.extractPlayerCount(mapName);

            maps.push({
              name: mapName,
              displayName: this.formatMapName(mapName),
              filePath: `${mapDir}/${mapName}`,
              players,
              isBuiltin: this.isBuiltinMap(mapName),
            });
          }
        }
      } catch (error) {
        this.logger.debug(`Error reading map directory ${mapDir}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Sort by name for consistent output
    maps.sort((a, b) => a.name.localeCompare(b.name));
    return maps;
  }

  /**
   * Extract player count from map name (e.g., 'acropolis_bay_2p' -> 2)
   */
  private extractPlayerCount(mapName: string): number {
    const match = mapName.match(/_(\d+)p$/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    // Default to 2 if player count can't be determined
    return 2;
  }

  /**
   * Format map name for display (e.g., 'acropolis_bay_2p' -> 'Acropolis Bay')
   */
  private formatMapName(mapName: string): string {
    return mapName
      .replace(/_\d+p$/, '') // Remove player count suffix
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Check if this is a built-in 0 A.D. map
   */
  private isBuiltinMap(mapName: string): boolean {
    return this.FALLBACK_MAPS.some(m => m.name === mapName);
  }

  /**
   * Get maps for specific player count
   */
  async getMapsForPlayerCount(players: number): Promise<MapInfo[]> {
    const allMaps = await this.discoverMaps();
    return allMaps.filter(m => m.players === players);
  }

  /**
   * Get all available map names (for rotation system)
   */
  async getAvailableMapNames(): Promise<string[]> {
    const maps = await this.discoverMaps();
    return maps.map(m => m.filePath);
  }

  /**
   * Get random map (optionally filtered by player count)
   * Excluding recently used maps from blacklist
   */
  async getRandomMapAvoidingBlacklist(blacklist?: Set<string>, players?: number): Promise<MapInfo> {
    let availableMaps: MapInfo[];

    if (players) {
      availableMaps = await this.getMapsForPlayerCount(players);
    } else {
      availableMaps = await this.discoverMaps();
    }

    // Filter out blacklisted maps
    if (blacklist && blacklist.size > 0) {
      availableMaps = availableMaps.filter(m => !blacklist.has(m.filePath) && !blacklist.has(m.name));
    }

    if (availableMaps.length === 0) {
      // If all maps are blacklisted, use all available maps
      if (players) {
        availableMaps = await this.getMapsForPlayerCount(players);
      } else {
        availableMaps = await this.discoverMaps();
      }
    }

    if (availableMaps.length === 0) {
      throw new Error(`No maps available${players ? ` for ${players} players` : ''}`);
    }

    const randomIndex = Math.floor(Math.random() * availableMaps.length);
    return availableMaps[randomIndex];
  }

  /**
   * Get random map (optionally filtered by player count)
   */
  async getRandomMap(players?: number): Promise<MapInfo> {
    return this.getRandomMapAvoidingBlacklist(undefined, players);
  }

  /**
   * Get map by name
   */
  async getMap(name: string): Promise<MapInfo | null> {
    const maps = await this.discoverMaps();
    return maps.find(m => m.name === name) || null;
  }

  /**
   * Export all available maps as list
   */
  async exportMaps(): Promise<Record<string, any>> {
    const maps = await this.discoverMaps();

    return {
      total: maps.length,
      maps: maps.map(m => ({
        name: m.name,
        displayName: m.displayName,
        filePath: m.filePath,
        players: m.players,
        isBuiltin: m.isBuiltin,
      })),
    };
  }
}
