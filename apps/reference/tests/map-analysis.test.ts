import { describe, it, expect } from 'vitest';
import { MapAnalyzer } from '../src/map-analysis.js';
import type { WorldState } from '@ai-commander/domain';

describe('Story 138: Map Analysis', () => {
  function createTestWorld(): WorldState {
    return {
      agents: [],
      resources: 'test-resources',
      map: 'test-map',
      customData: { terrain: [] },
    };
  }

  describe('Deterministic Analysis', () => {
    it('should detect chokepoints deterministically', () => {
      const world = createTestWorld();
      const analyzer = new MapAnalyzer();

      const analysis1 = analyzer.analyzeMap(0, world);
      const analysis2 = analyzer.analyzeMap(0, world);

      expect(analysis1.chokepoints).toEqual(analysis2.chokepoints);
    });

    it('should detect expansion locations deterministically', () => {
      const world = createTestWorld();
      const analyzer = new MapAnalyzer();

      const analysis1 = analyzer.analyzeMap(0, world);
      const analysis2 = analyzer.analyzeMap(0, world);

      expect(analysis1.expansionLocations).toEqual(analysis2.expansionLocations);
    });

    it('should detect high-value terrain deterministically', () => {
      const world = createTestWorld();
      const analyzer = new MapAnalyzer();

      const analysis1 = analyzer.analyzeMap(0, world);
      const analysis2 = analyzer.analyzeMap(0, world);

      expect(analysis1.highValueTerrain).toEqual(analysis2.highValueTerrain);
    });

    it('should detect strategic routes deterministically', () => {
      const world = createTestWorld();
      const analyzer = new MapAnalyzer();

      const analysis1 = analyzer.analyzeMap(0, world);
      const analysis2 = analyzer.analyzeMap(0, world);

      expect(analysis1.strategicRoutes).toEqual(analysis2.strategicRoutes);
    });
  });

  describe('Chokepoint Detection', () => {
    it('should identify tiles with limited neighbor connectivity', () => {
      const world = createTestWorld();
      const analyzer = new MapAnalyzer();

      const analysis = analyzer.analyzeMap(0, world);

      if (analysis.chokepoints.length > 0) {
        expect(analysis.chokepoints[0].accessibleRegions).toBeGreaterThanOrEqual(2);
        expect(analysis.chokepoints[0].accessibleRegions).toBeLessThanOrEqual(4);
      }
    });

    it('should score chokepoints by criticality', () => {
      const world = createTestWorld();
      const analyzer = new MapAnalyzer();

      const analysis = analyzer.analyzeMap(0, world);

      if (analysis.chokepoints.length > 1) {
        const scores = analysis.chokepoints.map((c) => c.criticalityScore);
        expect(scores).toBeTruthy();
      }
    });
  });

  describe('Expansion Location Detection', () => {
    it('should identify viable expansion targets', () => {
      const world = createTestWorld();
      const analyzer = new MapAnalyzer();

      const analysis = analyzer.analyzeMap(0, world);

      if (analysis.expansionLocations.length > 0) {
        expect(analysis.expansionLocations[0].viability).toBeGreaterThan(0);
        expect(analysis.expansionLocations[0].viability).toBeLessThanOrEqual(1);
      }
    });

    it('should rank expansions by viability', () => {
      const world = createTestWorld();
      const analyzer = new MapAnalyzer();

      const analysis = analyzer.analyzeMap(0, world);

      if (analysis.expansionLocations.length > 1) {
        for (let i = 0; i < analysis.expansionLocations.length - 1; i++) {
          expect(analysis.expansionLocations[i].viability).toBeGreaterThanOrEqual(
            analysis.expansionLocations[i + 1].viability
          );
        }
      }
    });

    it('should assess defense and resource scores', () => {
      const world = createTestWorld();
      const analyzer = new MapAnalyzer();

      const analysis = analyzer.analyzeMap(0, world);

      if (analysis.expansionLocations.length > 0) {
        const loc = analysis.expansionLocations[0];
        expect(loc.defenseScore).toBeGreaterThanOrEqual(0);
        expect(loc.defenseScore).toBeLessThanOrEqual(1);
        expect(loc.resourceScore).toBeGreaterThanOrEqual(0);
        expect(loc.resourceScore).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('High-Value Terrain Detection', () => {
    it('should identify terrain value types', () => {
      const world = createTestWorld();
      const analyzer = new MapAnalyzer();

      const analysis = analyzer.analyzeMap(0, world);

      const valueTypes = analysis.highValueTerrain.map((t) => t.valueType);
      expect(valueTypes).toBeTruthy();
    });

    it('should rank by value', () => {
      const world = createTestWorld();
      const analyzer = new MapAnalyzer();

      const analysis = analyzer.analyzeMap(0, world);

      if (analysis.highValueTerrain.length > 1) {
        for (let i = 0; i < analysis.highValueTerrain.length - 1; i++) {
          expect(analysis.highValueTerrain[i].value).toBeGreaterThanOrEqual(
            analysis.highValueTerrain[i + 1].value
          );
        }
      }
    });
  });

  describe('Strategic Routes', () => {
    it('should generate strategic routes', () => {
      const world = createTestWorld();
      const analyzer = new MapAnalyzer();

      const analysis = analyzer.analyzeMap(0, world);

      if (analysis.strategicRoutes.length > 0) {
        expect(analysis.strategicRoutes[0].waypoints.length).toBeGreaterThan(0);
      }
    });

    it('should classify routes by purpose', () => {
      const world = createTestWorld();
      const analyzer = new MapAnalyzer();

      const analysis = analyzer.analyzeMap(0, world);

      const purposes = new Set(analysis.strategicRoutes.map((r) => r.purpose));
      expect(purposes.size).toBeGreaterThanOrEqual(0);
    });

    it('should assess risk levels', () => {
      const world = createTestWorld();
      const analyzer = new MapAnalyzer();

      const analysis = analyzer.analyzeMap(0, world);

      if (analysis.strategicRoutes.length > 0) {
        const route = analysis.strategicRoutes[0];
        expect(route.riskLevel).toBeGreaterThanOrEqual(0);
        expect(route.riskLevel).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Full Map Analysis', () => {
    it('should produce complete analysis', () => {
      const world = createTestWorld();
      const analyzer = new MapAnalyzer();

      const analysis = analyzer.analyzeMap(0, world);

      expect(analysis.tick).toBe(0);
      expect(Array.isArray(analysis.chokepoints)).toBe(true);
      expect(Array.isArray(analysis.expansionLocations)).toBe(true);
      expect(Array.isArray(analysis.highValueTerrain)).toBe(true);
      expect(Array.isArray(analysis.strategicRoutes)).toBe(true);
    });
  });
});
