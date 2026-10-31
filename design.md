# Design: CineBlaze

The locked system. Every Hallmark run reads this first and pages share it. Change it on purpose; the file is the rule.

## System

- Genre: atmospheric
- Shape of the first page: app screen
- Theme: Kiln (ember colourway)
- Axes: dark/high-contrast-serif/warm · posture: full-palette · contrast: pass
- Signature: the title row, its rating keyed to the heat ramp
- Ramp: rating → heat step (`--heat-1` through `--heat-5`)

## Tokens

`web/src/app/tokens.css` is the source of truth. The roles:

```css
:root {
  --color-paper: oklch(13% 0.012 40);
  --color-paper-2: oklch(16% 0.015 40);
  --color-paper-3: oklch(20% 0.018 40);
  --color-ink: oklch(94% 0.02 80);
  --color-ink-2: oklch(85% 0.02 80);
  --color-muted: oklch(62% 0.015 60);
  --color-rule: oklch(24% 0.015 40);
  --color-accent: oklch(70% 0.2 45);
  --color-accent-ink: oklch(14% 0.02 40);
  --color-focus: oklch(76% 0.19 56);
  --font-display: "Boska", serif;
  --font-body: "Geist", sans-serif;
  --font-outlier: "Geist Mono", monospace;
  --radius-card: 28px;
  --radius-well: 16px;
  --radius-pill: 9999px;
  --rule-hair: 1px;
  --shadow-card: 0 50px 90px -30px oklch(8% 0.01 40 / 0.5);
}
```

The spacing scale, the type scale, the easings and the durations live in `tokens.css`.

## Controls

- Primary: ember fill (`--color-accent`) with `--color-accent-ink` text · pill radius (`9999px`) · min-h 36px (app) / 48px (page) with 44px hit target
- Secondary: ghost with 1px inset `--color-rule` ring, cream text · same radius and height
- Quiet: transparent, text `--color-ink-2` hovering to `--color-ink`
- Field edge: minimum 3:1 contrast against surrounding surface (`--color-muted` edge or step-off fill)

## Primitives Layer

All UI elements consume the seven Hallmark primitives in `web/src/components/ui/`:

1. `Button`: all eight interactive states, no gradients
2. `Label`: sentence-case, untracked, replaces tracked uppercase eyebrows
3. `Well`: single containment layer, non-nested, zero blur
4. `Frame`: `min(2vw, 28px)` radius with 1px inset cream ring at 8%
5. `Figure`: Boska 500 tabular lining numerals
6. `Rating`: heat-ramp colored Figure with discrete source Label
7. `Pill`: sentence-case filter / refinement / mood controls

## Motion

- Character: calm; motion-safe wrappers on all CSS animations; reduced motion ends transitions at once.

## Exports

- `web/src/app/tokens.css` (Tailwind CSS v4 `@theme static`)
- `web/src/app/base.css` (document layer base)
- `web/src/app/globals.css` (Hallmark stamped)
