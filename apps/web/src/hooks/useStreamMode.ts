import { useState, useCallback } from 'react';

export function useStreamMode() {
  const [isStreamMode, setIsStreamMode] = useState(false);

  const toggleStreamMode = useCallback(() => {
    setIsStreamMode((prev) => {
      const newMode = !prev;

      if (newMode) {
        // Hide debugging info
        document.documentElement.style.visibility = 'visible';
        document.body.style.backgroundColor = 'transparent';

        // Hide console on Windows
        if (window.console && window.console.clear) {
          window.console.clear();
        }
      } else {
        // Show all info
        document.documentElement.style.visibility = 'visible';
      }

      return newMode;
    });
  }, []);

  const activateStreamMode = useCallback(() => {
    setIsStreamMode(true);
  }, []);

  const deactivateStreamMode = useCallback(() => {
    setIsStreamMode(false);
  }, []);

  return {
    isStreamMode,
    toggleStreamMode,
    activateStreamMode,
    deactivateStreamMode,
  };
}
