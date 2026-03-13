/**
 * Academic UI Architecture — Design System Tokens
 *
 * Drop this file into your project's design system package.
 * Compatible with CSS custom properties, Tailwind, and CSS-in-JS.
 *
 * Usage:
 *   import { tokens, injectCSSTokens } from './tokens'
 *   injectCSSTokens()   // injects all tokens into :root
 *
 *   // Or use typed token values directly in CSS-in-JS:
 *   const Card = styled.div`
 *     padding: ${tokens.spacing[24]};
 *     border-radius: ${tokens.radius.sm};
 *   `
 */

// ─── Spacing (8-point scale) ─────────────────────────────────────────────────

export const spacing = {
  0:   '0px',
  2:   '2px',
  4:   '4px',
  8:   '8px',
  12:  '12px',
  16:  '16px',
  24:  '24px',
  32:  '32px',
  48:  '48px',
  64:  '64px',
  96:  '96px',
  128: '128px',
} as const

// ─── Border Radius (academic constraint: 0–4px only) ─────────────────────────

export const radius = {
  none: '0px',   // tables, modals, nav
  xs:   '1px',   // subtle structural use
  sm:   '2px',   // standard academic corner — cards, panels (DEFAULT)
  md:   '4px',   // maximum — interactive controls only (buttons, inputs)
  // 'lg', 'xl', 'full' intentionally omitted — not part of academic system
} as const

// ─── Typography ───────────────────────────────────────────────────────────────

export const fontFamily = {
  sans:    "'Inter', 'IBM Plex Sans', system-ui, -apple-system, sans-serif",
  display: "'DM Sans', 'Inter', sans-serif",
  mono:    "'IBM Plex Mono', 'Fira Code', monospace",
} as const

export const fontSize = {
  xs:   '0.6875rem',  // 11px — editorial floor
  sm:   '0.75rem',    // 12px — captions, labels
  base: '0.875rem',   // 14px — body default
  md:   '1rem',       // 16px — body large, subheading
  lg:   '1.25rem',    // 20px — subheading, card title
  xl:   '1.5rem',     // 24px — heading
  '2xl': '1.75rem',   // 28px — section heading
  '3xl': '2.25rem',   // 36px — page display title
} as const

export const fontWeight = {
  regular:  400,
  medium:   500,
  semibold: 600,
  bold:     700,
} as const

export const lineHeight = {
  tight:   1.2,
  snug:    1.35,
  normal:  1.5,
  relaxed: 1.6,   // body prose — reading optimized
  loose:   1.75,
} as const

export const letterSpacing = {
  tight:  '-0.02em',  // large display headings only
  normal:  '0em',
  wide:    '0.04em',  // labels at small sizes
  wider:   '0.06em',  // uppercase labels
} as const

// ─── Color ────────────────────────────────────────────────────────────────────

export const color = {
  // Backgrounds
  bg: {
    page:    '#F9F9FB',
    surface: '#FFFFFF',
    sunken:  '#F3F4F6',
    overlay: 'rgba(0, 0, 0, 0.48)',
  },

  // Borders
  border: {
    default: '#D1D5DB',
    strong:  '#9CA3AF',
    subtle:  '#E5E7EB',
  },

  // Text
  text: {
    primary:   '#111827',
    secondary: '#4B5563',
    tertiary:  '#9CA3AF',
    inverse:   '#FFFFFF',
  },

  // Brand accent (institutional blue — use sparingly)
  accent: {
    DEFAULT: '#1D4ED8',
    hover:   '#1E40AF',
    subtle:  '#EFF6FF',
    text:    '#1D4ED8',
  },

  // Semantic states
  success: { text: '#166534', bg: '#F0FDF4' },
  warning: { text: '#92400E', bg: '#FFFBEB' },
  error:   { text: '#991B1B', bg: '#FEF2F2' },
  info:    { text: '#1E40AF', bg: '#EFF6FF' },
} as const

// ─── Shadows (functional only — 2 levels) ────────────────────────────────────

export const shadow = {
  none:  'none',
  focus: '0 0 0 3px rgba(29, 78, 216, 0.35)',    // focus ring
  modal: '0 8px 32px rgba(0, 0, 0, 0.12)',        // overlay elevation
} as const

// ─── Borders ──────────────────────────────────────────────────────────────────

export const border = {
  width: {
    thin:   '1px',
    medium: '2px',
  },
  // Composed shorthand values
  default: `1px solid ${color.border.default}`,
  strong:  `2px solid ${color.border.strong}`,
  subtle:  `1px solid ${color.border.subtle}`,
} as const

// ─── Z-Index ──────────────────────────────────────────────────────────────────

export const zIndex = {
  base:    0,
  raised:  10,   // sticky headers, floating labels
  overlay: 100,  // dropdowns, tooltips
  modal:   200,  // dialogs
  toast:   300,  // notifications
} as const

// ─── Transitions ──────────────────────────────────────────────────────────────

export const transition = {
  duration: {
    instant: '0ms',
    fast:    '100ms',
    base:    '150ms',
    slow:    '250ms',
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const

// ─── Layout ───────────────────────────────────────────────────────────────────

export const layout = {
  gridColumns:      12,
  gridGap:          spacing[24],
  gridMaxWidth:     '1280px',
  contentMaxWidth:  '72ch',     // prose column — mandatory
  sidebarWidth:     '256px',
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
} as const

// ─── Flat token bundle ────────────────────────────────────────────────────────

export const tokens = {
  spacing,
  radius,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  color,
  shadow,
  border,
  zIndex,
  transition,
  layout,
} as const

// ─── CSS Custom Property injection ───────────────────────────────────────────

/**
 * Injects all design tokens as CSS custom properties on :root.
 * Call once at app initialization (before first render).
 */
export function injectCSSTokens(target: HTMLElement = document.documentElement): void {
  const style = target.style

  // Spacing
  Object.entries(spacing).forEach(([k, v]) => style.setProperty(`--spacing-${k}`, v))

  // Radius
  Object.entries(radius).forEach(([k, v]) => style.setProperty(`--radius-${k}`, v))

  // Typography
  style.setProperty('--font-family-sans',    fontFamily.sans)
  style.setProperty('--font-family-display', fontFamily.display)
  style.setProperty('--font-family-mono',    fontFamily.mono)
  Object.entries(fontSize).forEach(([k, v]) => style.setProperty(`--font-size-${k}`, v))

  // Colors (flatten nested)
  style.setProperty('--color-bg-page',    color.bg.page)
  style.setProperty('--color-bg-surface', color.bg.surface)
  style.setProperty('--color-bg-sunken',  color.bg.sunken)
  style.setProperty('--color-bg-overlay', color.bg.overlay)
  style.setProperty('--color-border-default', color.border.default)
  style.setProperty('--color-border-strong',  color.border.strong)
  style.setProperty('--color-border-subtle',  color.border.subtle)
  style.setProperty('--color-text-primary',   color.text.primary)
  style.setProperty('--color-text-secondary', color.text.secondary)
  style.setProperty('--color-text-tertiary',  color.text.tertiary)
  style.setProperty('--color-text-inverse',   color.text.inverse)
  style.setProperty('--color-accent',         color.accent.DEFAULT)
  style.setProperty('--color-accent-hover',   color.accent.hover)
  style.setProperty('--color-accent-subtle',  color.accent.subtle)
  style.setProperty('--color-accent-text',    color.accent.text)

  // Shadows
  style.setProperty('--shadow-none',  shadow.none)
  style.setProperty('--shadow-focus', shadow.focus)
  style.setProperty('--shadow-modal', shadow.modal)

  // Borders
  style.setProperty('--border-width-thin',   border.width.thin)
  style.setProperty('--border-width-medium', border.width.medium)
  style.setProperty('--border-default', border.default)
  style.setProperty('--border-strong',  border.strong)
  style.setProperty('--border-subtle',  border.subtle)

  // Layout
  style.setProperty('--grid-columns',       String(layout.gridColumns))
  style.setProperty('--grid-gap',           layout.gridGap)
  style.setProperty('--grid-max-width',     layout.gridMaxWidth)
  style.setProperty('--content-max-width',  layout.contentMaxWidth)
  style.setProperty('--sidebar-width',      layout.sidebarWidth)
  Object.entries(layout.breakpoints).forEach(([k, v]) => style.setProperty(`--bp-${k}`, v))
}

// ─── Tailwind config helper ───────────────────────────────────────────────────

/**
 * Returns a Tailwind v3/v4-compatible theme extension object.
 * Use in tailwind.config.js:
 *   const { tailwindTheme } = require('./tokens')
 *   module.exports = { theme: { extend: tailwindTheme() } }
 */
export function tailwindTheme() {
  return {
    spacing: Object.fromEntries(
      Object.entries(spacing).map(([k, v]) => [k, v])
    ),
    borderRadius: {
      none: radius.none,
      xs:   radius.xs,
      sm:   radius.sm,
      md:   radius.md,
      // Explicitly no 'lg', 'xl', 'full' — blocked at config level
    },
    fontFamily: {
      sans:    fontFamily.sans.split(', '),
      display: fontFamily.display.split(', '),
      mono:    fontFamily.mono.split(', '),
    },
    fontSize: Object.fromEntries(
      Object.entries(fontSize).map(([k, v]) => [k, v])
    ),
    fontWeight: Object.fromEntries(
      Object.entries(fontWeight).map(([k, v]) => [k, String(v)])
    ),
    lineHeight: Object.fromEntries(
      Object.entries(lineHeight).map(([k, v]) => [k, String(v)])
    ),
    boxShadow: {
      none:  shadow.none,
      focus: shadow.focus,
      modal: shadow.modal,
      // No decorative shadows — intentional
    },
    zIndex: Object.fromEntries(
      Object.entries(zIndex).map(([k, v]) => [k, String(v)])
    ),
  }
}
