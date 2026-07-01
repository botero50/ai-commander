/**
 * OpenRA world state as exposed by the Game engine.
 * These are the raw types we read from OpenRA without modification.
 */

export interface OpenRAGameState {
  readonly world: OpenRAWorld;
  readonly orderManager: OpenRAOrderManager;
  readonly modData: OpenRAModData;
}

export interface OpenRAWorld {
  readonly tick: number;
  readonly frameNumber: number;
  readonly actors: readonly OpenRAActor[];
  readonly players: readonly OpenRAPlayer[];
  readonly map: OpenRAMap;
}

export interface OpenRAActor {
  readonly actorID: number;
  readonly owner: OpenRAPlayer;
  readonly info: OpenRAActorInfo;
  readonly location: OpenRALocation | undefined;
  readonly centerLocation: OpenRALocation | undefined;
  readonly health: number | undefined;
  readonly maxHealth: number | undefined;
  readonly isIdle: boolean;
}

export interface OpenRALocation {
  readonly x: number;
  readonly y: number;
}

export interface OpenRAActorInfo {
  readonly name: string;
  readonly traits: readonly string[];
}

export interface OpenRAPlayer {
  readonly index: number;
  readonly clientIndex: number;
  readonly playerName: string;
  readonly color: number;
  readonly faction: string;
  readonly isBot: boolean;
  readonly isObserver: boolean;
  readonly isAlive: boolean;
  readonly teamId: number;
  readonly cash: number;
  readonly resources: number;
}

export interface OpenRAMap {
  readonly name: string;
  readonly bounds: OpenRABounds;
  readonly terrain: OpenRATerrain;
}

export interface OpenRABounds {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface OpenRATerrain {
  readonly tileset: string;
}

export interface OpenRAOrderManager {
  readonly orderQueue: readonly OpenRAOrder[];
  readonly localFrameNumber: number;
}

export interface OpenRAOrder {
  readonly orderType: string;
  readonly actorID: number;
  readonly targetActor: number | undefined;
  readonly targetPosition: OpenRALocation | undefined;
}

export interface OpenRAModData {
  readonly tileset: Map<string, OpenRATilesetInfo>;
}

export interface OpenRATilesetInfo {
  readonly id: string;
  readonly name: string;
}
