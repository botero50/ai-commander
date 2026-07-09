import { useEffect, useState } from 'react';
import type { AnnotationState, EventAnnotations } from '@ai-commander/zeroad-adapter';

export function useEventAnnotations(annotations: EventAnnotations | null) {
  const [annotationState, setAnnotationState] = useState<AnnotationState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!annotations) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(false);
      return annotations.subscribe(setAnnotationState);
    } catch (err) {
      console.error('Failed to subscribe to event annotations:', err);
      setIsLoading(false);
    }
  }, [annotations]);

  return { annotationState, isLoading };
}
