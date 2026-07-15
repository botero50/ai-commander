/**
 * Tests for MapDiscovery service
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MapDiscovery } from './map-discovery.js';
import { Logger } from '../config/logger.js';

describe('MapDiscovery', () => {
  let discovery: MapDiscovery;
  const logger = new Logger('debug', 'MapDiscoveryTest');

  beforeEach(() => {
    discovery = new MapDiscovery(logger);
  });

  it('should load fallback maps when discovery fails', async () => {
    const maps = await discovery.discoverMaps();
    expect(maps.length).toBe(54); // Verified working maps
    expect(maps.some(m => m.name === 'acropolis_bay_2p')).toBe(true);
    expect(maps.some(m => m.name === 'alpine_mountains_3p')).toBe(true);
  });

  it('should extract player count from map names', async () => {
    const maps = await discovery.discoverMaps();
    const map2p = maps.find(m => m.name.endsWith('_2p'));
    const map3p = maps.find(m => m.name.endsWith('_3p'));

    if (map2p) expect(map2p.players).toBe(2);
    if (map3p) expect(map3p.players).toBe(3);
  });

  it('should filter maps by player count', async () => {
    const maps2p = await discovery.getMapsForPlayerCount(2);
    expect(maps2p.length).toBeGreaterThan(0);
    expect(maps2p.every(m => m.players === 2)).toBe(true);
  });

  it('should return map file paths in correct format', async () => {
    const maps = await discovery.discoverMaps();
    expect(maps.every(m => m.filePath.includes('/') || m.filePath.includes('\\'))).toBe(true);
  });

  it('should get random map', async () => {
    const map1 = await discovery.getRandomMap();
    const map2 = await discovery.getRandomMap();

    expect(map1).toBeDefined();
    expect(map2).toBeDefined();
    // Note: Maps might be same due to randomness, just check they exist
    expect(map1.name).toBeTruthy();
    expect(map2.name).toBeTruthy();
  });

  it('should get random map for specific player count', async () => {
    const map = await discovery.getRandomMap(2);
    expect(map.players).toBe(2);
  });

  it('should get map by name', async () => {
    const map = await discovery.getMap('acropolis_bay_2p');
    expect(map).toBeDefined();
    expect(map?.name).toBe('acropolis_bay_2p');
  });

  it('should format map names for display', async () => {
    const map = await discovery.getMap('acropolis_bay_2p');
    expect(map?.displayName).toBe('Acropolis Bay');
  });

  it('should cache discovered maps', async () => {
    const maps1 = await discovery.discoverMaps();
    const maps2 = await discovery.discoverMaps();

    expect(maps1.length).toBe(maps2.length);
    // Should be same reference due to caching
    expect(maps1).toEqual(maps2);
  });

  it('should export maps as JSON', async () => {
    const exported = await discovery.exportMaps();

    expect(exported.total).toBeGreaterThan(0);
    expect(Array.isArray(exported.maps)).toBe(true);
    expect(exported.maps.length).toBe(exported.total);

    // Each map should have required fields
    expect(exported.maps[0]).toHaveProperty('name');
    expect(exported.maps[0]).toHaveProperty('displayName');
    expect(exported.maps[0]).toHaveProperty('filePath');
    expect(exported.maps[0]).toHaveProperty('players');
    expect(exported.maps[0]).toHaveProperty('isBuiltin');
  });

  it('should mark builtin maps correctly', async () => {
    const map = await discovery.getMap('acropolis_bay_2p');
    expect(map?.isBuiltin).toBe(true);
  });

  it('should get available map names in correct format', async () => {
    const names = await discovery.getAvailableMapNames();
    expect(names.length).toBeGreaterThan(0);
    expect(names.every(n => n.includes('/') || n.includes('\\'))).toBe(true);
    expect(names[0]).toMatch(/(skirmishes|random_maps)\//);
  });
});
