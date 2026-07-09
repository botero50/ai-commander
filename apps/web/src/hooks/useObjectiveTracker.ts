import { useEffect, useState } from 'react';
import type { ObjectiveTrackerState, ObjectiveTracker } from '@ai-commander/zeroad-adapter';

export function useObjectiveTracker(tracker: ObjectiveTracker | null) {
  const [trackerState, setTrackerState] = useState<ObjectiveTrackerState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tracker) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(false);
      return tracker.subscribe(setTrackerState);
    } catch (err) {
      console.error('Failed to subscribe to objective tracker:', err);
      setIsLoading(false);
    }
  }, [tracker]);

  return { trackerState, isLoading };
}
