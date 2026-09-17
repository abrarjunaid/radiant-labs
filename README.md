# Radiant Labs — Marketing Site (RDNT Labs)

Multi-page marketing site for Radiant Labs, the AI systems division of Radiant Group.
Brand name in UI: **Radiant Labs**. SEO/browser title: **RDNT Labs**.

## Stack

- [Vite](https://vitejs.dev) — multi-page build (vanilla JS, no framework)
- [Three.js](https://threejs.org) — hero node-network scene + the Case Studies "flight" (a scroll-driven camera journey past procedural planets; see `src/flight.js`, deep-linkable with `?p=0..1`)
- [GSAP ScrollTrigger](https://gsap.com/scrolltrigger/) — scroll reveals, counters, process line
- [Lenis](https://lenis.darkroom.engineering) — smooth scroll

## Commands

```bash
npm install     # once
npm run dev     # dev server at http://localhost:5173
npm run build   # production build → dist/
npm run preview # serve the production build locally
```

## Pages

`index.html` · `services.html` · `case-studies.html` · `process.html` · `about.html` · `contact.html`

## Before publishing

- Replace every `[X]` placeholder metric (marked with dashed underlines and
  "PLACEHOLDER" notes) with real numbers — home stat cards, guarantee hours,
  case-study results.
- Replace the WhatsApp/phone placeholder (`+971 XX XXX XXXX`) in the footer,
  contact page, and contact aside.
- Confirm the contact email (currently `hello@radiantlabs.ae`) and wire the
  contact form to a real backend/endpoint — it currently shows a success
  message client-side only (see `.contact-form` handler in `src/main.js`).
- Point the social links (Instagram / LinkedIn / X) at real profiles.

## Asset credits

- Planet, sun, and Milky Way textures in `public/textures/` are from
  [Solar System Scope](https://www.solarsystemscope.com/textures/), licensed
  CC BY 4.0 — keep the attribution line in the Case Studies footer.
- `public/models/spaceship1.glb` — "Spaceship" by Finn The Frog (owner-supplied,
  licensed). If it ever renders tail-first, flip `SHIP_NOSE` in `src/flight.js`.

## Motion / accessibility notes

- `prefers-reduced-motion` disables smooth scroll, reveals, and 3D scenes.
- 3D scenes lazy-load on scroll-into-view and use lighter particle counts on mobile.
- Reveal-hiding is gated on an `html.js` class, so content stays visible without JS.
