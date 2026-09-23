# CLAUDE.md — rdnt labs marketing site

Project brief for Claude Code sessions. Read this first; it captures decisions
made across many sessions so you don't re-litigate or undo them.

## What this is

Multi-page marketing site for **Radiant Labs** (the AI systems division of
Radiant Group, Dubai).

- **Live:** https://rdnt-labs.vercel.app
- **Repo:** https://github.com/abrarjunaid/radiant-labs (`main`)
- **Deploy:** push to `main` = automatic Vercel production deploy (project
  `rdnt-labs`, git-connected). No manual deploy needed. `vercel.json` handles
  clean URLs and asset caching.

## Positioning (settled after several pivots — do not drift)

**Bespoke ERP and CRM systems**, niched by service, not industry.

Core pitch: custom ERPs used to cost hundreds of thousands and take a year;
AI collapsed that to weeks at a fraction of the cost, with changes shipping in
days. Visibility argument: one source of truth, real-time numbers, full audit
trail, no data silos. Every module ships AI-enabled (agents in the CRM,
extraction in the back office, anomaly alerts in reporting).

Case studies (case-studies.html) are five CRM/ERP builds: real estate
brokerage CRM, Dubai property management platform, manufacturing ERP, event
management ERP, rent-a-car ERP with AI WhatsApp front desk. Clients are named
by industry only.

## Copy rules (from the owner — enforce strictly)

1. **No em dashes anywhere in site copy.** Use periods, commas, colons,
   parentheses. Check with `grep "—" *.html` before committing.
2. **Meta `<title>`/descriptions use `Radiant Labs`** (format:
   `Page | Radiant Labs`; the home page is just `Radiant Labs`). The
   lowercase `rdnt labs` styling was dropped in Sept 2026. The UI logo is a
   lockup: the Radiant monogram
   (owner-supplied artwork, traced to three paths as the inline `#rl-mark`
   SVG symbol at the top of each page's `<body>`) in brand blue, with
   "RadiantLabs" (one word, no space) beside it in Urbanist Bold. Used by `.logo` in the header
   and footer. Keep the symbol, the Urbanist font link and the markup in
   sync across all pages. `public/favicon.svg` is the monogram on a dark
   tile. The mark uses `currentColor`, so never hard-code its fill.
3. **Never name client companies** in case studies; industry descriptors only.
4. Tone: Hormozi-style direct response. Short punchy sentences. No AI jargon.
5. Metrics are `[X]` placeholders wrapped in `<span class="ph">` until the
   owner supplies real figures. **Do not invent performance statistics**; this
   was explicitly held back even when asked. Turn owner-provided rough truths
   into defensible copy instead.

## Stack & commands

Vite multi-page vanilla JS. Pages: index, services, case-studies, about,
contact (each a root-level .html). The old process page was merged into
services.html as the `#process` section; vercel.json redirects /process there.

```
npm install
npm run dev      # localhost:5173 (launch.json name: rdnt-labs)
npm run build    # must pass before every push
```

- `src/main.js` — shared: Lenis smooth scroll (exposes `window.__lenis`),
  GSAP ScrollTrigger reveals ([data-reveal]/[data-reveal-group]), process
  line drawing, nav, contact form (client-side success only).
- `src/hero3d.js` — home hero Three.js node-sphere (lazy-loaded).
- `src/flight.js` — the case-studies "flight" (see below).
- `src/styles/main.css` — whole design system. Tokens default to the black
  base (accent #4d8dff); `body.theme-light` swaps them to the white theme.
  Every page is `theme-light` except case-studies, which stays dark for the
  flight. Product-UI panels (module tiles, AI stage, final CTA) are dark on
  purpose.

## The case-studies flight (src/flight.js) — fragile, read before touching

Scroll-driven Three.js journey: 900vh spacer, camera on Catmull-Rom keyframes
past 5 planets (Earth, Saturn, Mars, Neptune, Jupiter) to a sun. DOM cards
fade in/out on scroll envelopes. HUD rail + telemetry. Bloom on desktop.

Invariants when editing paths or sections:
- `SECTIONS`, `CAMERA_KEYS`, `ROCKET_KEYS`, label envelopes, DOM overlay
  envelopes, HUD ticks (7 buttons in the HTML), and the CSS spacer height
  must stay consistent with each other.
- **The rocket must stay ~12-17 units ahead of the camera's z at every p**,
  or it vanishes behind the camera (this bug happened once). Verify path
  changes mathematically: sample p 0..1, check camera-frustum containment
  and planet clearance (a throwaway node script importing CAMERA_KEYS /
  ROCKET_KEYS from flight.js works; three is importable in node).
- Deep-link `?p=0.45` jumps into the flight (dev aid).
- Case cards have `data-lenis-prevent` so they scroll internally; keep it.
- Reduced motion / no-JS falls back to stacked static cards (`flight-on`
  class gates everything).

## Case study images

Cards load `/case-images/<name>.png` with an inline `onerror` fallback to a
designed SVG placeholder. Owner drops real product screenshots (~1200x600,
client data blurred) into `public/case-images/` with these names and they
appear automatically: `crm-realestate.png`, `property-management.png`,
`manufacturing-erp.png`, `events-erp.png`, `rentacar-erp.png`.

## Assets & licensing

- Planet/sun/sky textures: Solar System Scope, CC BY 4.0. **Keep the
  attribution line in the case-studies footer.**
- `public/models/spaceship1.glb`: "Spaceship" by Finn The Frog,
  owner-supplied license. Currently a background flyby near Saturn; the hero
  rocket is procedural (makeShip in flight.js).

## Pending before real marketing push

- Replace all `[X]` placeholder metrics (owner to supply real numbers).
- Replace placeholder case screenshots (see above). Blur personal data first;
  note the visible "placeholders" notice in the case-studies intro must be
  removed once done.
- Footer/contact placeholders: WhatsApp `+971 XX XXX XXXX`, social links
  (`#`), confirm `hello@radiantlabs.ae` is real.
- Contact form has no backend (shows a client-side success message only).
  Wire to Formspree/Web3Forms or similar.
- The marquee under the hero (`.marquee-track` in index.html) shows the five
  industries, not client logos, because clients are not named. If the owner
  gets logo permission, swap the `<li>` items for `<img>` logos (mono, ~28px
  tall) and keep the list repeated three times for the seamless loop.

## Git conventions

Owner's account pushes via HTTPS + macOS keychain (machine-dependent; set up
auth per machine). Run `npm run build` and the em-dash grep before pushing;
every push deploys to production.
