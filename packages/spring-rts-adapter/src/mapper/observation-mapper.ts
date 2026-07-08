import type { WorldObservation } from '@ai-commander/brain';

export interface SpringGameState {
  readonly tick: number;
  readonly gameTime: number;
  readonly playerStats: Record<string, {
    readonly unitCount: number;
    readonly metalUsage: number;
    readonly energyUsage: number;
    readonly metalIncome: number;
    readonly energyIncome: number;
  }>;
  readonly map: {
    readonly width: number;
    readonly height: number;
    readonly name: string;
  };
  readonly units: Array<{
    readonly id: number;
    readonly playerId: number;
    readonly unitDefId: string;
    readonly x: number;
    readonly y: number;
    readonly health: number;
    readonly maxHealth: number;
  }>;
}

export class ObservationMapper {
  static mapToWorldObservation(
    gameState: SpringGameState,
    playerId: number,
    playerName: string
  ): WorldObservation {
    const playerUnits = gameState.units.filter(u => u.playerId === playerId);
    const enemyUnits = gameState.units.filter(u => u.playerId !== playerId);
    const playerStats = gameState.playerStats[playerId] || {
      unitCount: 0,
      metalUsage: 0,
      energyUsage: 0,
      metalIncome: 0,
      energyIncome: 0,
    };

    return {
      tick: gameState.tick,
      timestamp: Date.now(),
      missionId: 'spring-game',
      agentId: String(playerId),
      agentName: playerName,
      agentPosition: {
        x: gameState.map.width / 2,
        y: gameState.map.height / 2,
      },
      agentHealth: 100,
      friendlyUnits: playerUnits.map(u => ({
        id: String(u.id),
        name: u.unitDefId,
        type: 'unit',
        position: { x: u.x, y: u.y },
        health: u.health,
      })),
      enemyUnits: enemyUnits.map(u => ({
        id: String(u.id),
        type: 'unit',
        position: { x: u.x, y: u.y },
        health: u.health,
        threat: 0.5,
      })),
      resources: [
        {
          type: 'metal',
          amount: playerStats.metalIncome,
        },
        {
          type: 'energy',
          amount: playerStats.energyIncome,
        },
      ],
      structures: [],
      visibility: {
        explored: Math.round((gameState.map.width * gameState.map.height) * 0.8),
        visible: Math.round((gameState.map.width * gameState.map.height) * 0.6),
        totalMap: gameState.map.width * gameState.map.height,
        visibleEnemyCount: enemyUnits.length,
        visibleResourceCount: 0,
      },
    };
  }
}
