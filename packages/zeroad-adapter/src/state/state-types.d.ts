export interface Position {
    x: number;
    z: number;
}
export interface Unit {
    id: number;
    owner: number;
    type: string;
    position: Position;
    health: number;
    maxHealth: number;
    stance?: string;
    orders?: string[];
}
export interface Building {
    id: number;
    owner: number;
    type: string;
    position: Position;
    health: number;
    maxHealth: number;
    production?: string[];
    garrisoned?: number[];
}
export interface Resources {
    food: number;
    wood: number;
    stone: number;
    metal: number;
}
export interface Player {
    id: number;
    name: string;
    civ: string;
    color: string;
    resources: Resources;
    populationCurrent: number;
    populationMax: number;
    diplomacy: Record<number, string>;
}
export interface MapInfo {
    width: number;
    height: number;
    terrain: string;
}
export interface GameState {
    tick: number;
    timestamp: number;
    players: Player[];
    units: Unit[];
    buildings: Building[];
    map: MapInfo;
}
//# sourceMappingURL=state-types.d.ts.map