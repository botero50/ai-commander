import { useState, useEffect } from 'react';
import type { HUDState } from '@ai-commander/zeroad-adapter';
import type { GameSession } from '@/types';

/**
 * Hook for accessing real-time game HUD state (resources, military, etc.)
 * Subscribes to the GameStateHUD service for continuous updates
 */
export function useGameStateHUD(gameSession: GameSession | null) {
  const [hudState, setHudState] = useState<HUDState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!gameSession) {
      setIsLoading(false);
      return;
    }

    try {
      const hud = (gameSession as any).getGameStateHUD?.();
      if (!hud) {
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      return hud.subscribe(setHudState);
    } catch (err) {
      console.error('Failed to subscribe to HUD:', err);
      setIsLoading(false);
    }
  }, [gameSession]);

  return { hudState, isLoading };
}
