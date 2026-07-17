# Design System — IAASE

> Compact “Ops Center Noir” aesthetic adapted for the IAASE iPhone Marketplace deal finder.
> Borrowed from a denser ops dashboard for density and calm night viewing — **brand and content are IAASE**, not the source project.

## Aesthetic Direction

**Ops Center Noir (adapted)** — Dark, data-dense UI for sustained watching of listings. High information per pixel, low chrome. Philippine accents encode meaning: blue = info, red = alerts/red flags, yellow/green = live/deal-positive.

Keep compactness: tight padding, mono for numbers, short labels, avoid marketing fluff on the board.

---

## Brand

| Element | Value |
|---------|--------|
| Product | **IAASE** |
| Tagline (nav, sm+) | iPhone deals |
| Primary job | Spot underpriced / risky Marketplace iPhones fast |
| Primary CTA | View listings |

---

## Color System

Colors live in `web/app/globals.css` (Tailwind CSS variables as RGB channels). Prefer tokens over raw hex in components.

### Dark (default for ops feel)

| Token | Role |
|-------|------|
| `--background` | Deep navy / near-black page |
| `--foreground` | Primary text |
| `--card` | Panels / preview cards |
| `--primary` | Actions, links, live dot |
| `--muted-foreground` | Secondary text, timestamps |
| `--destructive` / rose accents | Red flags, critical |

### Semantic accents (use sparingly)

| Meaning | Usage |
|---------|--------|
| Deal positive | Emerald badges (A/B scores) |
| Alert | Rose / destructive borders on risk blocks |
| Live | Primary blue glow on brand dot |

---

## Typography

| Role | Font | Notes |
|------|------|--------|
| UI / body | Fira Sans (`--font-sans`) | Layout, copy |
| Data | Fira Code (`--font-mono`) | Prices, %, scores |

Headlines: semibold, tight tracking. Body: short sentences. Prefer one support line under a hero headline.

---

## Layout density

- Max content width: `max-w-6xl`
- Mobile padding: `px-3`; `sm:px-4`; `lg:px-6`
- Section gaps: ~`space-y-10` on landing (not huge marketing whitespace)
- Cards: thin borders `border-border/70`, muted fills `bg-card/60–80`
- **No emoji icons** — Lucide / Heroicons only
- Clickable: `cursor-pointer` + 150–200ms color transitions

---

## Navigation (mobile-first)

| Breakpoint | Behavior |
|------------|----------|
| `< sm` | Brand + theme + hamburger; links in expand panel |
| `sm+` | Brand + subtitle · Listings · Login · Theme |

Do not put full “View listings” + Login + theme + long subtitle on one mobile row.

---

## Landing structure

1. Hero: brand, one headline, one support line, one primary CTA (+ quiet Login)
2. Live preview card (product truth)
3. How it works — 3 compact steps
4. Why — short bullet list (not a card grid)
5. Final CTA strip

Hero must still read as IAASE if nav is removed.

---

## Dashboard / listings

Keep ops density: tables/cards with mono prices, deal badges, signal pills. Prefer horizontal density on desktop; stack on mobile. Respect `prefers-reduced-motion`.

---

## Anti-patterns

- Generic purple SaaS gradients / glow stacks
- Cramped mobile nav with multiple labeled buttons
- Long hero copy walls
- Emoji as UI icons
- Treating source-project names (e.g. Bantay) as this product’s brand
