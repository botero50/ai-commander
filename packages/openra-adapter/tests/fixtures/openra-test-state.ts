import type {
  OpenRAGameState,
  OpenRAWorld,
  OpenRAActor,
  OpenRAPlayer,
  OpenRALocation,
} from '../../src/types/openra-state.js';

/**
 * Test fixtures for OpenRA game state.
 * Used to generate deterministic, reproducible test scenarios.
 */

export function createTestOpenRALocation(x: number, y: number): OpenRALocation {
  return { x, y };
}

export function createTestOpenRAPlayer(
  index: number,
  playerName: string,
  faction: string = 'gdi',
  teamId: number = -1,
  isBot: boolean = false
): OpenRAPlayer {
  return {
    index,
    clientIndex: index,
    playerName,
    color: 0xff000000 + (index * 0x00111111),
    faction,
    isBot,
    isObserver: false,
    isAlive: true,
    teamId,
    cash: 5000,
    resources: 2500,
  };
}

export function createTestOpenRAActor(
  actorID: number,
  actorType: string,
  owner: OpenRAPlayer,
  location: OpenRALocation | undefined = undefined,
  health: number = 100,
  maxHealth: number = 100,
  isIdle: boolean = false
): OpenRAActor {
  return {
    actorID,
    owner,
    info: {
      name: actorType,
      traits: ['Buildable', 'Selectable', 'Health', 'Render'],
    },
    location,
    centerLocation: location ? { x: location.x + 512, y: location.y + 512 } : undefined,
    health,
    maxHealth,
    isIdle,
  };
}

export function createTestOpenRAGameState(
  tick: number = 0,
  players: readonly OpenRAPlayer[] = [createTestOpenRAPlayer(0, 'Human', 'gdi')],
  actors: readonly OpenRAActor[] = [],
  mapName: string = 'GDI01.mpr',
  mapWidth: number = 128,
  mapHeight: number = 128
): OpenRAGameState {
  return {
    world: {
      tick,
      frameNumber: tick,
      actors,
      players,
      map: {
        name: mapName,
        bounds: {
          left: 0,
          top: 0,
          width: mapWidth,
          height: mapHeight,
        },
        terrain: {
          tileset: 'DESERT',
        },
      },
    },
    orderManager: {
      orderQueue: [],
      localFrameNumber: tick,
    },
    modData: {
      tileset: new Map([['DESERT', { id: 'DESERT', name: 'Desert' }]]),
    },
  };
}

export function createTestGameStateWithUnits(tick: number = 0): OpenRAGameState {
  const gdiPlayer = createTestOpenRAPlayer(0, 'GDI', 'gdi');
  const nodPlayer = createTestOpenRAPlayer(1, 'NOD', 'nod', 1);

  const actors: OpenRAActor[] = [
    createTestOpenRAActor(1, 'mcv', gdiPlayer, createTestOpenRALocation(0, 0), 100, 100),
    createTestOpenRAActor(2, 'medium-tank', gdiPlayer, createTestOpenRALocation(512, 512), 100, 100),
    createTestOpenRAActor(3, 'ranger', gdiPlayer, createTestOpenRALocation(256, 256), 60, 100, true),
    createTestOpenRAActor(4, 'medium-tank', nodPlayer, createTestOpenRALocation(1024, 1024), 75, 100),
    createTestOpenRAActor(5, 'buggy', nodPlayer, createTestOpenRALocation(768, 768), 40, 80),
  ];

  return createTestOpenRAGameState(tick, [gdiPlayer, nodPlayer], actors, 'GDI01.mpr', 128, 128);
}

export function createTestGameStateVariousTicks(): OpenRAGameState[] {
  return [
    createTestGameStateWithUnits(0),
    createTestGameStateWithUnits(25),
    createTestGameStateWithUnits(50),
    createTestGameStateWithUnits(100),
  ];
}

export function createTestGameStateMultiplePlayers(): OpenRAGameState {
  const gdiPlayer = createTestOpenRAPlayer(0, 'GDI Alpha', 'gdi', 0);
  const gdiAllyPlayer = createTestOpenRAPlayer(1, 'GDI Beta', 'gdi', 0);
  const nodPlayer = createTestOpenRAPlayer(2, 'NOD Prime', 'nod', 1);
  const nodAllyPlayer = createTestOpenRAPlayer(3, 'NOD Cyborg', 'nod', 1);

  const actors: OpenRAActor[] = [
    // GDI team
    createTestOpenRAActor(1, 'mcv', gdiPlayer, createTestOpenRALocation(0, 0)),
    createTestOpenRAActor(2, 'medium-tank', gdiAllyPlayer, createTestOpenRALocation(256, 256)),
    // NOD team
    createTestOpenRAActor(3, 'medium-tank', nodPlayer, createTestOpenRALocation(1024, 1024)),
    createTestOpenRAActor(4, 'bugeye', nodAllyPlayer, createTestOpenRALocation(768, 768)),
  ];

  return createTestOpenRAGameState(0, [gdiPlayer, gdiAllyPlayer, nodPlayer, nodAllyPlayer], actors);
}

export function createTestGameStateWithDamagedUnits(): OpenRAGameState {
  const gdiPlayer = createTestOpenRAPlayer(0, 'GDI', 'gdi');

  const actors: OpenRAActor[] = [
    createTestOpenRAActor(1, 'medium-tank', gdiPlayer, createTestOpenRALocation(0, 0), 100, 100),
    createTestOpenRAActor(2, 'medium-tank', gdiPlayer, createTestOpenRALocation(256, 256), 50, 100),
    createTestOpenRAActor(3, 'medium-tank', gdiPlayer, createTestOpenRALocation(512, 512), 1, 100),
  ];

  return createTestOpenRAGameState(0, [gdiPlayer], actors);
}
