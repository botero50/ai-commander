// Standardized animation timing and durations
// Used across all components for consistency

export const transitions = {
  // Duration presets
  fast: '0.15s',
  normal: '0.25s',
  slow: '0.35s',
  verySlow: '0.5s',

  // Easing functions
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',

  // Combined shorthand
  fast_ease: '0.15s ease',
  normal_ease: '0.25s ease',
  slow_ease: '0.35s ease',
  normal_easeInOut: '0.25s ease-in-out',
  slow_easeInOut: '0.35s ease-in-out',
} as const;

// Common animation keyframes
export const animations = {
  // Fade in/out
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,

  fadeOut: `
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `,

  // Slide in from top
  slideInFromTop: `
    @keyframes slideInFromTop {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,

  // Slide in from right (for events)
  slideInFromRight: `
    @keyframes slideInFromRight {
      from {
        opacity: 0;
        transform: translateX(100px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `,

  // Pulse animation (for metric changes)
  pulse: `
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
  `,

  // Glow effect (for highlights)
  glow: `
    @keyframes glow {
      0%, 100% {
        box-shadow: 0 0 5px rgba(255, 255, 255, 0);
      }
      50% {
        box-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
      }
    }
  `,

  // Scale up (for emphasis)
  scaleUp: `
    @keyframes scaleUp {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `,

  // Spin (for loading)
  spin: `
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `,

  // Bounce (for attention)
  bounce: `
    @keyframes bounce {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-10px);
      }
    }
  `,

  // Shimmer (for loading placeholder)
  shimmer: `
    @keyframes shimmer {
      0% {
        background-position: -1000px 0;
      }
      100% {
        background-position: 1000px 0;
      }
    }
  `,
} as const;

// CSS-in-JS style helpers
export const animationClasses = {
  fadeIn: `animation: fadeIn ${transitions.normal_ease};`,
  fadeOut: `animation: fadeOut ${transitions.normal_ease};`,
  slideInFromTop: `animation: slideInFromTop ${transitions.normal_easeInOut};`,
  slideInFromRight: `animation: slideInFromRight ${transitions.normal_easeInOut};`,
  pulse: `animation: pulse 2s ${transitions.ease} infinite;`,
  glow: `animation: glow 2s ${transitions.ease} infinite;`,
  scaleUp: `animation: scaleUp ${transitions.normal_easeInOut};`,
  spin: `animation: spin 1s linear infinite;`,
  bounce: `animation: bounce 1s ${transitions.ease} infinite;`,
  shimmer: `animation: shimmer 1.5s infinite;`,
} as const;

// Metric change animation helper
export function getMetricChangeAnimation(isIncrease: boolean): string {
  if (isIncrease) {
    return `
      color: #10b981;
      animation: pulse 0.5s ease, slideInFromTop 0.25s ease-out;
    `;
  } else {
    return `
      color: #dc2626;
      animation: pulse 0.5s ease;
    `;
  }
}

// Default transition for all interactive elements
export const interactiveTransition = `
  transition: background-color ${transitions.normal_ease},
              color ${transitions.normal_ease},
              border-color ${transitions.normal_ease},
              box-shadow ${transitions.normal_ease};
`;

// Smooth number transition (used for animated counters)
export function getNumberTransition(duration: string = transitions.normal): string {
  return `transition: all ${duration} ease-out;`;
}
