/**
 * SafeSwap Design Tokens
 * 
 * Central source of truth for all visual design values.
 * Built with CSS custom properties for dark-mode readiness.
 */

// ─── Color Palette ───────────────────────────────────────────────────────────

export const colors = {
  /** Errors, danger surfaces, dispute states */
  blush: '#FFD4D4',
  /** App background */
  cream: '#FFFFE8',
  /** Success surfaces, secondary fills, "payment protected" badge */
  lime: '#CDE990',
  /** Primary buttons, active states, progress */
  green: '#AACB73',
  /** Dark olive ink for text and borders */
  ink: '#1F2A14',
  /** Pure white for card backgrounds */
  white: '#FFFFFF',
  /** Muted ink for secondary text */
  inkMuted: '#4A5A3A',
  /** Very light ink for disabled states */
  inkLight: '#8A9A7A',
  /** Border color (ink at 20% opacity approximation) */
  border: '#C5CCBC',
  /** Hover overlay - ink at 6% */
  hoverOverlay: 'rgba(31, 42, 20, 0.06)',
  /** Pressed overlay - ink at 12% */
  pressedOverlay: 'rgba(31, 42, 20, 0.12)',
  /** Focus ring color */
  focusRing: '#AACB73',
  /** Disabled background */
  disabledBg: '#E8E8D8',
  /** Disabled text */
  disabledText: '#8A9A7A',
} as const;

// ─── Spacing (8px grid) ─────────────────────────────────────────────────────

export const spacing = {
  0: '0px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
} as const;

// ─── Border Radii ────────────────────────────────────────────────────────────

export const radii = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  full: '9999px',
} as const;

// ─── Typography Scale ────────────────────────────────────────────────────────

export const fontSize = {
  xs: ['12px', { lineHeight: '16px', letterSpacing: '0.01em' }],
  sm: ['14px', { lineHeight: '20px', letterSpacing: '0.005em' }],
  base: ['16px', { lineHeight: '24px', letterSpacing: '0em' }],
  lg: ['20px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
  xl: ['24px', { lineHeight: '32px', letterSpacing: '-0.015em' }],
  '2xl': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em' }],
} as const;

export const fontFamily = {
  sans: ['Inter Variable', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
  mono: ['JetBrains Mono Variable', 'JetBrains Mono', 'ui-monospace', 'monospace'],
} as const;

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

// ─── Shadows (subtle, no glow) ──────────────────────────────────────────────

export const shadows = {
  sm: '0 1px 2px rgba(31, 42, 20, 0.06)',
  md: '0 2px 4px rgba(31, 42, 20, 0.08)',
  lg: '0 4px 8px rgba(31, 42, 20, 0.1)',
} as const;

// ─── Transitions ─────────────────────────────────────────────────────────────

export const transitions = {
  fast: '100ms ease-out',
  normal: '150ms ease-out',
  slow: '200ms ease-out',
} as const;

// ─── Z-Index Scale ───────────────────────────────────────────────────────────

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  toast: 50,
} as const;

// ─── Touch Targets ───────────────────────────────────────────────────────────

export const touchTarget = {
  min: '44px',
} as const;

// ─── Breakpoints ─────────────────────────────────────────────────────────────

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const;
