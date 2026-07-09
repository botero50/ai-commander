import { useState, useEffect } from 'react';

interface AnimationState {
  isAnimating: boolean;
  isIncreasing: boolean;
}

export function useMetricAnimation(value: number): AnimationState {
  const [state, setState] = useState<AnimationState>({
    isAnimating: false,
    isIncreasing: false,
  });
  const [prevValue, setPrevValue] = useState(value);

  useEffect(() => {
    if (value !== prevValue) {
      const isIncreasing = value > prevValue;
      setState({ isAnimating: true, isIncreasing });
      setPrevValue(value);

      // Animation duration matches CSS animation (0.5s)
      const timer = setTimeout(() => {
        setState({ isAnimating: false, isIncreasing });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [value, prevValue]);

  return state;
}

// Hook for detecting positive/negative change with animation
export function useValueChange(value: number, threshold: number = 0) {
  const [displayValue, setDisplayValue] = useState(value);
  const [changeIndicator, setChangeIndicator] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (Math.abs(value - displayValue) > threshold) {
      const direction = value > displayValue ? 'up' : 'down';
      setChangeIndicator(direction);
      setDisplayValue(value);

      const timer = setTimeout(() => {
        setChangeIndicator(null);
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [value, displayValue, threshold]);

  return { displayValue, changeIndicator };
}

// Hook for animating multiple metrics together
export function useMetricsAnimation(metrics: Record<string, number>) {
  const [animatingMetrics, setAnimatingMetrics] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newAnimating = new Set<string>();

    Object.entries(metrics).forEach(([key, value]) => {
      // Trigger animation if metric changed
      newAnimating.add(key);
    });

    setAnimatingMetrics(newAnimating);

    const timer = setTimeout(() => {
      setAnimatingMetrics(new Set());
    }, 500);

    return () => clearTimeout(timer);
  }, [metrics]);

  return (metricKey: string) => animatingMetrics.has(metricKey);
}

// Get animation CSS class based on state
export function getAnimationClass(isAnimating: boolean, isIncreasing: boolean): string {
  if (!isAnimating) return '';

  return `
    animation: pulse 0.5s ease ${isIncreasing ? ', slideInFromTop 0.25s ease-out' : ''};
    color: ${isIncreasing ? '#10b981' : '#dc2626'};
  `;
}
