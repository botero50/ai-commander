import { createTestGameStateWithUnits } from './openra-test-state.js';

/**
 * Mock functions for game session testing.
 */

export function createMockGameInstanceAccessor(
  gameState: any = createTestGameStateWithUnits()
): () => Promise<any> {
  return async () => gameState;
}

export function createMockOrderSubmitter(): (order: any) => Promise<boolean> {
  return async () => true;
}

export function createMockStateChecker(isAvailable: boolean = true): () => Promise<boolean> {
  return async () => isAvailable;
}

export function createMockAdapterConfig(
  gameState: any = createTestGameStateWithUnits(),
  isGameAvailable: boolean = true,
  ordersSucceed: boolean = true
) {
  return {
    gameInstanceAccessor: createMockGameInstanceAccessor(gameState),
    orderSubmitter: async () => ordersSucceed,
    stateChecker: async () => isGameAvailable,
  };
}
