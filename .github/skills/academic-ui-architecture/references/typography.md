# Typography Reference

## Principle

Typography is the **primary** instrument of visual hierarchy in academic interfaces. Whitespace, weight, and size do all the work that rounded corners and shadows do in consumer products — but with greater authority and less noise.

---

## Type Scale

Use a modular scale with a ratio of **1.25** (Major Third), anchored at 16px base.

| Token | Size | Ratio step | Rounding |
|-------|------|-----------|---------|
| `--font-size-xs` | 11px | −2 | editorial floor |
| `--font-size-sm` | 12px | −1.5 | captions, labels |
| `--font-size-base` | 14px | −0.5 | body default |
| `--font-size-md` | 16px | 0 — anchor | body large, subheading |
| `--font-size-lg` | 20px | +1 | subheading, card title |
| `--font-size-xl` | 24px | +2 | heading |
| `--font-size-2xl` | 28px | +3 | section heading |
| `--font-size-3xl` | 36px | +4 | page display title |

> Note: Values are rounded to nearest integer. Never interpolate between steps.

---

## Hierarchy Levels

### Display (Page Title)
```css
font-size: var(--font-size-3xl);   /* 36px */
font-weight: 700;
line-height: 1.2;
letter-spacing: -0.02em;           /* tighten at large sizes */
color: var(--color-text-primary);
```

### H1 — Primary Heading
```css
font-size: var(--font-size-2xl);   /* 28px */
font-weight: 700;
line-height: 1.25;
letter-spacing: -0.01em;
```

### H2 — Section Heading
```css
font-size: var(--font-size-xl);    /* 24px */
font-weight: 600;
line-height: 1.3;
letter-spacing: 0;
```

### H3 — Subheading
```css
font-size: var(--font-size-lg);    /* 20px */
font-weight: 600;
line-height: 1.35;
```

### H4 — Component Heading
```css
font-size: var(--font-size-md);    /* 16px */
font-weight: 600;
line-height: 1.4;
```

### Body — Default Prose
```css
font-size: var(--font-size-base);  /* 14px */
font-weight: 400;
line-height: 1.6;                  /* critical for reading comprehension */
color: var(--color-text-primary);
max-width: 72ch;                   /* mandatory line-length cap */
```

### Body Large — Introductory Text
```css
font-size: var(--font-size-md);    /* 16px */
font-weight: 400;
line-height: 1.6;
```

### Caption
```css
font-size: var(--font-size-sm);    /* 12px */
font-weight: 400;
line-height: 1.5;
color: var(--color-text-secondary);
```

### Label (UI Labels, Form Labels)
```css
font-size: var(--font-size-xs);    /* 11–12px */
font-weight: 500;
line-height: 1.4;
text-transform: uppercase;
letter-spacing: 0.06em;
color: var(--color-text-secondary);
```

### Code / Monospace
```css
font-size: var(--font-size-sm);    /* 12–13px */
font-family: var(--font-family-mono);
line-height: 1.55;
```

---

## Font Families

### Recommended Academic Stacks

**Primary (sans-serif, reading):**
```css
--font-family-sans: 'Inter', 'IBM Plex Sans', system-ui, -apple-system, sans-serif;
```
- Inter: narrow, high x-height, high legibility in dense layouts
- IBM Plex Sans: institutional origin, excellent differentiation of similar glyphs

**Secondary (display, headings):**
```css
--font-family-display: 'DM Sans', 'Inter', sans-serif;
```

**Monospace (code, data):**
```css
--font-family-mono: 'IBM Plex Mono', 'Fira Code', 'Cascadia Code', monospace;
```

**Avoid in academic contexts:**
- Nunito, Poppins, Quicksand — too rounded, consumer-register
- Playfair Display, Merriweather — serif body text hurts screen legibility at 14–16px
- Any variable font with aggressive optical sizing that inflates weight at small sizes

---

## Alignment Rules

### Horizontal Alignment

| Context | Alignment | Reason |
|---------|-----------|--------|
| Body prose | `left` (LTR) | Ragged right is faster to read |
| Table cells (text) | `left` | Consistent indent for scanning |
| Table cells (numbers) | `right` | Digit alignment |
| Headings in page header | `left` | Never center align H1 in dashboard contexts |
| Hero / landing headline | `center` only if < 4 words | Prevents awkward orphans |
| Labels above fields | `left` | Standard form convention |
| Captions under figures | `left` | |

> **Never** use `text-align: justify` — produces uneven word spacing that impedes comprehension.

### Vertical Alignment (within UI components)

```css
/* Icon + label alignment */
.label-with-icon {
  display: inline-flex;
  align-items: center;   /* NOT baseline — center is more stable cross-browser */
  gap: 8px;
}

/* Multi-line cell content in tables */
td { vertical-align: top; }

/* Single-line cells (KPI, badges) */
td.cell--single { vertical-align: middle; }
```

---

## Whitespace as Hierarchy Tool

Use vertical space to group and separate — not horizontal rules or dividers.

### Spacing Between Hierarchy Levels

```
Display title
  ↕ 32px
Section heading
  ↕ 16px
Body paragraph
  ↕ 12px (paragraph gap)
  
Heading → body separation: 16px
Heading → preceding section separation: 48px minimum
```

### Orphan Control

Prevent single-word last lines on headings:
```css
h1, h2, h3 {
  text-wrap: balance;   /* supported in Chrome 114+, Firefox 121+ */
}
/* Fallback: max-width constraint to force natural breaks */
h1 { max-width: 20ch; }
```

---

## Anti-Patterns

```css
/* BAD */
font-size: 13px;                 /* off-scale */
line-height: 20px;               /* px line-height — breaks with zoom */
letter-spacing: 0.1em;           /* too loose on body text */
text-transform: uppercase;       /* on body text — reduces legibility ~12% */
font-weight: 300;                 /* light weight on screen — insufficient contrast */
h1 { text-align: center; }       /* wide headings centered = awkward reflow */
p { text-align: justify; }       /* uneven word spacing */

/* GOOD */
font-size: var(--font-size-base); /* 14px — on-scale */
line-height: 1.6;                  /* unitless ratio */
letter-spacing: 0;                 /* default for body */
font-weight: 400;                  /* regular weight for body */
h1 { text-align: left; }          /* flush-left authority */
```

---

## Accessibility Requirements

| Check | Requirement |
|-------|------------|
| Body text contrast | ≥ 4.5:1 against background |
| Large text (18px+ or 14px bold) | ≥ 3:1 |
| Disabled/placeholder text | ≥ 3:1 recommended (WCAG 2.2 advisory) |
| Minimum tap target | 44×44px (applies to linked text) |
| No text in images | Use actual text — required for screen reader and zoom |
| Line length | 45–75 characters per line for optimal reading |
