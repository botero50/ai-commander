// Standardized typography and spacing system
// Ensures consistency across all components

export const typography = {
  // Font sizes (in pixels)
  sizes: {
    xs: '10px',
    sm: '12px',
    base: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '20px',
    '3xl': '24px',
    '4xl': '28px',
    '5xl': '32px',
  },

  // Font weights
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },

  // Letter spacing
  letterSpacing: {
    tight: '-0.5px',
    normal: '0px',
    wide: '0.5px',
    wider: '1px',
  },
} as const;

// Component-specific typography presets
export const componentTypography = {
  // Headings
  h1: {
    fontSize: typography.sizes['4xl'],
    fontWeight: typography.weights.bold,
    lineHeight: typography.lineHeights.tight,
    letterSpacing: typography.letterSpacing.tight,
  },

  h2: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.lineHeights.tight,
  },

  h3: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.lineHeights.tight,
  },

  // Body text
  body: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.normal,
    lineHeight: typography.lineHeights.normal,
  },

  bodySmall: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.normal,
    lineHeight: typography.lineHeights.normal,
  },

  // Labels and captions
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase' as const,
  },

  caption: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.normal,
    lineHeight: typography.lineHeights.tight,
  },

  // Display/broadcast text (large and prominent)
  display: {
    fontSize: typography.sizes['5xl'],
    fontWeight: typography.weights.bold,
    lineHeight: typography.lineHeights.tight,
  },

  // Broadcast stats (HUD numbers)
  stat: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    lineHeight: typography.lineHeights.tight,
  },

  statLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.normal,
    color: '#9ca3af',
    lineHeight: typography.lineHeights.tight,
  },
} as const;

// CSS-in-JS helper for typography
export function getTypographyStyles(preset: keyof typeof componentTypography): string {
  const styles = componentTypography[preset];
  let css = '';

  if (styles.fontSize) css += `font-size: ${styles.fontSize};`;
  if (styles.fontWeight) css += `font-weight: ${styles.fontWeight};`;
  if (styles.lineHeight) css += `line-height: ${styles.lineHeight};`;
  if (styles.letterSpacing) css += `letter-spacing: ${styles.letterSpacing};`;
  if ('textTransform' in styles) css += `text-transform: ${styles.textTransform};`;
  if ('color' in styles) css += `color: ${styles.color};`;

  return css;
}

// Spacing scale (for margins and padding)
export const spacing = {
  // Base unit: 0.25rem (4px)
  0.5: '0.125rem',    // 2px
  1: '0.25rem',       // 4px
  1.5: '0.375rem',    // 6px
  2: '0.5rem',        // 8px
  2.5: '0.625rem',    // 10px
  3: '0.75rem',       // 12px
  3.5: '0.875rem',    // 14px
  4: '1rem',          // 16px
  5: '1.25rem',       // 20px
  6: '1.5rem',        // 24px
  7: '1.75rem',       // 28px
  8: '2rem',          // 32px
  9: '2.25rem',       // 36px
  10: '2.5rem',       // 40px
  12: '3rem',         // 48px
  16: '4rem',         // 64px
} as const;

// Common spacing presets
export const spacingPresets = {
  // Compact layout (for broadcast overlays)
  compact: {
    xs: spacing[1],
    sm: spacing[2],
    md: spacing[3],
    lg: spacing[4],
  },

  // Normal layout (for UI components)
  normal: {
    xs: spacing[2],
    sm: spacing[3],
    md: spacing[4],
    lg: spacing[6],
  },

  // Spacious layout (for dashboards)
  spacious: {
    xs: spacing[3],
    sm: spacing[4],
    md: spacing[6],
    lg: spacing[8],
  },
} as const;

// Grid and flex gap presets
export const gapPresets = {
  compact: spacing[2],
  small: spacing[3],
  medium: spacing[4],
  large: spacing[6],
  extraLarge: spacing[8],
} as const;

// Border radius standards
export const borderRadius = {
  none: '0px',
  sm: '2px',
  base: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  full: '9999px',
} as const;
