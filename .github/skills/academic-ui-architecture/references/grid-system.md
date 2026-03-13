# Grid System Reference

## Foundational Principle

All spatial decisions derive from one number: **8px**. Every spacing, size, and column gap must be a multiple of 8 (or 4 for fine-grained sub-steps). Never invent a value.

```
Scale: 2 · 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128px
```

4px steps are permitted only within components (icon padding, badge inset). Layout-level spacing uses 8px steps minimum.

---

## Page Grid

```css
.page-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;                      /* 3 × 8 */
  max-width: 1280px;
  margin-inline: auto;
  padding-inline: 48px;           /* 6 × 8 — desktop */
}

@media (max-width: 1024px) {
  .page-grid { padding-inline: 24px; }
}

@media (max-width: 640px) {
  .page-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    padding-inline: 16px;
  }
}
```

### Column Span Conventions

| Content type | Columns (desktop) | Columns (tablet) | Columns (mobile) |
|---|---|---|---|
| Primary reading content | 7 of 12 | 8 of 12 | 4 of 4 |
| Supplementary sidebar | 4 of 12 | 12 of 12 | 4 of 4 |
| Full-bleed table | 12 of 12 | 12 of 12 | 4 of 4 |
| Feature card grid (3-up) | 4 of 12 each | 6 of 12 each | 4 of 4 |
| Dashboard KPI strip | 3 of 12 each | 6 of 12 each | 4 of 4 |
| Modal content area | 6 of 12 centered | 10 of 12 centered | 4 of 4 |

---

## Sub-Grid (Component-Level)

Use CSS subgrid for components that must align to the parent grid:

```css
.card-grid {
  display: grid;
  grid-template-columns: subgrid;   /* inherits parent columns */
  grid-column: span 12;
}
```

For internal component spacing, treat 8px as atom and 4px as sub-atom:

```css
/* Good — all values on scale */
.card {
  padding: 24px;
  gap: 16px;
}

.card__meta {
  gap: 8px;
  margin-top: 16px;
}

/* Bad — off-grid */
.card { padding: 20px; gap: 10px; }
```

---

## Vertical Rhythm

Vertical rhythm is as important as horizontal grid alignment. Every vertical gap must follow the same 8-point scale.

```css
/* Section separation */
.section + .section { margin-top: 64px; }

/* Within-section heading-to-content */
.section__heading { margin-bottom: 24px; }

/* Between related items (same conceptual group) */
.item + .item { margin-top: 16px; }

/* Between unrelated blocks */
.block + .block { margin-top: 48px; }
```

**Minimum breathing room rule:** Every full-width section must have at least `48px` top and bottom padding. Reading becomes labored when content blocks collide.

---

## Breakpoints

Use these exact breakpoints. Never introduce intermediates.

| Name | Min-width | Grid columns | Gutter |
|------|-----------|-------------|--------|
| `xs` | 0 | 4 | 16px |
| `sm` | 640px | 8 | 16px |
| `md` | 768px | 12 | 24px |
| `lg` | 1024px | 12 | 24px |
| `xl` | 1280px | 12 | 24px |

```css
/* Breakpoint tokens — use these, do not freestyle */
:root {
  --bp-sm: 640px;
  --bp-md: 768px;
  --bp-lg: 1024px;
  --bp-xl: 1280px;
}
```

---

## Content Width Constraints

| Use case | Max-width |
|----------|-----------|
| Body prose / reading content | `72ch` |
| Form inputs | `480px` or full column width |
| Data table | full column width |
| Hero heading | `640px` |
| Page layout container | `1280px` |

The `72ch` rule for prose is non-negotiable. Lines longer than ~75 characters measurably reduce reading comprehension in educational contexts.

---

## CSS Global Reset (Required)

Apply this before any component styles:

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;               /* do not alter — rem anchor */
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

img, video, svg {
  display: block;
  max-width: 100%;
}

input, button, textarea, select {
  font: inherit;
}
```

---

## Cross-Browser Alignment Checklist

Run this checklist before any UI review or handoff.

### Layout
- [ ] `box-sizing: border-box` applied globally — verify borders don't break column math
- [ ] No `position: absolute` used for layout structure (only for overlays and decorative marks)
- [ ] Flex/Grid containers have explicit `gap` rather than margins on children
- [ ] `min-width: 0` applied to flex/grid children that contain text (prevents overflow blowout)

### Spacing
- [ ] Every spacing value in computed styles is a multiple of 4 (allows 4px sub-steps)
- [ ] No `calc()` producing non-integer results (e.g., `calc(100% / 3)` without rounding)
- [ ] Padding and margin use scale tokens — no raw px literals in component CSS

### Typography
- [ ] No `font-size` less than 11px (sub-11px is inaccessible and off-scale)
- [ ] All `line-height` values are unitless ratios (not px) to scale with font-size changes
- [ ] `text-rendering: optimizeLegibility` on headings only; body uses default

### Border & Radius
- [ ] `border-radius` ≤ 2px on all non-interactive containers
- [ ] `border-radius` ≤ 4px on interactive controls (buttons, inputs)
- [ ] No `border-radius: 50%` except true circular elements (avatar images)
- [ ] No `border-radius: 9999px` (pill) anywhere in the codebase

### Color & Contrast
- [ ] All text meets WCAG AA (4.5:1 for body, 3:1 for large text/18px+)
- [ ] No color alone used to convey meaning — always pair with shape or label
- [ ] Focus rings visible in all browsers (`outline` not suppressed without replacement)

### Cross-Browser Testing
- [ ] Verified in Chrome (latest)
- [ ] Verified in Firefox (latest)
- [ ] Verified in Safari (latest WebKit)
- [ ] Verified at 100%, 125%, 150% browser zoom levels
- [ ] No horizontal scrollbar at any breakpoint ≥ 320px viewport width
