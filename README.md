# Maharashtra ST Bus Timetable (MSRTC) — Serverless PWA

A fast, offline-first, multilingual (English / **मराठी** / हिंदी) Progressive Web App
for searching Maharashtra ST (MSRTC) bus timetables.

**Backend-free · Database-free · Firebase-free · Admin-free.** The only server-side
component is a scheduled data-collection job (Render Cron). The app itself is a
static site that reads generated JSON and does all search **in the browser**.

> ⚠️ **Independent service.** This project is **not affiliated with or operated by
> MSRTC**. The bundled dataset is clearly-labelled **sample/demo data** built on real
> Maharashtra geography and real MSRTC service brands — the departure times are
> illustrative and **not verified**. Wire a permitted official source (see
> [Data pipeline](#data-pipeline)) before presenting timings as real.

---

## Tech stack

React 18 · TypeScript · Vite 5 · Tailwind CSS · vite-plugin-pwa (Workbox) ·
IndexedDB (`idb`) · react-router · react-helmet-async · Capacitor-ready.

No backend. No database. No API calls in production — only static JSON + client-side search.

## Quick start

```bash
npm install
npm run data:build   # runs the pipeline on demo fixtures -> data/generated + public/data
npm run dev          # http://localhost:5173
```

`npm run dev`/`build` auto-run `sync-data` first, and the repo ships pre-generated
data, so `npm run dev` works immediately even before `data:build`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build → `dist/` (+ SEO prerender in `postbuild`) |
| `npm run preview` | Preview the built site |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run scrape` / `scrape:demo` | Stage 1: fetch → parse → normalise → `data/.tmp/staged.json` |
| `npm run validate` | Stage 2: validate the staged dataset (blocks on bad data) |
| `npm run generate` | Stage 3: diff + publish → `data/generated/` |
| `npm run data:build` | Full pipeline (`scrape:demo` → validate → generate → sync) |
| `npm run sync-data` | Copy `data/generated` → `public/data` and rebuild `sitemap.xml` |

## Project structure

```
src/
  components/   UI (StationInput autocomplete, BusCard, ServiceBadge, SourceTag, …)
  pages/        Home, Search, Route (/st-bus/x-to-y), Station, Service, Favorites, About
  services/     data.ts (fetch+IndexedDB cache), db.ts (IndexedDB), notifications.ts
  search/       searchEngine.ts (client-side, multilingual, fuzzy, direction-aware)
  i18n/         I18nContext + locales/{en,mr,hi}.json  (Marathi is first-class)
  hooks/        useRouteResults, useFavorites, usePwaInstall
  context/      DataContext (loads core JSON, exposes lookup maps)
  utils/        format.ts, text.ts
public/
  buses/        generic, self-authored SVG bus illustrations (one per service type)
  icons/        PWA icons (192/512/maskable) + apple-touch-icon
  data/         generated JSON, served at /data/* (created by sync-data)
data/
  demo/reference/  curated master geography + service catalogue (divisions, stops, routes…)
  demo/source/     demo "source documents" in JSON / HTML / TXT (exercise every parser)
  generated/       the published dataset (what the app reads); .backup keeps the prev one
scraper/
  sources/      polite HTTP fetcher (robots.txt + rate-limit), demo + official-source adapters
  parsers/      html-table, text, pdf (detects scanned/image-only), json-fixture
  normalizers/  name + time normalisation, dataset assembly
  validators/   trip + dataset validation (impossible times, dupes, suspicious drops)
  diff/         previous vs new → changes.json
  generate-data/ atomic writes, keeps previous dataset, metadata + versioning
scripts/        scrape.ts · validate.ts · generate.ts · sync-data.mjs · prerender.mjs
capacitor.config.ts   render.yaml   netlify.toml   vercel.json
```

## Data pipeline

```
OFFICIAL SOURCE (permitted) ─▶ Render Cron ─▶ fetch ─▶ parse (HTML/PDF/text)
   ─▶ normalise names+times ─▶ validate ─▶ diff vs previous ─▶ generate static JSON ─▶ deploy
```

- **Runs offline on demo fixtures today.** `npm run data:build` reads
  `data/demo/source/*` (JSON + an HTML table + a pipe-delimited text file — one of
  each to exercise all parsers), resolves names against the curated reference
  geography, validates, and writes `data/generated/`.
- **Safety (spec §7, §9):** the fetcher respects `robots.txt`, rate-limits per host,
  sends a contactable User-Agent, and supports conditional GET. Validation refuses to
  publish on hard errors or a **suspicious mass-deletion** (e.g. 1,850 → 50 trips) —
  the previous dataset is retained. Scanned/image-only PDFs are detected and skipped
  (no OCR guessing).
- **Wiring a real source:** implement/enable `scraper/sources/msrtc-portal.ts` with
  **permitted, machine-readable** document URLs via `MSRTC_DOC_URLS`, then set
  `DATA_SOURCE=msrtc`. The official booking portal is a live reservation engine and
  **must not** be scraped for bulk timetables or live availability.

### Data files (`/data/generated`, served at `/data`)

`metadata.json` (version + counts + disclaimer), `divisions.json`, `depots.json`,
`stations.json`, `stops.json`, `routes.json`, `service-types.json`,
`popular-routes.json`, `changes.json`, and `schedules/<division>.json` (the large
per-division trip data, **lazy-loaded** so a device never downloads all of Maharashtra).

## Search

Fully client-side. Typing resolves a station across English/Marathi/Hindi, aliases,
and common misspellings (fuzzy). A from→to lookup finds routes that **originate** at
the chosen origin (so the published departure time is valid — intermediate boarding
times are never invented), lazy-loads only the needed division schedule files, and
assembles direction-aware results (direct vs "passes through").

## Offline (PWA)

Service worker precaches the app shell; `/data/*` uses stale-while-revalidate. The app
also caches every JSON file in IndexedDB and falls back to it when offline, showing
**"Offline — showing saved timetable data."** Favourites and recent searches live in
IndexedDB (no account).

## SEO

Per-page `<title>`/meta/canonical/hreflang + JSON-LD (via react-helmet-async), a
generated `sitemap.xml`, and a **static prerender** (`scripts/prerender.mjs`,
`postbuild`) that writes real HTML for every route/station/service page **that has
data** — so crawlers and no-JS users get the actual timetable. Empty pages are never
generated.

Route SEO URLs: `/st-bus/<from>-to-<to>` · Stations: `/station/<id>` · Services: `/bus/<id>`.

Set `SITE_URL` and `VITE_SITE_URL` (see `.env.example`) so canonicals point at your domain.

## Deploy (static)

Any static host works. Configs included: **`render.yaml`** (static site + the cron
job), **`netlify.toml`** + `public/_redirects`, **`vercel.json`**.

```bash
npm run build      # outputs dist/  (deploy this folder)
```

SPA fallback is configured, and prerendered SEO pages take precedence over it.

## Android (Capacitor)

The app is Capacitor-ready and uses the **same static JSON** — no Android backend.

```bash
npm run build
npx cap add android
npx cap sync android
npx cap open android   # then build a signed APK/AAB in Android Studio
```

See `capacitor.config.ts` (`webDir: dist`). Notifications are behind an abstraction
(`services/notifications.ts`) so a native `@capacitor/local-notifications` adapter
drops in without touching calling code.

## Performance

Route-level code splitting (each page is its own chunk), a single small vendor chunk,
lazy-loaded per-division data, IndexedDB caching, lazy-loaded images, tiny SVG bus art.
Production JS is well under ~90 KB gzip total.

## Licensing & disclaimer

Code: MIT (`LICENSE`). Bus illustrations in `public/buses/` are original, generic SVGs
(not MSRTC livery or logos). Do **not** add MSRTC government logos/seals without
permission. Every timetable row shows its **source** and **last-verified** date. See
the in-app **About** page and the disclaimer shown throughout.
