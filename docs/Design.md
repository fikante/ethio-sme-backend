# Design Guide: EthioSME (Black & White)

This document is a friendly, practical reference for building our frontend UI. We borrow the best parts of Linear’s design discipline (typography, spacing, elevation, interaction restraint) but our brand expression is simpler: **black + white, with disciplined neutrals**.

**Canonical colors** live as HSL semantic tokens (e.g. `--background`, `--foreground`, `--primary`) in `resources/css/app.css`. The values in this doc should match those roles, even if the exact numbers evolve.

## 1. Visual Theme & Atmosphere

Linear’s language is a masterclass in dark-mode-first product design — a near-black canvas where content emerges from darkness. In **EthioSME**, the dark page canvas is `--background` at `hsl(0 0% 3.9%)` (`#0a0a0a`), with hierarchy carried by neutrals, borders, and muted text (`--muted-foreground`, `--border`) rather than heavy chroma. The result should feel precise and calm: subtle borders, soft foreground text (`--foreground` at `hsl(0 0% 98%)` in dark mode), and very intentional emphasis.

The typography system is built entirely on Inter Variable with OpenType features `"cv01"` and `"ss03"` enabled globally, giving the typeface a cleaner, more geometric character. Inter is used at a remarkable range of weights — from 300 (light body) through 510 (medium, Linear's signature weight) to 590 (semibold emphasis). The 510 weight is particularly distinctive: it sits between regular and medium, creating a subtle emphasis that doesn't shout. At display sizes (72px, 64px, 48px), Inter uses aggressive negative letter-spacing (-1.584px to -1.056px), creating compressed, authoritative headlines that feel engineered rather than designed. Berkeley Mono serves as the monospace companion for code and technical labels, with fallbacks to ui-monospace, SF Mono, and Menlo.

The color system stays almost entirely achromatic — dark backgrounds with white/gray text — punctuated by **one disciplined “primary”** for actions. Because our frontend is **black and white**, we keep primary actions neutral too:

- **Light mode primary**: near-black fill (`--primary`) with white text (`--primary-foreground`)
- **Dark mode primary**: near-white fill (`--primary`) with near-black text (`--primary-foreground`)

Borders use light grays in light mode (`--border`) and deep neutrals in dark; translucent white hairlines can be emulated with opacity on dark surfaces when building marketing-style sections.

**Key Characteristics:**
- Dark-mode-native: page `--background` `hsl(0 0% 3.9%)`, cards/popovers align with `--card`, sidebar with `--sidebar-background` (see §2)
- Inter Variable with `"cv01", "ss03"` globally — geometric alternates for a cleaner aesthetic
- Signature weight 510 (between regular and medium) for most UI text
- Aggressive negative letter-spacing at display sizes (-1.584px at 72px, -1.056px at 48px)
- Primary actions: **light** — `--primary` near-black with white text; **dark** — `--primary` near-white with near-black text; chart/status hues from `--chart-1` … `--chart-5` only where data or status needs color
- Border discipline: `--border` / `--input`; focus with `--ring` (light `hsl(0 0% 3.9%)`, dark `hsl(0 0% 83.1%)`)
- Ghost / subtle surfaces: still use low-opacity neutrals on dark (`--secondary`, `--accent`, `--muted`) per Linear’s stacking model
- Multi-layered shadows with inset variants for depth on dark surfaces
- Radix UI primitives as the component foundation (6 detected primitives)
- Success / status: prefer `--chart-*` and destructive `--destructive` for errors — still sparse, not decorative

## 2. Color Palette & Roles

Values are **HSL** as in `resources/css/app.css`. Approximate **hex** in parentheses for quick reference only.

### Light mode (`:root`)

**Background & surfaces**
- **Page** — `--background` `hsl(0 0% 100%)` (~`#ffffff`)
- **Foreground (default text)** — `--foreground` `hsl(0 0% 3.9%)` (~`#0a0a0a`)
- **Card / elevated surface** — `--card` `hsl(0 0% 100%)`, `--card-foreground` `hsl(0 0% 3.9%)`
- **Popover** — `--popover` / `--popover-foreground` (same as card in default theme)
- **Muted surface** — `--muted` `hsl(0 0% 96.1%)` (~`#f5f5f5`); **muted text** — `--muted-foreground` `hsl(0 0% 45.1%)` (~`#737373`)
- **Secondary surface** — `--secondary` `hsl(0 0% 92.1%)` (~`#ebebeb`); **text** — `--secondary-foreground` `hsl(0 0% 9%)`
- **Accent surface** — `--accent` `hsl(0 0% 96.1%)`; **text** — `--accent-foreground` `hsl(0 0% 9%)`

**Brand & primary actions**
- **Primary (CTA fill)** — `--primary` `hsl(0 0% 9%)` (~`#171717`); **on-primary text** — `--primary-foreground` `hsl(0 0% 98%)`
- **Focus / strong ring** — `--ring` `hsl(0 0% 3.9%)`; **sidebar focus** — `--sidebar-ring` `hsl(217.2 91.2% 59.8%)` (~`#5b8def`)

**Borders & inputs**
- **Border** — `--border` `hsl(0 0% 92.8%)` (~`#ededed`)
- **Input** — `--input` `hsl(0 0% 89.8%)` (~`#e5e5e5`)

**Status & data**
- **Destructive** — `--destructive` `hsl(0 84.2% 60.2%)` (~`#ef4444`); **text** — `--destructive-foreground` `hsl(0 0% 98%)`
- **Charts** — `--chart-1` `hsl(12 76% 61%)`, `--chart-2` `hsl(173 58% 39%)`, `--chart-3` `hsl(197 37% 24%)`, `--chart-4` `hsl(43 74% 66%)`, `--chart-5` `hsl(27 87% 67%)` (use sparingly for series / status, Linear-style)

**Sidebar (light)**
- `--sidebar-background` `hsl(0 0% 98%)`, `--sidebar-foreground` `hsl(240 5.3% 26.1%)`, `--sidebar-primary` `hsl(0 0% 10%)`, `--sidebar-primary-foreground` `hsl(0 0% 98%)`, `--sidebar-accent` `hsl(0 0% 94%)`, `--sidebar-accent-foreground` `hsl(0 0% 30%)`, `--sidebar-border` `hsl(0 0% 91%)`, `--sidebar` `hsl(0 0% 98%)`

**Radius**
- `--radius` `0.5rem` (8px at 16px root) — maps to Tailwind `rounded-lg` family in the app shell.

### Dark mode (`.dark`)

**Background & surfaces**
- **Page** — `--background` `hsl(0 0% 3.9%)` (~`#0a0a0a`) — same *role* as Linear’s marketing black.
- **Foreground** — `--foreground` `hsl(0 0% 98%)` (~`#fafafa`)
- **Card** — `--card` / `--card-foreground` aligned with dark surfaces and light text
- **Muted** — `--muted` `hsl(0 0% 16.08%)`; **muted text** — `--muted-foreground` `hsl(0 0% 63.9%)`
- **Secondary** — `--secondary` `hsl(0 0% 14.9%)`; **accent** — `--accent` `hsl(0 0% 14.9%)`

**Brand & primary actions (inverted for dark UI)**
- **Primary button fill** — `--primary` `hsl(0 0% 98%)`; **text on primary** — `--primary-foreground` `hsl(0 0% 9%)`
- **Ring** — `--ring` `hsl(0 0% 83.1%)`; **sidebar-ring** — `hsl(217.2 91.2% 59.8%)`

**Borders & inputs**
- **Border / input** — `hsl(0 0% 14.9%)` (~`#262626`)

**Charts (dark)** — `--chart-1` `hsl(220 70% 50%)`, `--chart-2` `hsl(160 60% 45%)`, `--chart-3` `hsl(30 80% 55%)`, `--chart-4` `hsl(280 65% 60%)`, `--chart-5` `hsl(340 75% 55%)`

**Sidebar (dark)** — `--sidebar-background` `hsl(0 0% 7%)`, `--sidebar-foreground` `hsl(0 0% 95.9%)`, `--sidebar-accent` `hsl(0 0% 15.9%)`, `--sidebar-border` `hsl(0 0% 15.9%)`, `--sidebar` `hsl(240 5.9% 10%)`, etc. (see `app.css`)

### Overlay
- **Modal backdrop** — still use a near-opaque dark scrim (e.g. `rgba(0,0,0,0.85)`) for focus isolation; not token-named in `app.css` but consistent with Linear’s overlay behavior.

## 3. Typography Rules

### Font Family
- **Primary**: `Inter Variable`, with fallbacks: `SF Pro Display, -apple-system, system-ui, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue`
- **Monospace**: `Berkeley Mono`, with fallbacks: `ui-monospace, SF Mono, Menlo`
- **OpenType Features**: `"cv01", "ss03"` enabled globally — cv01 provides an alternate lowercase 'a' (single-story), ss03 adjusts specific letterforms for a cleaner geometric appearance.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display XL | Inter Variable | 72px (4.50rem) | 510 | 1.00 (tight) | -1.584px | Hero headlines, maximum impact |
| Display Large | Inter Variable | 64px (4.00rem) | 510 | 1.00 (tight) | -1.408px | Secondary hero text |
| Display | Inter Variable | 48px (3.00rem) | 510 | 1.00 (tight) | -1.056px | Section headlines |
| Heading 1 | Inter Variable | 32px (2.00rem) | 400 | 1.13 (tight) | -0.704px | Major section titles |
| Heading 2 | Inter Variable | 24px (1.50rem) | 400 | 1.33 | -0.288px | Sub-section headings |
| Heading 3 | Inter Variable | 20px (1.25rem) | 590 | 1.33 | -0.24px | Feature titles, card headers |
| Body Large | Inter Variable | 18px (1.13rem) | 400 | 1.60 (relaxed) | -0.165px | Introduction text, feature descriptions |
| Body Emphasis | Inter Variable | 17px (1.06rem) | 590 | 1.60 (relaxed) | normal | Emphasized body, sub-headings in content |
| Body | Inter Variable | 16px (1.00rem) | 400 | 1.50 | normal | Standard reading text |
| Body Medium | Inter Variable | 16px (1.00rem) | 510 | 1.50 | normal | Navigation, labels |
| Body Semibold | Inter Variable | 16px (1.00rem) | 590 | 1.50 | normal | Strong emphasis |
| Small | Inter Variable | 15px (0.94rem) | 400 | 1.60 (relaxed) | -0.165px | Secondary body text |
| Small Medium | Inter Variable | 15px (0.94rem) | 510 | 1.60 (relaxed) | -0.165px | Emphasized small text |
| Small Semibold | Inter Variable | 15px (0.94rem) | 590 | 1.60 (relaxed) | -0.165px | Strong small text |
| Small Light | Inter Variable | 15px (0.94rem) | 300 | 1.47 | -0.165px | De-emphasized body |
| Caption Large | Inter Variable | 14px (0.88rem) | 510–590 | 1.50 | -0.182px | Sub-labels, category headers |
| Caption | Inter Variable | 13px (0.81rem) | 400–510 | 1.50 | -0.13px | Metadata, timestamps |
| Label | Inter Variable | 12px (0.75rem) | 400–590 | 1.40 | normal | Button text, small labels |
| Micro | Inter Variable | 11px (0.69rem) | 510 | 1.40 | normal | Tiny labels |
| Tiny | Inter Variable | 10px (0.63rem) | 400–510 | 1.50 | -0.15px | Overline text, sometimes uppercase |
| Link Large | Inter Variable | 16px (1.00rem) | 400 | 1.50 | normal | Standard links |
| Link Medium | Inter Variable | 15px (0.94rem) | 510 | 2.67 | normal | Spaced navigation links |
| Link Small | Inter Variable | 14px (0.88rem) | 510 | 1.50 | normal | Compact links |
| Link Caption | Inter Variable | 13px (0.81rem) | 400–510 | 1.50 | -0.13px | Footer, metadata links |
| Mono Body | Berkeley Mono | 14px (0.88rem) | 400 | 1.50 | normal | Code blocks |
| Mono Caption | Berkeley Mono | 13px (0.81rem) | 400 | 1.50 | normal | Code labels |
| Mono Label | Berkeley Mono | 12px (0.75rem) | 400 | 1.40 | normal | Code metadata, sometimes uppercase |

### Principles
- **510 is the signature weight**: The Linear system uses Inter Variable's 510 weight (between regular 400 and medium 500) as its default emphasis weight. EthioSME keeps the same rule. This creates a subtly bolded feel without the heaviness of traditional medium or semibold.
- **Compression at scale**: Display sizes use progressively tighter letter-spacing — -1.584px at 72px, -1.408px at 64px, -1.056px at 48px, -0.704px at 32px. Below 24px, spacing relaxes toward normal.
- **OpenType as identity**: `"cv01", "ss03"` aren't decorative — they transform Inter into Linear's distinctive typeface, giving it a more geometric, purposeful character.
- **Three-tier weight system**: 400 (reading), 510 (emphasis/UI), 590 (strong emphasis). The 300 weight appears only in deliberately de-emphasized contexts.

## 4. Component Stylings

**EthioSME mapping:** Literal hex/rgba below are the **Linear reference** for marketing-style dark UI. In the app shell, prefer semantic classes (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-card`, `bg-primary`, etc.) from §2. Primary actions always use **`--primary`** / **`--primary-foreground`** (black/white), not extra chroma.

### Buttons

**Ghost Button (Default)**
- Background: `rgba(255,255,255,0.02)`
- Text: `#e2e4e7` (near-white)
- Padding: comfortable
- Radius: 6px
- Border: `1px solid rgb(36, 40, 44)`
- Outline: none
- Focus shadow: `rgba(0,0,0,0.1) 0px 4px 12px`
- Use: Standard actions, secondary CTAs

**Subtle Button**
- Background: `rgba(255,255,255,0.04)`
- Text: `#d0d6e0` (silver-gray)
- Padding: 0px 6px
- Radius: 6px
- Use: Toolbar actions, contextual buttons

**Primary Brand Button (EthioSME tokens)**
- Background: `var(--primary)` — light: `hsl(0 0% 9%)`; dark: `hsl(0 0% 98%)`
- Text: `var(--primary-foreground)`
- Padding: 8px 16px
- Radius: 6px (or `var(--radius)` / `0.5rem` in app shell)
- Hover: slight brightness / opacity shift (keep single accent discipline)
- Use: Primary CTAs ("Start building", "Sign up")

**Icon Button (Circle)**
- Background: `rgba(255,255,255,0.03)` or `rgba(255,255,255,0.05)`
- Text: `#f7f8f8` or `#ffffff`
- Radius: 50%
- Border: `1px solid rgba(255,255,255,0.08)`
- Use: Close, menu toggle, icon-only actions

**Pill Button**
- Background: transparent
- Text: `#d0d6e0`
- Padding: 0px 10px 0px 5px
- Radius: 9999px
- Border: `1px solid rgb(35, 37, 42)`
- Use: Filter chips, tags, status indicators

**Small Toolbar Button**
- Background: `rgba(255,255,255,0.05)`
- Text: `#62666d` (muted)
- Radius: 2px
- Border: `1px solid rgba(255,255,255,0.05)`
- Shadow: `rgba(0,0,0,0.03) 0px 1.2px 0px 0px`
- Font: 12px weight 510
- Use: Toolbar actions, quick-access controls

### Cards & Containers
- Background: `rgba(255,255,255,0.02)` to `rgba(255,255,255,0.05)` (never solid — always translucent)
- Border: `1px solid rgba(255,255,255,0.08)` (standard) or `1px solid rgba(255,255,255,0.05)` (subtle)
- Radius: 8px (standard), 12px (featured), 22px (large panels)
- Shadow: `rgba(0,0,0,0.2) 0px 0px 0px 1px` or layered multi-shadow stacks
- Hover: subtle background opacity increase

### Inputs & Forms

**Text Area**
- Background: `rgba(255,255,255,0.02)`
- Text: `#d0d6e0`
- Border: `1px solid rgba(255,255,255,0.08)`
- Padding: 12px 14px
- Radius: 6px

**Search Input**
- Background: transparent
- Text: `#f7f8f8`
- Padding: 1px 32px (icon-aware)

**Button-style Input**
- Text: `#8a8f98`
- Padding: 1px 6px
- Radius: 5px
- Focus shadow: multi-layer stack

### Badges & Pills

**Success Pill**
- Background: `#10b981` (Linear reference) — in EthioSME tokenized UI use e.g. **`--chart-2`** for success-like accents, still sparingly
- Text: near-white — **`--primary-foreground`** or **`--foreground`** as appropriate
- Radius: 50% (circular)
- Font: 10px weight 510
- Use: Status dots, completion indicators

**Neutral Pill**
- Background: transparent
- Text: `#d0d6e0`
- Padding: 0px 10px 0px 5px
- Radius: 9999px
- Border: `1px solid rgb(35, 37, 42)`
- Font: 12px weight 510
- Use: Tags, filter chips, category labels

**Subtle Badge**
- Background: `rgba(255,255,255,0.05)`
- Text: `#f7f8f8`
- Padding: 0px 8px 0px 2px
- Radius: 2px
- Border: `1px solid rgba(255,255,255,0.05)`
- Font: 10px weight 510
- Use: Inline labels, version tags

### Navigation
- Dark sticky header on near-black background (`--background` dark)
- Product logomark left-aligned (SVG icon)
- Links: Inter Variable 13–14px weight 510; light text on dark via `--foreground` / `--muted-foreground` hierarchy
- Active/hover: text lightens toward `--foreground`
- CTA: Primary button (`--primary`) or ghost button
- Mobile: hamburger collapse
- Search: command palette trigger (`/` or `Cmd+K`)

### Image Treatment
- Product screenshots on dark backgrounds with subtle border (`rgba(255,255,255,0.08)` or `border-border` in app)
- Top-rounded images: `12px 12px 0px 0px` radius
- Dashboard / module previews dominate feature sections
- Subtle shadow beneath screenshots: `rgba(0,0,0,0.4) 0px 2px 4px`

## 5. Layout Principles

### Spacing System
- Base unit: 8px
- Scale: 1px, 4px, 7px, 8px, 11px, 12px, 16px, 19px, 20px, 22px, 24px, 28px, 32px, 35px
- The 7px and 11px values suggest micro-adjustments for optical alignment
- Primary rhythm: 8px, 16px, 24px, 32px (standard 8px grid)

### Grid & Container
- Max content width: approximately 1200px
- Hero: centered single-column with generous vertical padding
- Feature sections: 2–3 column grids for feature cards
- Full-width dark sections with internal max-width constraints
- Changelog: single-column timeline layout

### Whitespace Philosophy
- **Darkness as space**: On EthioSME’s dark canvas (Linear language), empty space isn't white — it's absence. The near-black `--background` IS the whitespace, and content emerges from it.
- **Compressed headlines, expanded surroundings**: Display text at 72px with -1.584px tracking is dense and compressed, but sits within vast dark padding. The contrast between typographic density and spatial generosity creates tension.
- **Section isolation**: Each feature section is separated by generous vertical padding (80px+) with no visible dividers — the dark background provides natural separation.

### Border Radius Scale
- Micro (2px): Inline badges, toolbar buttons, subtle tags
- Standard (4px): Small containers, list items
- Comfortable (6px): Buttons, inputs, functional elements
- Card (8px): Cards, dropdowns, popovers
- Panel (12px): Panels, featured cards, section containers
- Large (22px): Large panel elements
- Full Pill (9999px): Chips, filter pills, status tags
- Circle (50%): Icon buttons, avatars, status dots

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (Level 0) | No shadow, `--background` (dark `hsl(0 0% 3.9%)`) | Page background, deepest canvas |
| Subtle (Level 1) | `rgba(0,0,0,0.03) 0px 1.2px 0px` | Toolbar buttons, micro-elevation |
| Surface (Level 2) | `rgba(255,255,255,0.05)` bg + `1px solid rgba(255,255,255,0.08)` border | Cards, input fields, containers |
| Inset (Level 2b) | `rgba(0,0,0,0.2) 0px 0px 12px 0px inset` | Recessed panels, inner shadows |
| Ring (Level 3) | `rgba(0,0,0,0.2) 0px 0px 0px 1px` | Border-as-shadow technique |
| Elevated (Level 4) | `rgba(0,0,0,0.4) 0px 2px 4px` | Floating elements, dropdowns |
| Dialog (Level 5) | Multi-layer stack: `rgba(0,0,0,0) 0px 8px 2px, rgba(0,0,0,0.01) 0px 5px 2px, rgba(0,0,0,0.04) 0px 3px 2px, rgba(0,0,0,0.07) 0px 1px 1px, rgba(0,0,0,0.08) 0px 0px 1px` | Popovers, command palette, modals |
| Focus | `rgba(0,0,0,0.1) 0px 4px 12px` + additional layers | Keyboard focus on interactive elements |

**Shadow Philosophy**: On dark surfaces, traditional shadows (dark on dark) are nearly invisible. Linear solves this by using semi-transparent white borders as the primary depth indicator. Elevation isn't communicated through shadow darkness but through background luminance steps — each level slightly increases the white opacity of the surface background (`0.02` → `0.04` → `0.05`), creating a subtle stacking effect. Map those steps to EthioSME tokens (`--secondary`, `--accent`, `--muted`, `--card`) where the app uses solid semantic colors. The inset shadow technique (`rgba(0,0,0,0.2) 0px 0px 12px 0px inset`) creates a unique "sunken" effect for recessed panels, adding dimensional depth that traditional dark themes lack.

## 7. Do's and Don'ts

### Do
- Use Inter Variable with `"cv01", "ss03"` on ALL text — these features are fundamental to Linear's typeface identity
- Use weight 510 as your default emphasis weight — it's Linear's signature between-weight
- Apply aggressive negative letter-spacing at display sizes (-1.584px at 72px, -1.056px at 48px)
- Build on near-black dark UI: `--background` `hsl(0 0% 3.9%)`, with panels/cards via `--card`, `--sidebar-background`, `--secondary`, `--accent` (see `app.css`)
- On marketing-style dark sections, prefer semi-transparent white borders (`rgba(255,255,255,0.05)` to `rgba(255,255,255,0.08)`); in the app shell use `--border` / `border-border` for consistency
- Keep ghost / subtle button surfaces low-contrast: `rgba(255,255,255,0.02)` to `rgba(255,255,255,0.05)` on dark, or `--secondary` / `--accent` tokens
- Reserve **`--primary`** for primary CTAs and key interactive emphasis only (near-black in light, near-white in dark)
- Use soft off-white for primary text on dark (`--foreground` `hsl(0 0% 98%)`) — avoid harsh pure white for long reading if mirroring Linear’s eye-comfort rule
- Apply the luminance stacking model: deeper = darker bg, elevated = slightly lighter bg

### Don't
- Don't use pure white as the only text color on dark for body copy if a softer `--foreground` reads better
- Don't use solid rainbow fills for chrome — keep neutrals + one primary accent family
- Don't spray **`--primary`** decoratively — it's reserved for interactive/CTA emphasis
- Don't use positive letter-spacing on display text — Inter at large sizes always runs negative
- Don't use heavy opaque borders on dark marketing-style layouts — prefer hairline / translucent borders; app chrome may use `--border` as defined
- Don't skip the OpenType features (`"cv01", "ss03"`) — without them, it's generic Inter, not Linear's Inter
- Don't use weight 700 (bold) — Linear's maximum weight is 590, with 510 as the workhorse
- Don't add random extra hues to chrome — status/data colors stay in **`--chart-*`** / **`--destructive`** and similar, used sparingly
- Don't use drop shadows for elevation on dark surfaces — use background luminance stepping instead

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile Small | <600px | Single column, compact padding |
| Mobile | 600–640px | Standard mobile layout |
| Tablet | 640–768px | Two-column grids begin |
| Desktop Small | 768–1024px | Full card grids, expanded padding |
| Desktop | 1024–1280px | Standard desktop, full navigation |
| Large Desktop | >1280px | Full layout, generous margins |

### Touch Targets
- Buttons use comfortable padding with 6px radius minimum
- Navigation links at 13–14px with adequate spacing
- Pill tags have 10px horizontal padding for touch accessibility
- Icon buttons at 50% radius ensure circular, easy-to-tap targets
- Search trigger is prominently placed with generous hit area

### Collapsing Strategy
- Hero: 72px → 48px → 32px display text, tracking adjusts proportionally
- Navigation: horizontal links + CTAs → hamburger menu at 768px
- Feature cards: 3-column → 2-column → single column stacked
- Product screenshots: maintain aspect ratio, may reduce padding
- Changelog: timeline maintains single-column through all sizes
- Footer: multi-column → stacked single column
- Section spacing: 80px+ → 48px on mobile

### Image Behavior
- Dashboard screenshots maintain border treatment at all sizes
- Hero visuals simplify on mobile (fewer floating UI elements)
- Product screenshots use responsive sizing with consistent radius
- Dark background ensures screenshots blend naturally at any viewport

## 9. Agent Prompt Guide

### Quick Color Reference (EthioSME / `app.css`)
- **Primary CTA (light):** `--primary` `hsl(0 0% 9%)` (~`#171717`); text `--primary-foreground` `hsl(0 0% 98%)`
- **Primary CTA (dark):** `--primary` `hsl(0 0% 98%)`; text `--primary-foreground` `hsl(0 0% 9%)`
- **Page (light):** `--background` white; **text** `--foreground` ~`#0a0a0a`
- **Page (dark):** `--background` `hsl(0 0% 3.9%)` (~`#0a0a0a`); **text** `--foreground` ~`#fafafa`
- **Card / popover:** `--card` / `--card-foreground`
- **Muted / helper text:** `--muted-foreground`
- **Borders / inputs:** `--border`, `--input`
- **Focus:** `--ring` (light near-black, dark light gray)
- **Destructive:** `--destructive` `hsl(0 84.2% 60.2%)` (light) / `hsl(0 84% 60%)` (dark)
- **Data / status accents:** `--chart-1` … `--chart-5` (sparingly)
- **Sidebar chrome:** `--sidebar-*` tokens

### Example Component Prompts
- "Create an EthioSME hero on dark `--background` `hsl(0 0% 3.9%)`. Headline 48px Inter Variable weight 510, line-height 1.00, letter-spacing -1.056px, color `--foreground`. Subtitle 18px weight 400, line-height 1.60, color `--muted-foreground`. Primary CTA `bg-primary text-primary-foreground` (dark mode: white primary with near-black text), ghost button `rgba(255,255,255,0.02)` bg, `1px solid rgba(255,255,255,0.08)` border, 6px radius."
- "Design a card: `bg-card text-card-foreground border border-border` (or marketing: `rgba(255,255,255,0.02)` bg, `1px solid rgba(255,255,255,0.08)` border), 8px radius. Title 20px Inter weight 590, letter-spacing -0.24px. Body 15px weight 400, `text-muted-foreground`, letter-spacing -0.165px."
- "Build a pill badge: transparent background, muted-foreground text, 9999px radius, `1px solid` neutral border (`--border` in app, or `#23252a` on raw dark marketing), 12px Inter weight 510."
- "Navigation: dark sticky header, `bg-background` or `bg-sidebar`. Inter 13px weight 510 links, `text-muted-foreground`, hover `text-foreground`. Primary CTA uses `--primary` / `--primary-foreground`. Bottom border `border-border` or `rgba(255,255,255,0.05)` on marketing."
- "Command palette: `bg-popover` (or elevated dark surface), `border-border` or `rgba(255,255,255,0.08)`, 12px radius, multi-layer shadow. Input 16px Inter weight 400, `text-foreground`. Results: 13px weight 510 labels, 12px metadata in `text-muted-foreground`."

### Iteration Guide
1. Always set font-feature-settings `"cv01", "ss03"` on all Inter text — this is non-negotiable for Linear's look
2. Letter-spacing scales with font size: -1.584px at 72px, -1.056px at 48px, -0.704px at 32px, normal below 16px
3. Three weights: 400 (read), 510 (emphasize/navigate), 590 (announce)
4. Surface elevation via background opacity on marketing dark UI: `rgba(255,255,255, 0.02 → 0.04 → 0.05)`; in the Laravel app prefer `--secondary` / `--accent` / `--muted` / `--card`
5. **One primary family (still neutral):** `--primary` for main CTAs (near-black in light, near-white in dark); extra hue only in charts/status (`--chart-*`, `--destructive`) — same discipline as Linear’s single accent, but in our case the “accent” stays black/white
6. Borders: app shell uses `--border`; marketing-style dark sections can use semi-transparent white hairlines
7. Berkeley Mono for any code or technical content, Inter Variable for everything else
