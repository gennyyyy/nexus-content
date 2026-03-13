# Design Tokens Reference

## Philosophy

Design tokens are the single source of truth for every visual decision. **No raw value ever appears twice.** If you find yourself writing `border-radius: 4px` directly in a component stylesheet, stop — define or reference a token.

Tokens enforce the academic constraint system at the infrastructure level. A linter rule (`stylelint-no-raw-values` or equivalent) should block non-token values in CI.

---

## Complete Token Set (CSS Custom Properties)

Add this to a global `:root` block, or to your design system's theme provider.

```css
:root {

  /* ─── Spacing Scale (8-point) ───────────────────────────── */
  --spacing-0:   0px;
  --spacing-2:   2px;
  --spacing-4:   4px;
  --spacing-8:   8px;
  --spacing-12:  12px;
  --spacing-16:  16px;
  --spacing-24:  24px;
  --spacing-32:  32px;
  --spacing-48:  48px;
  --spacing-64:  64px;
  --spacing-96:  96px;
  --spacing-128: 128px;

  /* ─── Border Radius (academic constraint) ───────────────── */
  --radius-none: 0px;        /* tables, modals, nav — default for containers   */
  --radius-xs:   1px;        /* subtle, nearly imperceptible — structural use   */
  --radius-sm:   2px;        /* standard academic corner — cards, panels        */
  --radius-md:   4px;        /* maximum for interactive controls only           */
  /* radius-lg, radius-full are intentionally absent */

  /* ─── Typography ─────────────────────────────────────────── */
  --font-family-sans:    'Inter', 'IBM Plex Sans', system-ui, -apple-system, sans-serif;
  --font-family-display: 'DM Sans', 'Inter', sans-serif;
  --font-family-mono:    'IBM Plex Mono', 'Fira Code', monospace;

  --font-size-xs:   0.6875rem;  /* 11px */
  --font-size-sm:   0.75rem;    /* 12px */
  --font-size-base: 0.875rem;   /* 14px */
  --font-size-md:   1rem;       /* 16px */
  --font-size-lg:   1.25rem;    /* 20px */
  --font-size-xl:   1.5rem;     /* 24px */
  --font-size-2xl:  1.75rem;    /* 28px */
  --font-size-3xl:  2.25rem;    /* 36px */

  --font-weight-regular:  400;
  --font-weight-medium:   500;
  --font-weight-semibold: 600;
  --font-weight-bold:     700;

  --line-height-tight:    1.2;
  --line-height-snug:     1.35;
  --line-height-normal:   1.5;
  --line-height-relaxed:  1.6;   /* body prose — reading optimized */
  --line-height-loose:    1.75;

  --letter-spacing-tight:  -0.02em;  /* large display headings only */
  --letter-spacing-normal:  0em;
  --letter-spacing-wide:    0.04em;  /* labels at small sizes */
  --letter-spacing-wider:   0.06em;  /* uppercase labels */

  /* ─── Color — Academic Neutral Palette ──────────────────── */

  /* Backgrounds */
  --color-bg-page:     #F9F9FB;  /* off-white — reduces glare vs pure #FFF     */
  --color-bg-surface:  #FFFFFF;  /* cards, panels                               */
  --color-bg-sunken:   #F3F4F6;  /* table stripes, input backgrounds            */
  --color-bg-overlay:  rgba(0, 0, 0, 0.48); /* modal scrim                     */

  /* Borders */
  --color-border-default: #D1D5DB;  /* 1px borders on cards, inputs            */
  --color-border-strong:  #9CA3AF;  /* selected state, active inputs            */
  --color-border-subtle:  #E5E7EB;  /* table dividers, section breaks           */

  /* Text */
  --color-text-primary:   #111827;  /* headings, high-contrast body             */
  --color-text-secondary: #4B5563;  /* secondary labels, captions               */
  --color-text-tertiary:  #9CA3AF;  /* placeholder, disabled                    */
  --color-text-inverse:   #FFFFFF;  /* text on dark backgrounds                 */

  /* Brand / Accent — single institutional color */
  --color-accent:         #1D4ED8;  /* institutional blue — use sparingly        */
  --color-accent-hover:   #1E40AF;
  --color-accent-subtle:  #EFF6FF;  /* tinted background for highlights         */
  --color-accent-text:    #1D4ED8;  /* links, interactive labels                */

  /* Semantic States */
  --color-success:        #166534;
  --color-success-bg:     #F0FDF4;
  --color-warning:        #92400E;
  --color-warning-bg:     #FFFBEB;
  --color-error:          #991B1B;
  --color-error-bg:       #FEF2F2;
  --color-info:           #1E40AF;
  --color-info-bg:        #EFF6FF;

  /* ─── Elevation (academic system = no decorative shadows) ── */
  /* Shadows are reserved for functional elevation only.         */
  /* There are intentionally only 2 levels.                     */
  --shadow-none:   none;
  --shadow-focus:  0 0 0 3px rgba(29, 78, 216, 0.35);  /* focus ring only */
  --shadow-modal:  0 8px 32px rgba(0, 0, 0, 0.12);     /* modal overlay — functional */

  /* ─── Borders ─────────────────────────────────────────────── */
  --border-width-thin:   1px;
  --border-width-medium: 2px;   /* active/selected state borders */
  --border-default: var(--border-width-thin) solid var(--color-border-default);
  --border-strong:  var(--border-width-medium) solid var(--color-border-strong);
  --border-subtle:  var(--border-width-thin) solid var(--color-border-subtle);

  /* ─── Z-Index Scale ─────────────────────────────────────── */
  --z-base:    0;
  --z-raised:  10;    /* sticky headers, floating labels */
  --z-overlay: 100;   /* dropdowns, tooltips             */
  --z-modal:   200;   /* dialogs                         */
  --z-toast:   300;   /* notifications                   */

  /* ─── Transitions ───────────────────────────────────────── */
  --duration-instant: 0ms;
  --duration-fast:    100ms;
  --duration-base:    150ms;
  --duration-slow:    250ms;
  --easing-default:   cubic-bezier(0.4, 0, 0.2, 1);

  /* ─── Layout ────────────────────────────────────────────── */
  --grid-columns:     12;
  --grid-gap:         var(--spacing-24);
  --grid-max-width:   1280px;
  --content-max-width: 72ch;  /* prose column */
  --sidebar-width:    256px;

}
```

---

## Token Usage Patterns

### Component Styling

```css
/* Card */
.card {
  background:    var(--color-bg-surface);
  border:        var(--border-default);
  border-radius: var(--radius-sm);         /* 2px */
  padding:       var(--spacing-24);
}

/* Primary Button */
.btn-primary {
  background:    var(--color-accent);
  color:         var(--color-text-inverse);
  padding:       var(--spacing-8) var(--spacing-16);
  border-radius: var(--radius-md);          /* 4px — max for controls */
  border:        none;
  font-size:     var(--font-size-base);
  font-weight:   var(--font-weight-semibold);
  transition:    background var(--duration-fast) var(--easing-default);
}

.btn-primary:hover  { background: var(--color-accent-hover); }
.btn-primary:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

/* Input */
.input {
  border:        var(--border-default);
  border-radius: var(--radius-sm);
  padding:       var(--spacing-8) var(--spacing-12);
  font-size:     var(--font-size-base);
  background:    var(--color-bg-surface);
  color:         var(--color-text-primary);
  transition:    border-color var(--duration-fast) var(--easing-default);
}

.input:focus {
  outline:       none;
  border-color:  var(--color-accent);
  box-shadow:    var(--shadow-focus);
}

/* Table */
.table {
  border-collapse: collapse;
  width: 100%;
  font-size: var(--font-size-base);
}

.table th {
  text-align:     left;
  padding:        var(--spacing-8) var(--spacing-12);
  font-size:      var(--font-size-xs);
  font-weight:    var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wider);
  color:          var(--color-text-secondary);
  border-bottom:  var(--border-strong);
}

.table td {
  padding:       var(--spacing-8) var(--spacing-12);
  border-bottom: var(--border-subtle);
  vertical-align: top;
}

.table tr:hover td { background: var(--color-bg-sunken); }
```

---

## Token Enforcement

Add to your linting config to block raw values:

### Stylelint (CSS/SCSS)

```json
{
  "rules": {
    "declaration-property-value-disallowed-list": {
      "border-radius": ["/[5-9][0-9]+px/", "/[1-9][0-9]{2,}px/", "50%", "9999px", "100%"]
    }
  }
}
```

### ESLint (CSS-in-JS / Tailwind)

```js
// For Tailwind — create a safelist config that blocks forbidden classes
// tailwind.config.js
module.exports = {
  theme: {
    borderRadius: {
      'none': '0px',
      'xs':   '1px',
      'sm':   '2px',    // default academic corner
      'md':   '4px',    // max for controls
      // 'lg', 'xl', 'full' intentionally removed
    }
  }
}
```

---

## Dark Mode Overrides

Academic dark mode should reduce glare, not introduce color. Keep the same structural token names:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-page:    #0F172A;
    --color-bg-surface: #1E293B;
    --color-bg-sunken:  #0F172A;

    --color-border-default: #334155;
    --color-border-strong:  #475569;
    --color-border-subtle:  #1E293B;

    --color-text-primary:   #F1F5F9;
    --color-text-secondary: #94A3B8;
    --color-text-tertiary:  #475569;

    --color-accent:         #3B82F6;
    --color-accent-hover:   #60A5FA;
    --color-accent-subtle:  #1E3A5F;
    --color-accent-text:    #60A5FA;
  }
}
```
