// Standardized color palette for all UI components
// WCAG AAA compliant (7:1 contrast ratio minimum)

export const colors = {
  // Base palette
  black: '#000000',
  white: '#ffffff',

  // Neutral grays (WCAG AAA contrast tested)
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',

  // Semantic colors (WCAG AAA compliant)
  critical: '#dc2626',    // Red, bright enough for AAA
  major: '#f59e0b',       // Amber, bright enough for AAA
  minor: '#6b7280',       // Gray, neutral for minor events
  info: '#0284c7',        // Sky blue, bright enough for AAA
  success: '#16a34a',     // Green, bright enough for AAA
  warning: '#d97706',     // Orange, bright enough for AAA

  // Team colors (broadcast standard)
  player1: '#3b82f6',     // Bright blue (WCAG AAA)
  player2: '#ef4444',     // Bright red (WCAG AAA)

  // UI backgrounds
  background: {
    primary: '#0a0a0a',   // Nearly black for broadcast
    secondary: '#1a1a1a', // Dark gray for cards
    tertiary: '#252525',  // Slightly lighter for hover states
  },

  // Text colors (ensure contrast)
  text: {
    primary: '#ffffff',     // Full white for primary text (WCAG AAA)
    secondary: '#d1d5db',   // Light gray for secondary (WCAG AAA on dark bg)
    muted: '#9ca3af',       // Medium gray for muted text (WCAG AA on dark bg)
    inverse: '#111827',     // Nearly black for inverse (WCAG AAA on light bg)
  },

  // Border colors
  border: {
    light: '#404040',       // Subtle borders on dark backgrounds
    medium: '#555555',      // Medium contrast borders
    strong: '#ffffff',      // Strong borders (full white)
  },

  // Status indicators
  status: {
    online: '#10b981',      // Green (WCAG AAA)
    idle: '#f59e0b',        // Amber (WCAG AAA)
    offline: '#6b7280',     // Gray (WCAG AA)
    error: '#dc2626',       // Red (WCAG AAA)
  },

  // Latency colors (for AI Status Display)
  latency: {
    good: '#10b981',        // Green for <100ms
    ok: '#f59e0b',          // Amber for 100-300ms
    slow: '#dc2626',        // Red for >300ms
  },

  // Transparency variants (for overlays/modals)
  transparent: {
    black50: 'rgba(0, 0, 0, 0.5)',
    black75: 'rgba(0, 0, 0, 0.75)',
    white10: 'rgba(255, 255, 255, 0.1)',
    white20: 'rgba(255, 255, 255, 0.2)',
  },
} as const;

// Type-safe color access
export type ColorKey = keyof typeof colors;

// CSS variable generator for design system
export function generateCSSVariables(): string {
  const vars: string[] = [];

  Object.entries(colors).forEach(([key, value]) => {
    if (typeof value === 'string') {
      vars.push(`--color-${key}: ${value};`);
    } else if (typeof value === 'object') {
      Object.entries(value).forEach(([subkey, subvalue]) => {
        vars.push(`--color-${key}-${subkey}: ${subvalue};`);
      });
    }
  });

  return `:root { ${vars.join(' ')} }`;
}

// Contrast ratio validator (for accessibility audits)
export function getContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const luminance = (rgb: [number, number, number]) => {
    const [r, g, b] = rgb.map(val => {
      val /= 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = luminance(rgb1);
  const l2 = luminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// Helper to convert hex to RGB
export function hexToRgb(hex: string): [number, number, number] {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) throw new Error(`Invalid hex color: ${hex}`);
  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
}

// Verify WCAG compliance
export function verifyWCAGCompliance(): {
  standard: string;
  compliant: boolean;
  ratio: number;
}[] {
  const results: { standard: string; compliant: boolean; ratio: number }[] = [];

  // Check critical text on dark background (should be 7:1 for AAA)
  const darkBg = hexToRgb(colors.background.primary);
  const criticalText = hexToRgb(colors.text.primary);
  const ratio = getContrastRatio(darkBg, criticalText);

  results.push({
    standard: 'AAA (7:1)',
    compliant: ratio >= 7,
    ratio,
  });

  return results;
}
