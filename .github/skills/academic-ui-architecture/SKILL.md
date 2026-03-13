---
name: academic-ui-architecture
description: "Frontend development curriculum for educational institutions. Use when: building academic LMS interfaces, institutional dashboards, or educational tools; enforcing strict grid systems and 8-point spacing; auditing UI for excessive border-radius or decorative bloat; designing information-dense layouts for learning environments; reviewing component libraries for typographic precision and whitespace discipline; implementing sharp-edged academic design systems that reject rounded aesthetics. Covers: CSS grid architecture, mathematical spacing scales, pixel-perfect alignment, 0-2px border-radius enforcement, design tokens, cross-browser consistency, and negative-space hierarchy."
argument-hint: "component name, page type, or layout challenge to address (e.g. 'course grid', 'assignment table', 'nav audit')"
---

# Academic UI Architecture

A frontend development curriculum for educational institutions. Produces visually authoritative, information-dense interfaces that communicate institutional seriousness through disciplined spacing, sharp geometry, and systematic typography — not decoration.

## When to Use

- Building or reviewing interfaces for LMS platforms, institutional portals, or academic dashboards
- Auditing existing components for rounded-corner overuse, arbitrary spacing, or visual noise
- Implementing a new design system token set for an educational product
- Teaching students the relationship between grid discipline and perceived authority
- Any task phrase like: "make this look academic", "sharp UI", "strict grid", "no excessive rounding", "8-point grid", "educational interface", "institutional design"

---

## Core Philosophy

> **Clarity is authority.** Rounded corners signal friendliness and consumer softness. Sharp, low-radius geometry signals precision, rigor, and institutional trust — the correct register for learning environments.

Four foundational rules govern all decisions:

| Rule | Constraint |
|------|-----------|
| **Grid** | 8-point base unit. No off-grid values. |
| **Corners** | `border-radius` ≤ 2px on containers; ≤ 4px on interactive controls only |
| **Spacing** | Values from the 8-point scale only: 2, 4, 8, 12, 16, 24, 32, 48, 64, 96px |
| **Decoration** | Zero shadows, gradients, or ornamental borders unless conveying state |

---

## Workflow

### Step 1 — Audit Existing UI

Before writing new code, inventory what exists. For each component:

1. Flag any `border-radius` > 4px → mark for reduction to 0–2px
2. Flag any spacing value not in the 8-point scale → normalize
3. Flag box-shadows used for aesthetics (not elevation state) → remove
4. Flag font sizes not aligned to the type scale → see [Typography Reference](./references/typography.md)
5. Document findings in a component audit table (see [Component Audit Guide](./references/component-audit.md))

### Step 2 — Establish Design Tokens

All values must be sourced from tokens. Never hardcode colors, spacing, radii, or type sizes.

Load and apply the [Design Tokens Reference](./references/design-tokens.md). Scaffold tokens using the [tokens asset](./assets/tokens.ts).

Token categories required for every project:
- `--spacing-*` — 8-point scale
- `--radius-*` — sharp-corner scale (0, 1, 2, 4px)
- `--font-size-*` — modular type scale
- `--color-*` — neutral-dominant academic palette
- `--line-height-*` — reading-optimized values

### Step 3 — Build Grid Infrastructure

Implement the structural grid before any component work. See [Grid System Reference](./references/grid-system.md).

Required grid layers:
1. **Page grid** — 12-column, `gap: 24px`, max-width 1280px, centered
2. **Content grid** — 4 or 8-column sub-grid for reading zones
3. **Component grid** — internal 8px unit alignment for spacing within components

Every element must snap to the grid. Use CSS Grid — never absolute positioning for layout.

### Step 4 — Implement Typography Hierarchy

Typography is the primary visual hierarchy tool. See [Typography Reference](./references/typography.md).

Required hierarchy levels:
- **Display** — page titles, 28–36px, weight 700, line-height 1.2
- **Heading** — section titles, 20–24px, weight 600, line-height 1.3
- **Subheading** — 16–18px, weight 600, line-height 1.4
- **Body** — 14–16px, weight 400, line-height 1.6 (reading optimized)
- **Caption** — 12px, weight 400, line-height 1.5, color muted
- **Label** — 11–12px, weight 500 or 600, uppercase, letter-spacing 0.06em

No font size below 11px. No more than 4 size levels in a single view.

### Step 5 — Build Components to Spec

Apply the following decision table for every component:

| Component type | Max radius | Shadow | Padding source |
|----------------|-----------|--------|---------------|
| Card / Panel | 2px | none | `--spacing-16` to `--spacing-24` |
| Button (primary) | 2px | none | `--spacing-8` × `--spacing-16` |
| Button (secondary) | 2px | none | same |
| Input / Textarea | 2px | none (focus ring only) | `--spacing-8` × `--spacing-12` |
| Badge / Tag | 2px | none | `--spacing-2` × `--spacing-8` |
| Modal / Dialog | 0px | overlay scrim only | `--spacing-32` |
| Table | 0px | none | `--spacing-8` rows, `--spacing-12` cells |
| Nav / Sidebar | 0px | 1px border-right | `--spacing-16` items |
| Avatar / Icon chip | 2px circle only if image | none | — |

### Step 6 — Validate Cross-Browser Alignment

Run the alignment checklist (see [Grid System Reference](./references/grid-system.md#cross-browser-checklist)):

- `box-sizing: border-box` applied globally via `*, *::before, *::after`
- No `margin: auto` hacks for centering — use `place-items`, `justify-content`, or grid placement
- Subpixel rounding: use integer pixel values for all spacing and sizing
- Verify in Chrome, Firefox, Safari (WebKit) — document any deviations

### Step 7 — Negative Space Review

Before shipping, evaluate negative space deliberately:

1. Every section must have a minimum `--spacing-48` top/bottom breathing room
2. Primary reading content column: max 72 characters wide (`max-width: 72ch`)
3. Related items grouped with `--spacing-8`; unrelated items separated with `--spacing-32` or more
4. No element touches a viewport edge — minimum `--spacing-16` margin on mobile, `--spacing-24` on desktop

---

## Quick Reference: What Not To Do

```css
/* FORBIDDEN — consumer-product aesthetics */
border-radius: 8px;       /* exceeds academic threshold */
border-radius: 12px;      /* decorative rounding */
border-radius: 9999px;    /* pill shape — wrong register */
box-shadow: 0 4px 20px rgba(0,0,0,0.15); /* decorative shadow */
padding: 13px;            /* off-grid value */
gap: 15px;                /* off-grid value */
font-size: 15px;          /* non-scale value */
```

```css
/* CORRECT — academic precision */
border-radius: 2px;       /* sharp, intentional, professional */
border-radius: 0;         /* for tables, modals, nav */
box-shadow: none;         /* state conveyed through borders and color */
padding: 12px 16px;       /* on-grid: 12 and 16 are valid scale values */
gap: 16px;                /* 8-point compliant */
font-size: 14px;          /* on-scale body text */
```

---

## Resources

- [Grid System Reference](./references/grid-system.md) — 12-column layout, sub-grids, breakpoints, cross-browser checklist
- [Typography Reference](./references/typography.md) — modular scale, hierarchy levels, line-height ratios, alignment rules
- [Design Tokens Reference](./references/design-tokens.md) — complete token set, CSS custom properties, spacing scale
- [Component Audit Guide](./references/component-audit.md) — audit table template, violation severity, remediation patterns
- [Base Tokens Asset](./assets/tokens.ts) — TypeScript/CSS token scaffold ready to drop into a project
