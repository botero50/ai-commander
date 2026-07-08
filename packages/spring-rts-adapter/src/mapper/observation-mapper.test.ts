import { describe, it, expect } from 'vitest';
import { ObservationMapper, type SpringGameState } from './observation-mapper.js';

const mockGameState: SpringGameState = {
  tick: 100,
  gameTime: 10000,
  playerStats: {
    1: {
      unitCount: 5,
      metalUsage: 10,
      energyUsage: 5,
      metalIncome: 20,
      energyIncome: 15,
    },
    2: {
      unitCount: 4,
      metalUsage: 8,
      energyUsage: 4,
      metalIncome: 18,
      energyIncome: 14,
    },
  },
  map: {
    width: 256,
    height: 256,
    name: 'Desert',
  },
  units: [
    {
      id: 1,
      playerId: 1,
      unitDefId: 'armcom',
      x: 100,
      y: 100,
      health: 1500,
      maxHealth: 1500,
    },
    {
      id: 2,
      playerId: 1,
      unitDefId: 'armpeewee',
      x: 110,
      y: 100,
      health: 120,
      maxHealth: 120,
    },
    {
      id: 3,
      playerId: 2,
      unitDefId: 'corcom',
      x: 150,
      y: 150,
      health: 1500,
      maxHealth: 1500,
    },
  ],
};

describe('ObservationMapper', () => {
  it('should map game state to world observation', () => {
    const observation = ObservationMapper.mapToWorldObservation(mockGameState, 1, 'ARM');

    expect(observation.tick).toBe(100);
    expect(observation.agentId).toBe('1');
    expect(observation.agentName).toBe('ARM');
  });

  it('should include correct agent position', () => {
    const observation = ObservationMapper.mapToWorldObservation(mockGameState, 1, 'ARM');

    expect(observation.agentPosition.x).toBe(128);
    expect(observation.agentPosition.y).toBe(128);
  });

  it('should filter friendly units correctly', () => {
    const observation = ObservationMapper.mapToWorldObservation(mockGameState, 1, 'ARM');

    expect(observation.friendlyUnits).toHaveLength(2);
    expect(observation.friendlyUnits[0].id).toBe('1');
    expect(observation.friendlyUnits[1].id).toBe('2');
  });

  it('should filter enemy units correctly', () => {
    const observation = ObservationMapper.mapToWorldObservation(mockGameState, 1, 'ARM');

    expect(observation.enemyUnits).toHaveLength(1);
    expect(observation.enemyUnits[0].id).toBe('3');
  });

  it('should include correct resources', () => {
    const observation = ObservationMapper.mapToWorldObservation(mockGameState, 1, 'ARM');

    expect(observation.resources).toHaveLength(2);
    expect(observation.resources[0].type).toBe('metal');
    expect(observation.resources[0].amount).toBe(20);
    expect(observation.resources[1].type).toBe('energy');
    expect(observation.resources[1].amount).toBe(15);
  });

  it('should calculate visibility stats', () => {
    const observation = ObservationMapper.mapToWorldObservation(mockGameState, 1, 'ARM');

    const totalMap = 256 * 256;
    expect(observation.visibility.explored).toBe(Math.round(totalMap * 0.8));
    expect(observation.visibility.visible).toBe(Math.round(totalMap * 0.6));
    expect(observation.visibility.totalMap).toBe(totalMap);
    expect(observation.visibility.visibleEnemyCount).toBe(1);
  });

  it('should handle missing player stats', () => {
    const gameState: SpringGameState = {
      ...mockGameState,
      playerStats: {},
    };

    const observation = ObservationMapper.mapToWorldObservation(gameState, 99, 'Unknown');

    expect(observation.resources[0].amount).toBe(0);
    expect(observation.resources[1].amount).toBe(0);
  });

  it('should map enemy units with threat value', () => {
    const observation = ObservationMapper.mapToWorldObservation(mockGameState, 1, 'ARM');

    expect(observation.enemyUnits[0].threat).toBe(0.5);
  });
});
