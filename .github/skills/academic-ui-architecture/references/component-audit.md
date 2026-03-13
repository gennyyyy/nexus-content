# Component Audit Guide

## Purpose

Before building anything new, audit what exists. This guide provides a systematic process for evaluating existing UI against the academic architecture standards, a violation severity table, and remediation patterns for the most common infractions.

---

## Audit Table Template

Use this table to document each component during review. One row per component.

```
| Component         | Radius | Off-grid spacing | Decorative shadows | Type violations | Priority |
|-------------------|--------|------------------|--------------------|-----------------|----------|
| NavBar            |        |                  |                    |                 |          |
| CourseCard        |        |                  |                    |                 |          |
| AssignmentTable   |        |                  |                    |                 |          |
| ProgressBar       |        |                  |                    |                 |          |
| SearchInput       |        |                  |                    |                 |          |
| ModalDialog       |        |                  |                    |                 |          |
| BreadcrumbNav     |        |                  |                    |                 |          |
| Pagination        |        |                  |                    |                 |          |
| Badge / Tag       |        |                  |                    |                 |          |
| SidebarMenu       |        |                  |                    |                 |          |
```

**Columns:**
- **Radius**: actual computed value (e.g., `8px`) or ✓ if compliant (≤ 2px)
- **Off-grid spacing**: list any non-scale padding/margin values found
- **Decorative shadows**: list shadow values used for aesthetics, not state
- **Type violations**: font sizes off-scale or weights inconsistent with hierarchy
- **Priority**: P1 (visible on first load), P2 (secondary views), P3 (edge cases)

---

## Violation Severity Table

| Violation | Severity | Impact | Remediation effort |
|-----------|----------|--------|-------------------|
| `border-radius` > 8px on a card/panel | **Critical** | Destroys academic register | Low — 1 token swap |
| `border-radius` 5–8px on a card/panel | **High** | Visually inconsistent | Low |
| `border-radius` > 4px on button/input | **High** | Mismatched control language | Low |
| `border-radius: 9999px` (pill button) | **Critical** | Consumer-product aesthetic | Low |
| Decorative `box-shadow` on cards | **High** | Visual noise, inflated weight | Low |
| Off-grid spacing (e.g. `padding: 13px`) | **Medium** | Breaks rhythm on misalignment | Low |
| Body text without `max-width: 72ch` | **Medium** | Line length harms reading | Low |
| Font size off the type scale | **Medium** | Inconsistent hierarchy | Medium |
| Missing focus ring (outline: 0 with no replacement) | **Critical** | WCAG failure | Medium |
| Color contrast below 4.5:1 | **Critical** | WCAG AA failure | Medium |
| Layout using `position: absolute` for structure | **High** | Grid misalignment cross-browser | High |
| Margin hacks for centering (not grid/flex) | **Medium** | Alignment fragility | Medium |
| `text-align: justify` on body | **Medium** | Uneven word spacing | Low |
| Light font weight (300) on screen | **Medium** | Legibility regression | Low |
| Uppercase body text | **Medium** | Comprehension reduction | Low |

---

## Remediation Patterns

### Pattern 1: Reduce Border Radius

**Symptom:** `border-radius: 8px`, `12px`, `16px`, `9999px` on container or button

```css
/* Before */
.course-card {
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
}

/* After */
.course-card {
  border-radius: var(--radius-sm);   /* 2px */
  border: var(--border-default);     /* replace visual separation lost from shadow */
}
```

**Note:** When removing decorative shadows, always add a `border` replacement. Shadow was doing work to separate surface from background — a 1px border does the same job without visual weight.

---

### Pattern 2: Normalize Off-Grid Spacing

**Symptom:** `padding: 13px 18px`, `margin-top: 20px`, `gap: 10px`

```css
/* Before */
.card-header {
  padding: 18px 22px;
  margin-bottom: 10px;
}

/* After — map to nearest scale values */
.card-header {
  padding: var(--spacing-16) var(--spacing-24);  /* 18→16, 22→24 */
  margin-bottom: var(--spacing-8);               /* 10→8 */
}
```

**Rounding rule:** Round to the nearest 8-point scale value. For values between 8-point marks, prefer the smaller (tighter) value to avoid over-spacing.

---

### Pattern 3: Remove Decorative Shadows

**Symptom:** `box-shadow` on cards, panels, navigation — not triggered by hover/active state

```css
/* Before */
.sidebar {
  box-shadow: 2px 0 12px rgba(0,0,0,0.08);
}

/* After */
.sidebar {
  border-right: var(--border-subtle);   /* 1px — sufficient structural separation */
}
```

```css
/* Before */
.dropdown-menu {
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

/* After — shadow is acceptable here: functional elevation for overlaid element */
.dropdown-menu {
  box-shadow: var(--shadow-modal);      /* 0 8px 32px rgba(0,0,0,0.12) — from token */
  border: var(--border-default);
}
```

**Rule:** Shadow = functional elevation (overlay) only. Cards sitting flat on a page surface get borders, not shadows.

---

### Pattern 4: Fix Typography Violations

**Symptom:** Font size off-scale (`15px`, `13px`), wrong weight (`300`), missing `line-height`

```css
/* Before */
.course-description {
  font-size: 15px;
  font-weight: 300;
  line-height: 24px;
}

/* After */
.course-description {
  font-size: var(--font-size-base);       /* 14px — on-scale */
  font-weight: var(--font-weight-regular); /* 400 */
  line-height: var(--line-height-relaxed); /* 1.6 — unitless */
}
```

---

### Pattern 5: Add Line-Length Constraint

**Symptom:** Body text spans full container width with no max-width

```css
/* Before */
.reading-content p {
  /* no max-width */
}

/* After */
.reading-content p {
  max-width: var(--content-max-width);   /* 72ch */
}

/* Or at container level */
.reading-content {
  max-width: var(--content-max-width);
}
```

---

### Pattern 6: Restore Focus Ring

**Symptom:** `outline: 0` or `outline: none` with no replacement — WCAG failure

```css
/* Before — accessibility violation */
button:focus { outline: none; }

/* After */
button:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);   /* 0 0 0 3px rgba(29,78,216,0.35) */
}

/* Note: :focus-visible only triggers on keyboard navigation,  */
/* not mouse clicks — no visual noise for mouse users          */
```

---

## Audit Scoring

After completing the audit table, calculate a compliance score:

```
Score = (compliant components / total components) × 100
```

| Score | Status | Action |
|-------|--------|--------|
| 90–100% | Compliant | Minor polish pass |
| 70–89% | Needs work | Prioritize P1 violations |
| 50–69% | Non-compliant | Systematic refactor required |
| < 50% | Critical | Design system rebuild |

A score below 70% should block a major milestone or public release in an educational institution context.

---

## Audit Workflow Checklist

- [ ] List all unique component types in the UI
- [ ] Open DevTools and inspect computed styles for each
- [ ] Record actual `border-radius` values (not source — computed)
- [ ] Note every spacing value that is not in: `2, 4, 8, 12, 16, 24, 32, 48, 64, 96`
- [ ] Record all `box-shadow` properties — note if functional (overlay) or decorative
- [ ] Check font sizes against the type scale
- [ ] Verify all `line-height` values are unitless ratios
- [ ] Test every focusable element with keyboard — verify visible focus ring
- [ ] Run color contrast check (use browser DevTools or axe extension)
- [ ] Calculate final compliance score
- [ ] Create prioritized fix list ordered: Critical → High → Medium
