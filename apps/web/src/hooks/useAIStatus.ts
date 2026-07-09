import { useEffect, useState } from 'react';
import type { AIStatusState, AIStatusService } from '@ai-commander/zeroad-adapter';

export function useAIStatus(aiStatusService: AIStatusService | null) {
  const [statusState, setStatusState] = useState<AIStatusState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!aiStatusService) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(false);
      return aiStatusService.subscribe(setStatusState);
    } catch (err) {
      console.error('Failed to subscribe to AI status:', err);
      setIsLoading(false);
    }
  }, [aiStatusService]);

  return { statusState, isLoading };
}
