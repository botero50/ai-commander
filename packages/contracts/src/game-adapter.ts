/**
 * Game Adapter Contract
 *
 * Defines the interface for plugging in new games.
 * Implementations: ChessAdapter, CheckersAdapter, OpenRAAdapter, etc.
 */

export interface GameCommand {
  playerId: number;
  type: string;
  [key: string]: unknown;
}

export interface GameState {
  tick: number;
  gameOver: boolean;
  winner?: number;
  players: Array<{ id: number; name: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface GameConfig {
  [key: string]: unknown;
}

export interface GameProcess {
  pid: number;
  isRunning: boolean;
}

export interface GameAdapter {
  readonly gameId: string;

  launchGame(config: GameConfig): Promise<GameProcess>;
  executeCommands(commands: GameCommand[]): Promise<void>;
  getGameState(): Promise<GameState>;
  mapToWorldState(rawState: unknown): Promise<Record<string, unknown>>;
  isGameOver(state: GameState): boolean;
  shutdown(): Promise<void>;
}
