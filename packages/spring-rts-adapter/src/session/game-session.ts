import type { GameSession, GameCapabilities, ObservationProvider, CommandExecutor } from '@ai-commander/adapter';
import type { WorldState } from '@ai-commander/domain';
import type { Brain, WorldObservation, GoalOption, CommandOption, ExecutionMemory } from '@ai-commander/brain';
import type { GameProcess } from '../types/game-process.js';
import type { IPCBridge } from '../types/ipc-bridge.js';
import { ObservationMapper, type SpringGameState } from '../mapper/observation-mapper.js';

export interface GameSessionConfig {
  readonly sessionId: string;
  readonly map: string;
  readonly players: ReadonlyArray<{ readonly name: string; readonly brain: Brain }>;
}

export class SpringRTSGameSession implements GameSession {
  readonly sessionId: string;
  readonly capabilities: GameCapabilities;
  readonly observationProvider: ObservationProvider;
  readonly commandExecutor: CommandExecutor;
  private gameProcess: GameProcess;
  private ipcBridge: IPCBridge;
  private brains: readonly Brain[];
  private currentTick = 0;
  private gameState: SpringGameState | null = null;
  private isRunning = false;
  private sessionConfig: GameSessionConfig;

  constructor(
    sessionId: string,
    capabilities: GameCapabilities,
    gameProcess: GameProcess,
    ipcBridge: IPCBridge,
    config: GameSessionConfig,
    brains: readonly Brain[],
    observationProvider?: ObservationProvider,
    commandExecutor?: CommandExecutor
  ) {
    this.sessionId = sessionId;
    this.capabilities = capabilities;
    this.observationProvider = observationProvider || ({} as ObservationProvider);
    this.commandExecutor = commandExecutor || ({} as CommandExecutor);
    this.gameProcess = gameProcess;
    this.ipcBridge = ipcBridge;
    this.brains = brains;
    this.sessionConfig = config;
  }

  async start(): Promise<WorldState> {
    if (this.isRunning) {
      throw new Error('Game session already running');
    }

    try {
      await this.ipcBridge.connect();
      this.isRunning = true;

      // Subscribe to game state updates
      this.ipcBridge.onMessage((message) => {
        if (message.type === 'state_update' && message.data) {
          this.gameState = message.data as unknown as SpringGameState;
          this.currentTick = this.gameState.tick;
        }
      });

      // Initialize game
      await this.ipcBridge.request({
        type: 'init_game',
        data: {
          map: this.sessionConfig.map,
          players: this.sessionConfig.players.length,
        },
        timestamp: Date.now(),
      });

      // Return initial world state (stub - requires full WorldState implementation)
      return {
        time: { tick: 0, gameTime: 0 },
        map: { width: 256, height: 256, name: 'DeltaSiegeTactical' },
      } as unknown as WorldState;
    } catch (err) {
      this.isRunning = false;
      throw err;
    }
  }

  async pause(): Promise<void> {
    // Spring RTS doesn't support pause
    throw new Error('Pause not supported by Spring RTS');
  }

  async resume(): Promise<void> {
    // Spring RTS doesn't support pause
    throw new Error('Resume not supported by Spring RTS');
  }

  async isActive(): Promise<boolean> {
    return this.isRunning;
  }


  async stop(): Promise<void> {
    this.isRunning = false;
    await this.ipcBridge.disconnect();
  }

  async executeTickWithBrains(): Promise<void> {
    if (!this.isRunning || !this.gameState) {
      throw new Error('Game session not running or no game state');
    }

    // Get observations for each brain
    const observations = this.brains.map((_, playerId) =>
      ObservationMapper.mapToWorldObservation(
        this.gameState!,
        playerId,
        this.sessionConfig.players[playerId]?.name || `Player ${playerId + 1}`
      )
    );

    // Execute decisions for each brain
    const decisions = await Promise.all(
      this.brains.map((brain, playerId) =>
        this.makeBrainDecision(brain, observations[playerId], playerId)
      )
    );

    // Send commands to game
    for (let i = 0; i < decisions.length; i++) {
      const commands = decisions[i];
      await this.ipcBridge.request({
        type: 'execute_commands',
        data: {
          playerId: i,
          commands,
        },
        timestamp: Date.now(),
      });
    }

    // Advance game tick
    await this.ipcBridge.request({
      type: 'advance_tick',
      data: { tickCount: 1 },
      timestamp: Date.now(),
    });
  }

  async tick(): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Game session not running');
    }

    await this.executeTickWithBrains();
  }

  getObservation(playerId: number): WorldObservation | null {
    if (!this.gameState) {
      return null;
    }

    return ObservationMapper.mapToWorldObservation(
      this.gameState,
      playerId,
      this.sessionConfig.players[playerId]?.name || `Player ${playerId + 1}`
    );
  }

  getGameState(): SpringGameState | null {
    return this.gameState;
  }

  getCurrentTick(): number {
    return this.currentTick;
  }

  isGameOver(): boolean {
    if (!this.gameState) return false;
    // Game ends when one player has no units
    const player1Units = this.gameState.playerStats[1]?.unitCount ?? 0;
    const player2Units = this.gameState.playerStats[2]?.unitCount ?? 0;
    return player1Units === 0 || player2Units === 0;
  }

  private async makeBrainDecision(
    brain: Brain,
    observation: WorldObservation,
    playerId: number
  ): Promise<string[]> {
    try {
      const goals = this.getAvailableGoals();
      const commands = this.getAvailableCommands(playerId);
      const memory = this.getExecutionMemory(playerId);

      const decision = await brain.decide(observation, goals, commands, memory);
      return decision.commands as string[];
    } catch (err) {
      console.error(`Brain ${brain.name} decision failed:`, err);
      return [];
    }
  }

  private getAvailableGoals(): GoalOption[] {
    return [
      {
        id: 'expand',
        intent: 'Expand territory and gather resources',
        priority: 'high',
        feasibility: 0.8,
        expectedDuration: 30,
        estimatedValue: 500,
      },
      {
        id: 'defend',
        intent: 'Defend base from attacks',
        priority: 'high',
        feasibility: 0.9,
        expectedDuration: 10,
        estimatedValue: 1000,
      },
      {
        id: 'attack',
        intent: 'Launch offensive against enemy',
        priority: 'medium',
        feasibility: 0.6,
        expectedDuration: 20,
        estimatedValue: 800,
      },
    ];
  }

  private getAvailableCommands(playerId: number): CommandOption[] {
    return [
      {
        id: 'move',
        action: 'move',
        expectedDuration: 5,
        expectedCost: 0,
        description: 'Move units to target location',
      },
      {
        id: 'attack',
        action: 'attack',
        expectedDuration: 10,
        expectedCost: 0,
        description: 'Attack enemy units or structures',
      },
      {
        id: 'build',
        action: 'build',
        expectedDuration: 30,
        expectedCost: 100,
        description: 'Build new structures',
      },
      {
        id: 'gather',
        action: 'gather',
        expectedDuration: 15,
        expectedCost: 0,
        description: 'Gather resources',
      },
      {
        id: 'repair',
        action: 'repair',
        expectedDuration: 20,
        expectedCost: 50,
        description: 'Repair damaged units or structures',
      },
    ];
  }

  private getExecutionMemory(playerId: number): ExecutionMemory {
    return {
      recentEvents: [],
      recentDecisions: [],
      metrics: {
        commandsExecuted: 0,
        commandsFailed: 0,
        goalsCompleted: 0,
        goalsAbandoned: 0,
      },
    };
  }
}
