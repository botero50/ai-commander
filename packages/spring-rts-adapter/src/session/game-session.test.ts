import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpringRTSGameSession } from './game-session.js';
import type { GameProcess } from '../types/game-process.js';
import type { IPCBridge } from '../types/ipc-bridge.js';
import type { Brain } from '@ai-commander/brain';

const mockGameProcess: GameProcess = {
  isRunning: true,
  start: vi.fn(),
  stop: vi.fn(),
  send: vi.fn(),
  onMessage: vi.fn(),
  getProcessId: vi.fn(() => 1234),
};

const mockIPCBridge: IPCBridge = {
  isConnected: true,
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
  onMessage: vi.fn(() => () => {}),
  request: vi.fn(),
};

const mockBrain: Brain = {
  name: 'TestBrain',
  version: '1.0',
  decide: vi.fn().mockResolvedValue({
    reasoning: 'Test reasoning',
    selectedGoal: 'test-goal',
    plan: ['step1', 'step2'],
    commands: ['cmd1', 'cmd2'],
    confidence: 0.8,
  }),
};

describe('SpringRTSGameSession', () => {
  let session: SpringRTSGameSession;

  beforeEach(() => {
    vi.clearAllMocks();
    session = new SpringRTSGameSession(
      'session-1',
      {
        supportsPause: false,
        supportsSaveState: false,
        supportsDeterministicMode: true,
        supportsReplay: true,
        supportsCompleteWorldState: true,
        supportsMultipleAgents: true,
        maxTicksPerSecond: 30,
        metadata: {
          name: 'Spring RTS',
          commandTypes: ['move', 'attack'],
          maxPlayers: 16,
        },
      },
      mockGameProcess,
      mockIPCBridge,
      {
        sessionId: 'session-1',
        map: 'DeltaSiegeTactical',
        players: [
          { name: 'Player 1', brain: mockBrain },
          { name: 'Player 2', brain: mockBrain },
        ],
      },
      [mockBrain, mockBrain]
    );
  });

  it('should initialize with session ID', () => {
    expect(session.getSessionId()).toBe('session-1');
  });

  it('should start session and connect IPC', async () => {
    (mockIPCBridge.connect as any).mockResolvedValue(undefined);
    (mockIPCBridge.request as any).mockResolvedValue(undefined);

    await session.start();

    expect(mockIPCBridge.connect).toHaveBeenCalled();
  });

  it('should prevent double start', async () => {
    (mockIPCBridge.connect as any).mockResolvedValue(undefined);
    (mockIPCBridge.request as any).mockResolvedValue(undefined);

    await session.start();
    await expect(session.start()).rejects.toThrow('already running');
  });

  it('should return null observation when no game state', () => {
    const obs = session.getObservation(0);
    expect(obs).toBeNull();
  });

  it('should have not started game over', () => {
    expect(session.isGameOver()).toBe(false);
  });

  it('should return current tick', () => {
    expect(session.getCurrentTick()).toBe(0);
  });

  it('should stop session and disconnect IPC', async () => {
    (mockIPCBridge.connect as any).mockResolvedValue(undefined);
    (mockIPCBridge.disconnect as any).mockResolvedValue(undefined);
    (mockIPCBridge.request as any).mockResolvedValue(undefined);

    await session.start();
    await session.stop();

    expect(mockIPCBridge.disconnect).toHaveBeenCalled();
  });

  it('should prevent tick when not running', async () => {
    await expect(session.tick()).rejects.toThrow('not running');
  });

  it('should return null game state initially', () => {
    expect(session.getGameState()).toBeNull();
  });
});
