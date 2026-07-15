/**
 * Adapter Framework Tests
 *
 * Tests for pluggable game adapter system
 * - Adapter interface compliance
 * - Game lifecycle management
 * - State mapping and translation
 * - Command execution and validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

interface GameCommand {
  playerId: number;
  type: string;
  params: unknown;
}

interface GameStateSnapshot {
  tick: number;
  players: Array<{ id: number; alive: boolean; score: number }>;
  gameOver: boolean;
  winner?: number;
}

interface WorldState {
  currentTick: number;
  playerStates: Array<{ id: number; resources: number; units: number }>;
  mapState: { width: number; height: number };
}

interface AdapterConfig {
  gameType: string;
  maxPlayers: number;
  timeout: number;
}

class MockGameAdapter {
  private config: AdapterConfig;
  private running = false;
  private gameState: GameStateSnapshot;

  constructor(config: AdapterConfig) {
    this.config = config;
    this.gameState = {
      tick: 0,
      players: Array.from({ length: config.maxPlayers }, (_, i) => ({
        id: i + 1,
        alive: true,
        score: 0,
      })),
      gameOver: false,
    };
  }

  async launchGame(): Promise<void> {
    this.running = true;
    this.gameState.tick = 0;
  }

  async shutdown(): Promise<void> {
    this.running = false;
  }

  async executeCommands(commands: GameCommand[]): Promise<void> {
    if (!this.running) throw new Error('Game not running');

    for (const cmd of commands) {
      const player = this.gameState.players.find(p => p.id === cmd.playerId);
      if (player) {
        player.score += 10;
      }
    }

    this.gameState.tick++;

    if (this.gameState.tick > 100) {
      this.gameState.gameOver = true;
      this.gameState.winner = 1;
    }
  }

  async getGameState(): Promise<GameStateSnapshot> {
    return { ...this.gameState };
  }

  mapToWorldState(): WorldState {
    return {
      currentTick: this.gameState.tick,
      playerStates: this.gameState.players.map(p => ({
        id: p.id,
        resources: 1000 + p.score,
        units: 10 + Math.floor(p.score / 5),
      })),
      mapState: { width: 256, height: 256 },
    };
  }

  isGameOver(): boolean {
    return this.gameState.gameOver;
  }

  getConfig(): AdapterConfig {
    return { ...this.config };
  }

  getGameType(): string {
    return this.config.gameType;
  }

  isRunning(): boolean {
    return this.running;
  }

  getTick(): number {
    return this.gameState.tick;
  }

  validateCommand(cmd: GameCommand): boolean {
    if (!this.running) return false;
    if (cmd.playerId < 1 || cmd.playerId > this.config.maxPlayers) return false;
    if (!cmd.type) return false;
    return true;
  }
}

describe('GameAdapter', () => {
  let adapter: MockGameAdapter;
  let config: AdapterConfig;

  beforeEach(() => {
    config = {
      gameType: 'chess',
      maxPlayers: 2,
      timeout: 5000,
    };
    adapter = new MockGameAdapter(config);
  });

  describe('Adapter Initialization', () => {
    it('should initialize with config', () => {
      expect(adapter.getConfig()).toEqual(config);
    });

    it('should store game type', () => {
      expect(adapter.getGameType()).toBe('chess');
    });

    it('should start in non-running state', () => {
      expect(adapter.isRunning()).toBe(false);
    });

    it('should support multi-player games', () => {
      const mpConfig: AdapterConfig = {
        gameType: 'strategy',
        maxPlayers: 8,
        timeout: 10000,
      };
      const mpAdapter = new MockGameAdapter(mpConfig);
      expect(mpAdapter.getConfig().maxPlayers).toBe(8);
    });
  });

  describe('Game Lifecycle', () => {
    it('should launch game', async () => {
      await adapter.launchGame();
      expect(adapter.isRunning()).toBe(true);
    });

    it('should shutdown game', async () => {
      await adapter.launchGame();
      await adapter.shutdown();
      expect(adapter.isRunning()).toBe(false);
    });

    it('should reset tick on launch', async () => {
      await adapter.launchGame();
      expect(adapter.getTick()).toBe(0);
    });

    it('should not allow commands when not running', async () => {
      await expect(
        adapter.executeCommands([{ playerId: 1, type: 'move', params: {} }])
      ).rejects.toThrow();
    });
  });

  describe('Command Execution', () => {
    beforeEach(async () => {
      await adapter.launchGame();
    });

    it('should execute single command', async () => {
      const cmd: GameCommand = {
        playerId: 1,
        type: 'move',
        params: { x: 10, y: 20 },
      };

      await adapter.executeCommands([cmd]);
      expect(adapter.getTick()).toBe(1);
    });

    it('should execute multiple commands', async () => {
      const commands: GameCommand[] = [
        { playerId: 1, type: 'move', params: {} },
        { playerId: 2, type: 'attack', params: {} },
      ];

      await adapter.executeCommands(commands);
      expect(adapter.getTick()).toBe(1);
    });

    it('should validate command player id', () => {
      const validCmd: GameCommand = {
        playerId: 1,
        type: 'move',
        params: {},
      };
      const invalidCmd: GameCommand = {
        playerId: 99,
        type: 'move',
        params: {},
      };

      expect(adapter.validateCommand(validCmd)).toBe(true);
      expect(adapter.validateCommand(invalidCmd)).toBe(false);
    });

    it('should require command type', () => {
      const invalidCmd = {
        playerId: 1,
        type: '',
        params: {},
      };

      expect(adapter.validateCommand(invalidCmd)).toBe(false);
    });
  });

  describe('State Management', () => {
    beforeEach(async () => {
      await adapter.launchGame();
    });

    it('should track game state', async () => {
      const state = await adapter.getGameState();
      expect(state.tick).toBe(0);
      expect(state.gameOver).toBe(false);
    });

    it('should update tick on commands', async () => {
      await adapter.executeCommands([
        { playerId: 1, type: 'move', params: {} },
      ]);

      const state = await adapter.getGameState();
      expect(state.tick).toBe(1);
    });

    it('should track player scores', async () => {
      await adapter.executeCommands([
        { playerId: 1, type: 'move', params: {} },
      ]);

      const state = await adapter.getGameState();
      const player1 = state.players.find(p => p.id === 1);
      expect(player1?.score).toBe(10);
    });

    it('should detect game over', async () => {
      for (let i = 0; i < 101; i++) {
        await adapter.executeCommands([
          { playerId: 1, type: 'move', params: {} },
        ]);
      }

      expect(adapter.isGameOver()).toBe(true);
    });
  });

  describe('State Mapping', () => {
    beforeEach(async () => {
      await adapter.launchGame();
    });

    it('should map to world state', async () => {
      await adapter.executeCommands([
        { playerId: 1, type: 'move', params: {} },
      ]);

      const worldState = adapter.mapToWorldState();
      expect(worldState.currentTick).toBe(1);
      expect(worldState.playerStates).toHaveLength(2);
    });

    it('should track player resources', async () => {
      await adapter.executeCommands([
        { playerId: 1, type: 'move', params: {} },
      ]);

      const worldState = adapter.mapToWorldState();
      const player1 = worldState.playerStates.find(p => p.id === 1);
      expect(player1?.resources).toBeGreaterThan(1000);
    });

    it('should provide map dimensions', () => {
      const worldState = adapter.mapToWorldState();
      expect(worldState.mapState.width).toBe(256);
      expect(worldState.mapState.height).toBe(256);
    });
  });

  describe('Interface Compliance', () => {
    it('should implement required methods', () => {
      expect(typeof adapter.launchGame).toBe('function');
      expect(typeof adapter.shutdown).toBe('function');
      expect(typeof adapter.executeCommands).toBe('function');
      expect(typeof adapter.getGameState).toBe('function');
      expect(typeof adapter.mapToWorldState).toBe('function');
      expect(typeof adapter.isGameOver).toBe('function');
    });

    it('should return correct types', async () => {
      await adapter.launchGame();
      const state = await adapter.getGameState();
      const worldState = adapter.mapToWorldState();

      expect(typeof state.tick).toBe('number');
      expect(Array.isArray(state.players)).toBe(true);
      expect(typeof state.gameOver).toBe('boolean');

      expect(typeof worldState.currentTick).toBe('number');
      expect(Array.isArray(worldState.playerStates)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw when executing commands before launch', async () => {
      await expect(
        adapter.executeCommands([
          { playerId: 1, type: 'move', params: {} },
        ])
      ).rejects.toThrow('Game not running');
    });

    it('should handle invalid commands gracefully', async () => {
      await adapter.launchGame();
      const invalid: GameCommand = {
        playerId: 99,
        type: 'move',
        params: {},
      };

      expect(adapter.validateCommand(invalid)).toBe(false);
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await adapter.launchGame();
    });

    it('should execute 100 commands quickly', async () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        await adapter.executeCommands([
          { playerId: 1, type: 'move', params: {} },
        ]);
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000);
    });

    it('should get game state quickly', async () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        await adapter.getGameState();
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe('Multi-Adapter Support', () => {
    it('should support multiple adapter instances', async () => {
      const adapter2 = new MockGameAdapter({
        gameType: 'checkers',
        maxPlayers: 2,
        timeout: 5000,
      });

      await adapter.launchGame();
      await adapter2.launchGame();

      expect(adapter.getGameType()).toBe('chess');
      expect(adapter2.getGameType()).toBe('checkers');

      expect(adapter.isRunning()).toBe(true);
      expect(adapter2.isRunning()).toBe(true);
    });
  });
});
