import type { WorldState } from '@ai-commander/domain';

export interface InfluenceMap {
  readonly tick: number;
  readonly friendlyInfluence: readonly InfluenceGrid;
  readonly enemyInfluence: readonly InfluenceGrid;
  readonly dangerMap: readonly InfluenceGrid;
  readonly safeRegions: readonly SafeRegion[];
  readonly attackOpportunities: readonly AttackOpportunity[];
}

export interface InfluenceGrid {
  readonly width: number;
  readonly height: number;
  readonly values: readonly (readonly number[])[];
}

export interface SafeRegion {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly safetyScore: number;
}

export interface AttackOpportunity {
  readonly x: number;
  readonly y: number;
  readonly advantageScore: number;
  readonly vulnerabilityScore: number;
}

export class InfluenceMapper {
  analyzeInfluence(tick: number, world: WorldState): InfluenceMap {
    const width = 50;
    const height = 50;

    const friendlyInfluence = this.computeFriendlyInfluence(world, width, height);
    const enemyInfluence = this.computeEnemyInfluence(world, width, height);
    const dangerMap = this.computeDangerMap(friendlyInfluence, enemyInfluence, width, height);
    const safeRegions = this.detectSafeRegions(dangerMap, width, height);
    const attackOpportunities = this.detectAttackOpportunities(
      friendlyInfluence,
      enemyInfluence,
      width,
      height
    );

    return {
      tick,
      friendlyInfluence,
      enemyInfluence,
      dangerMap,
      safeRegions,
      attackOpportunities,
    };
  }

  private computeFriendlyInfluence(world: WorldState, width: number, height: number): InfluenceGrid {
    const values: number[][] = Array(height)
      .fill(null)
      .map(() => Array(width).fill(0));

    const agents = world.agents ?? [];
    for (const agent of agents) {
      const pos = agent.customData?.position;
      if (typeof pos === 'string') {
        const match = pos.match(/^(\d+),(\d+)$/);
        if (match && match[1] && match[2]) {
          const x = parseInt(match[1], 10);
          const y = parseInt(match[2], 10);
          this.spreadInfluence(values, x, y, 1.0, width, height);
        }
      }
    }

    return { width, height, values };
  }

  private computeEnemyInfluence(world: WorldState, width: number, height: number): InfluenceGrid {
    const values: number[][] = Array(height)
      .fill(null)
      .map(() => Array(width).fill(0));

    const enemies = (world as any).enemies ?? [];
    for (const enemy of enemies) {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      this.spreadInfluence(values, x, y, 0.8, width, height);
    }

    return { width, height, values };
  }

  private computeDangerMap(
    friendlyInfluence: InfluenceGrid,
    enemyInfluence: InfluenceGrid,
    width: number,
    height: number
  ): InfluenceGrid {
    const values: number[][] = Array(height)
      .fill(null)
      .map(() => Array(width).fill(0));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const friendly = friendlyInfluence.values[y]?.[x] ?? 0;
        const enemy = enemyInfluence.values[y]?.[x] ?? 0;

        if (friendly > 0) {
          values[y][x] = Math.max(0, (enemy - friendly) / (enemy + friendly + 1));
        } else {
          values[y][x] = Math.min(1, enemy);
        }
      }
    }

    return { width, height, values };
  }

  private detectSafeRegions(dangerMap: InfluenceGrid, width: number, height: number): readonly SafeRegion[] {
    const regions: SafeRegion[] = [];
    const visited = new Set<string>();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const key = `${x},${y}`;
        if (visited.has(key)) continue;

        const danger = dangerMap.values[y]?.[x] ?? 0;
        if (danger < 0.3) {
          const safetyScore = 1.0 - danger;
          regions.push({ x, y, radius: 5, safetyScore });
          visited.add(key);
        }
      }
    }

    return regions.sort((a, b) => b.safetyScore - a.safetyScore).slice(0, 5);
  }

  private detectAttackOpportunities(
    friendlyInfluence: InfluenceGrid,
    enemyInfluence: InfluenceGrid,
    width: number,
    height: number
  ): readonly AttackOpportunity[] {
    const opportunities: AttackOpportunity[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const friendly = friendlyInfluence.values[y]?.[x] ?? 0;
        const enemy = enemyInfluence.values[y]?.[x] ?? 0;

        if (friendly > 0 && enemy > 0) {
          const advantage = friendly - enemy;
          const vulnerability = Math.max(0, enemy - friendly);

          if (advantage > 0.2) {
            opportunities.push({
              x,
              y,
              advantageScore: Math.min(advantage, 1.0),
              vulnerabilityScore: Math.min(vulnerability, 1.0),
            });
          }
        }
      }
    }

    return opportunities.sort((a, b) => b.advantageScore - a.advantageScore).slice(0, 10);
  }

  private spreadInfluence(
    grid: number[][],
    centerX: number,
    centerY: number,
    strength: number,
    width: number,
    height: number
  ): void {
    const radius = 8;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;

        if (x >= 0 && x < width && y >= 0 && y < height) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          const falloff = Math.max(0, 1 - distance / radius);
          grid[y][x] = Math.max(grid[y][x], strength * falloff);
        }
      }
    }
  }
}
