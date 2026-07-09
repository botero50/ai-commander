import { useEffect, useState } from 'react';
import type { MinimapState, MinimapService } from '@ai-commander/zeroad-adapter';

export function useMinimap(minimapService: MinimapService | null) {
  const [minimapState, setMinimapState] = useState<MinimapState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!minimapService) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(false);
      return minimapService.subscribe(setMinimapState);
    } catch (err) {
      console.error('Failed to subscribe to minimap:', err);
      setIsLoading(false);
    }
  }, [minimapService]);

  return { minimapState, isLoading };
}
