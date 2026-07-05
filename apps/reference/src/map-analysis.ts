import type { WorldState } from '@ai-commander/domain';

export interface MapAnalysis {
  readonly tick: number;
  readonly chokepoints: readonly Chokepoint[];
  readonly expansionLocations: readonly ExpansionLocation[];
  readonly highValueTerrain: readonly HighValueTile[];
  readonly strategicRoutes: readonly StrategicRoute[];
}

export interface Chokepoint {
  readonly x: number;
  readonly y: number;
  readonly controllingFaction: 'friendly' | 'enemy' | 'neutral';
  readonly criticalityScore: number;
  readonly accessibleRegions: number;
}

export interface ExpansionLocation {
  readonly x: number;
  readonly y: number;
  readonly viability: number;
  readonly defenseScore: number;
  readonly resourceScore: number;
  readonly distanceFromFriendly: number;
  readonly threatLevel: number;
}

export interface HighValueTile {
  readonly x: number;
  readonly y: number;
  readonly valueType: 'choke' | 'vantage' | 'resource' | 'passage';
  readonly value: number;
}

export interface StrategicRoute {
  readonly id: string;
  readonly waypoints: readonly { x: number; y: number }[];
  readonly purpose: 'supply' | 'flanking' | 'escape' | 'advance';
  readonly riskLevel: number;
}

export class MapAnalyzer {
  analyzeMap(tick: number, world: WorldState): MapAnalysis {
    if (!this.hasValidTerrain(world)) {
      return {
        tick,
        chokepoints: [],
        expansionLocations: [],
        highValueTerrain: [],
        strategicRoutes: [],
      };
    }

    const terrain = (world.customData?.terrain as any[]) ?? [];
    const chokepoints = this.detectChokepoints(terrain);
    const expansionLocations = this.detectExpansionLocations(terrain, chokepoints);
    const highValueTerrain = this.detectHighValueTerrain(terrain, chokepoints);
    const strategicRoutes = this.detectStrategicRoutes(terrain, chokepoints);

    return {
      tick,
      chokepoints,
      expansionLocations,
      highValueTerrain,
      strategicRoutes,
    };
  }

  private hasValidTerrain(world: WorldState): boolean {
    return Array.isArray(world.customData?.terrain);
  }

  private detectChokepoints(terrain: any[]): readonly Chokepoint[] {
    const result: Chokepoint[] = [];
    const height = terrain.length;
    const width = terrain[0]?.length ?? 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const neighbors = this.getWalkableNeighbors(terrain, x, y);
        if (neighbors.length === 2) {
          const controllingFaction = this.getControllingFaction(terrain, x, y);

          result.push({
            x,
            y,
            controllingFaction,
            criticalityScore: neighbors.length / 4,
            accessibleRegions: neighbors.length,
          });
        }
      }
    }

    return result;
  }

  private detectExpansionLocations(
    terrain: any[],
    chokepoints: readonly Chokepoint[]
  ): readonly ExpansionLocation[] {
    const result: ExpansionLocation[] = [];
    const height = terrain.length;
    const width = terrain[0]?.length ?? 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const defenseScore = this.calculateDefenseScore(terrain, x, y, chokepoints);
        const resourceScore = 0.3;
        const friendlyDistance = this.nearestFriendlyDistance(terrain, x, y);
        const threatLevel = this.calculateThreatLevel(terrain, x, y);

        if (defenseScore > 0.3 || resourceScore > 0.3) {
          result.push({
            x,
            y,
            viability: defenseScore * 0.5 + resourceScore * 0.5,
            defenseScore,
            resourceScore,
            distanceFromFriendly: friendlyDistance,
            threatLevel,
          });
        }
      }
    }

    return result.sort((a, b) => b.viability - a.viability).slice(0, 5);
  }

  private detectHighValueTerrain(
    terrain: any[],
    chokepoints: readonly Chokepoint[]
  ): readonly HighValueTile[] {
    const result: HighValueTile[] = [];
    const chokeTiles = new Set(chokepoints.map((c) => `${c.x},${c.y}`));
    const height = terrain.length;
    const width = terrain[0]?.length ?? 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (chokeTiles.has(`${x},${y}`)) {
          result.push({ x, y, valueType: 'choke', value: 1.0 });
        } else if (this.isVantagePoint(terrain, x, y)) {
          result.push({ x, y, valueType: 'vantage', value: 0.8 });
        } else if (this.isPassage(terrain, x, y)) {
          result.push({ x, y, valueType: 'passage', value: 0.6 });
        }
      }
    }

    return result.sort((a, b) => b.value - a.value).slice(0, 10);
  }

  private detectStrategicRoutes(
    terrain: any[],
    chokepoints: readonly Chokepoint[]
  ): readonly StrategicRoute[] {
    const routes: StrategicRoute[] = [];

    const friendlyPos = this.findFriendlyBaseCenter(terrain);
    const enemyPos = this.findEnemyBaseCenter(terrain);

    if (friendlyPos && enemyPos) {
      routes.push({
        id: 'advance-route',
        waypoints: this.findPath(terrain, friendlyPos, enemyPos),
        purpose: 'advance',
        riskLevel: 0.5,
      });

      const flankRoute = this.findFlankRoute(terrain, friendlyPos, enemyPos);
      if (flankRoute.length > 0) {
        routes.push({
          id: 'flank-route',
          waypoints: flankRoute,
          purpose: 'flanking',
          riskLevel: 0.7,
        });
      }

      const escapeRoute = this.findEscapeRoute(terrain, friendlyPos);
      if (escapeRoute.length > 0) {
        routes.push({
          id: 'escape-route',
          waypoints: escapeRoute,
          purpose: 'escape',
          riskLevel: 0.3,
        });
      }
    }

    return routes;
  }

  private getWalkableNeighbors(terrain: any[], x: number, y: number): { x: number; y: number }[] {
    const neighbors = [];
    const directions = [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: 0, y: 1 },
    ];

    const height = terrain.length;
    const width = terrain[0]?.length ?? 0;

    for (const dir of directions) {
      const nx = x + dir.x;
      const ny = y + dir.y;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        neighbors.push({ x: nx, y: ny });
      }
    }

    return neighbors;
  }

  private getControllingFaction(terrain: any[], x: number, y: number): 'friendly' | 'enemy' | 'neutral' {
    return 'neutral';
  }

  private calculateDefenseScore(
    terrain: any[],
    x: number,
    y: number,
    chokepoints: readonly Chokepoint[]
  ): number {
    let score = 0;
    const nearChoke = chokepoints.some((c) => Math.abs(c.x - x) + Math.abs(c.y - y) <= 3);
    if (nearChoke) score += 0.4;

    const neighbors = this.getWalkableNeighbors(terrain, x, y);
    score += Math.min(neighbors.length / 4, 0.3);

    return Math.min(score, 1.0);
  }

  private nearestFriendlyDistance(terrain: any[], x: number, y: number): number {
    return Math.random() * 20;
  }

  private calculateThreatLevel(terrain: any[], x: number, y: number): number {
    return Math.random() * 0.5;
  }

  private isVantagePoint(terrain: any[], x: number, y: number): boolean {
    const neighbors = this.getWalkableNeighbors(terrain, x, y);
    return neighbors.length >= 3;
  }

  private isPassage(terrain: any[], x: number, y: number): boolean {
    const neighbors = this.getWalkableNeighbors(terrain, x, y);
    return neighbors.length === 2;
  }

  private findFriendlyBaseCenter(terrain: any[]): { x: number; y: number } | null {
    const height = terrain.length;
    const width = terrain[0]?.length ?? 0;
    return height > 0 && width > 0 ? { x: Math.floor(width / 4), y: Math.floor(height / 4) } : null;
  }

  private findEnemyBaseCenter(terrain: any[]): { x: number; y: number } | null {
    const height = terrain.length;
    const width = terrain[0]?.length ?? 0;
    return height > 0 && width > 0 ? { x: Math.floor((3 * width) / 4), y: Math.floor((3 * height) / 4) } : null;
  }

  private findPath(
    terrain: any[],
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): { x: number; y: number }[] {
    const path = [start];
    let current = { x: start.x, y: start.y };
    const maxSteps = 50;
    let steps = 0;

    while (
      steps < maxSteps &&
      (current.x !== end.x || current.y !== end.y)
    ) {
      const dx = end.x > current.x ? 1 : end.x < current.x ? -1 : 0;
      const dy = end.y > current.y ? 1 : end.y < current.y ? -1 : 0;

      current = { x: current.x + dx, y: current.y + dy };
      path.push(current);
      steps++;
    }

    return path;
  }

  private findFlankRoute(
    terrain: any[],
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): { x: number; y: number }[] {
    const midX = Math.floor((start.x + end.x) / 2);
    const midY = Math.floor((start.y + end.y) / 2);
    const flankPoint = { x: midX + 10, y: midY };

    return this.findPath(terrain, start, flankPoint).concat(
      this.findPath(terrain, flankPoint, end)
    );
  }

  private findEscapeRoute(
    terrain: any[],
    from: { x: number; y: number }
  ): { x: number; y: number }[] {
    const route = [];
    let current = from;

    for (let i = 0; i < 10; i++) {
      current = { x: current.x - 1, y: current.y };
      route.push(current);
    }

    return route;
  }
}
