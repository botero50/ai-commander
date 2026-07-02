/**
 * Game Adapter contract tests.
 *
 * Validates type safety, immutability, and interface contracts.
 * Does not test implementations.
 */

import { describe, it, expect } from 'vitest';
import type {
  GameAdapter,
  GameSession,
  GameCapabilities,
  ObservationProvider,
  CommandExecutor,
  CommandExecutionResult,
} from '../src/index.js';
import { AdapterError, AdapterErrorCode } from '../src/index.js';

describe('Game Adapter Contracts', () => {
  describe('GameCapabilities', () => {
    it('should define capability flags', () => {
      const capabilities: GameCapabilities = {
        supportsPause: true,
        supportsSaveState: true,
        supportsDeterministicMode: true,
        supportsReplay: true,
        supportsCompleteWorldState: true,
        supportsMultipleAgents: false,
        maxTicksPerSecond: 60,
      };

      expect(capabilities.supportsPause).toBe(true);
      expect(capabilities.supportsSaveState).toBe(true);
      expect(capabilities.supportsDeterministicMode).toBe(true);
      expect(capabilities.supportsReplay).toBe(true);
      expect(capabilities.supportsCompleteWorldState).toBe(true);
      expect(capabilities.supportsMultipleAgents).toBe(false);
      expect(capabilities.maxTicksPerSecond).toBe(60);
    });

    it('should support minimal capabilities', () => {
      const capabilities: GameCapabilities = {
        supportsPause: false,
        supportsSaveState: false,
        supportsDeterministicMode: false,
        supportsReplay: false,
        supportsCompleteWorldState: false,
        supportsMultipleAgents: false,
      };

      expect(capabilities).toBeDefined();
    });

    it('should support optional metadata', () => {
      const capabilities: GameCapabilities = {
        supportsPause: true,
        supportsSaveState: true,
        supportsDeterministicMode: true,
        supportsReplay: true,
        supportsCompleteWorldState: true,
        supportsMultipleAgents: true,
        metadata: {
          name: 'OpenRA',
          version: '20240101',
          supportedMaps: ['Egypt', 'Snow'],
        },
      };

      expect(capabilities.metadata?.name).toBe('OpenRA');
    });

    it('should be readonly at type level', () => {
      const capabilities: GameCapabilities = {
        supportsPause: true,
        supportsSaveState: false,
        supportsDeterministicMode: true,
        supportsReplay: true,
        supportsCompleteWorldState: true,
        supportsMultipleAgents: false,
      };

      // TypeScript enforces readonly at compile time
      // Runtime modification is possible but violates the contract
      // Implementations should freeze capabilities if they want runtime protection
      expect(capabilities.supportsPause).toBe(true);
    });
  });

  describe('CommandExecutionResult', () => {
    it('should hold execution result data', () => {
      const result: CommandExecutionResult = {
        success: true,
        message: 'Unit moved to position (10,20)',
        data: { actualPosition: { x: 10, y: 20 } },
      };

      expect(result.success).toBe(true);
      expect(result.message).toBe('Unit moved to position (10,20)');
      expect(result.data?.actualPosition).toBeDefined();
    });

    it('should support error information', () => {
      const result: CommandExecutionResult = {
        success: false,
        message: 'Unit cannot move',
        error: {
          code: 'BLOCKED_BY_TERRAIN',
          reason: 'Destination blocked by mountain range',
        },
      };

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('BLOCKED_BY_TERRAIN');
    });

    it('should be readonly at type level', () => {
      const result: CommandExecutionResult = {
        success: true,
        message: 'Success',
      };

      // TypeScript enforces readonly at compile time
      // Implementations should freeze results if they want runtime protection
      expect(result.success).toBe(true);
    });
  });

  describe('ObservationProvider', () => {
    it('should define observation contract', () => {
      const provider: ObservationProvider = {
        getWorldState: async () => {
          // Mock implementation
          return null as any;
        },
        isObservationAvailable: async () => true,
      };

      expect(typeof provider.getWorldState).toBe('function');
      expect(typeof provider.isObservationAvailable).toBe('function');
    });

    it('should support optional replay interface', () => {
      const provider: ObservationProvider = {
        getWorldState: async () => null as any,
        getWorldStateAt: async () => null as any,
        isObservationAvailable: async () => true,
      };

      expect(typeof provider.getWorldStateAt).toBe('function');
    });
  });

  describe('CommandExecutor', () => {
    it('should define execution contract', () => {
      const executor: CommandExecutor = {
        executeCommand: async () => ({
          success: true,
          message: 'Command executed',
        }),
        canExecuteCommand: async () => true,
        isExecutionAvailable: async () => true,
      };

      expect(typeof executor.executeCommand).toBe('function');
      expect(typeof executor.canExecuteCommand).toBe('function');
      expect(typeof executor.isExecutionAvailable).toBe('function');
    });

    it('should support optional batch execution', () => {
      const executor: CommandExecutor = {
        executeCommand: async () => ({
          success: true,
          message: 'Command executed',
        }),
        executeCommands: async () => [
          {
            success: true,
            message: 'Command 1 executed',
          },
          {
            success: true,
            message: 'Command 2 executed',
          },
        ],
        canExecuteCommand: async () => true,
        isExecutionAvailable: async () => true,
      };

      expect(typeof executor.executeCommands).toBe('function');
    });
  });

  describe('GameSession', () => {
    it('should define session interface', () => {
      const session: GameSession = {
        sessionId: 'session-1',
        capabilities: {
          supportsPause: true,
          supportsSaveState: true,
          supportsDeterministicMode: true,
          supportsReplay: true,
          supportsCompleteWorldState: true,
          supportsMultipleAgents: false,
        },
        observationProvider: {
          getWorldState: async () => null as any,
          isObservationAvailable: async () => true,
        },
        commandExecutor: {
          executeCommand: async () => ({
            success: true,
            message: 'Command executed',
          }),
          canExecuteCommand: async () => true,
          isExecutionAvailable: async () => true,
        },
        start: async () => null as any,
        pause: async () => {},
        resume: async () => {},
        stop: async () => {},
        isActive: async () => true,
      };

      expect(session.sessionId).toBeDefined();
      expect(session.capabilities).toBeDefined();
      expect(session.observationProvider).toBeDefined();
      expect(session.commandExecutor).toBeDefined();
    });

    it('should support optional state operations', () => {
      const session: GameSession = {
        sessionId: 'session-1',
        capabilities: {
          supportsPause: true,
          supportsSaveState: true,
          supportsDeterministicMode: true,
          supportsReplay: true,
          supportsCompleteWorldState: true,
          supportsMultipleAgents: false,
        },
        observationProvider: {
          getWorldState: async () => null as any,
          isObservationAvailable: async () => true,
        },
        commandExecutor: {
          executeCommand: async () => ({
            success: true,
            message: 'Command executed',
          }),
          canExecuteCommand: async () => true,
          isExecutionAvailable: async () => true,
        },
        start: async () => null as any,
        saveState: async () => 'save-id',
        restoreState: async () => {},
        pause: async () => {},
        resume: async () => {},
        stop: async () => {},
        isActive: async () => true,
      };

      expect(typeof session.saveState).toBe('function');
      expect(typeof session.restoreState).toBe('function');
    });
  });

  describe('GameAdapter', () => {
    it('should define adapter interface', () => {
      const adapter: GameAdapter = {
        adapterId: 'test-adapter',
        displayName: 'Test Adapter',
        capabilities: {
          supportsPause: true,
          supportsSaveState: true,
          supportsDeterministicMode: true,
          supportsReplay: true,
          supportsCompleteWorldState: true,
          supportsMultipleAgents: false,
        },
        initialize: async () => {},
        createSession: async () => ({
          sessionId: 'session-1',
          capabilities: {
            supportsPause: true,
            supportsSaveState: true,
            supportsDeterministicMode: true,
            supportsReplay: true,
            supportsCompleteWorldState: true,
            supportsMultipleAgents: false,
          },
          observationProvider: {
            getWorldState: async () => null as any,
            isObservationAvailable: async () => true,
          },
          commandExecutor: {
            executeCommand: async () => ({
              success: true,
              message: 'Command executed',
            }),
            canExecuteCommand: async () => true,
            isExecutionAvailable: async () => true,
          },
          start: async () => null as any,
          pause: async () => {},
          resume: async () => {},
          stop: async () => {},
          isActive: async () => true,
        }),
        shutdown: async () => {},
        getAdapterInfo: async () => ({
          version: '1.0.0',
          gameVersion: '1.0',
        }),
      };

      expect(adapter.adapterId).toBe('test-adapter');
      expect(adapter.displayName).toBe('Test Adapter');
      expect(adapter.capabilities).toBeDefined();
    });

    it('should expose required methods', () => {
      const adapter: GameAdapter = {
        adapterId: 'test-adapter',
        displayName: 'Test Adapter',
        capabilities: {
          supportsPause: false,
          supportsSaveState: false,
          supportsDeterministicMode: false,
          supportsReplay: false,
          supportsCompleteWorldState: false,
          supportsMultipleAgents: false,
        },
        initialize: async () => {},
        createSession: async () => null as any,
        shutdown: async () => {},
        getAdapterInfo: async () => ({
          version: '1.0.0',
        }),
      };

      expect(typeof adapter.initialize).toBe('function');
      expect(typeof adapter.createSession).toBe('function');
      expect(typeof adapter.shutdown).toBe('function');
      expect(typeof adapter.getAdapterInfo).toBe('function');
    });
  });

  describe('AdapterError', () => {
    it('should create error with code', () => {
      const error = new AdapterError('Game not found', AdapterErrorCode.GameNotFound);

      expect(error.message).toBe('Game not found');
      expect(error.code).toBe(AdapterErrorCode.GameNotFound);
      expect(error.name).toBe('AdapterError');
      expect(error instanceof Error).toBe(true);
    });

    it('should support error details', () => {
      const error = new AdapterError(
        'Game initialization failed',
        AdapterErrorCode.InitializationFailed,
        {
          reason: 'Missing DLL file',
          path: 'C:\\Games\\game.dll',
        }
      );

      expect(error.details?.reason).toBe('Missing DLL file');
    });

    it('should enumerate all error codes', () => {
      expect(AdapterErrorCode.GameNotFound).toBeDefined();
      expect(AdapterErrorCode.GameIncompatible).toBeDefined();
      expect(AdapterErrorCode.InitializationFailed).toBeDefined();
      expect(AdapterErrorCode.SessionStartFailed).toBeDefined();
      expect(AdapterErrorCode.ObservationFailed).toBeDefined();
      expect(AdapterErrorCode.CommandFailed).toBeDefined();
      expect(AdapterErrorCode.ConnectionLost).toBeDefined();
    });
  });

  describe('Contract Compliance', () => {
    it('should be readonly at type level', () => {
      const caps: GameCapabilities = {
        supportsPause: true,
        supportsSaveState: true,
        supportsDeterministicMode: true,
        supportsReplay: true,
        supportsCompleteWorldState: true,
        supportsMultipleAgents: false,
      };

      // TypeScript enforces readonly at compile time
      // This code would not compile:
      // caps.supportsPause = false;  // TS2540: Cannot assign to readonly property

      expect(caps.supportsPause).toBe(true);
    });

    it('should support composition of adapter interfaces', () => {
      const completeAdapter: GameAdapter = {
        adapterId: 'complete-adapter',
        displayName: 'Complete Adapter',
        capabilities: {
          supportsPause: true,
          supportsSaveState: true,
          supportsDeterministicMode: true,
          supportsReplay: true,
          supportsCompleteWorldState: true,
          supportsMultipleAgents: true,
          maxTicksPerSecond: 60,
          metadata: { name: 'Test' },
        },
        initialize: async (config) => {
          expect(config).toBeDefined();
        },
        createSession: async (config) => ({
          sessionId: 'test-session',
          capabilities: this.capabilities,
          observationProvider: {
            getWorldState: async () => null as any,
            getWorldStateAt: async () => null as any,
            isObservationAvailable: async () => true,
          },
          commandExecutor: {
            executeCommand: async () => ({
              success: true,
              message: 'Test',
            }),
            executeCommands: async () => [],
            canExecuteCommand: async () => true,
            isExecutionAvailable: async () => true,
          },
          start: async () => null as any,
          pause: async () => {},
          resume: async () => {},
          saveState: async () => 'save-id',
          restoreState: async () => {},
          stop: async () => {},
          isActive: async () => true,
        }),
        shutdown: async () => {},
        getAdapterInfo: async () => ({
          version: '1.0.0',
          gameVersion: '1.0',
          compatibility: 'All versions',
        }),
      };

      expect(completeAdapter).toBeDefined();
    });
  });
});
