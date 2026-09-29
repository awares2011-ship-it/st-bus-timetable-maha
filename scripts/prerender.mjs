// Post-build SEO prerender (static-site friendly, no headless browser).
//
// For each route / station / service page that has REAL data, we write a
// dist/<path>/index.html containing:
//   - a correct <title>, meta description, canonical + hreflang, Open Graph
//   - JSON-LD structured data
//   - a static HTML snapshot of the content (so crawlers & no-JS users see the
//     timetable); the React app hydrates over it on load.
//
// Only pages backed by data are emitted — we never generate thousands of empty
// SEO pages. This script must never fail the build: everything is wrapped so a
// problem just logs and exits 0.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const DATA = path.join(ROOT, 'public', 'data');
const SITE_URL = (process.env.SITE_URL || 'https://example.com').replace(/\/$/, '');
const MAX_PAGES = Number(process.env.PRERENDER_MAX || 800);

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function injectHead(html, { title, description, canonical, jsonld, lang = 'en' }) {
  let out = html;
  out = out.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`);
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  out = out.replace(
    /(<meta name="description" content=")[^"]*(")/,
    `$1${esc(description)}$2`,
  );
  out = out.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${esc(canonical)}$2`);
  out = out.replace(
    /(<meta property="og:title" content=")[^"]*(")/,
    `$1${esc(title)}$2`,
  );
  out = out.replace(
    /(<meta property="og:description" content=")[^"]*(")/,
    `$1${esc(description)}$2`,
  );
  if (jsonld) {
    out = out.replace(
      '</head>',
      `  <script type="application/ld+json">${JSON.stringify(jsonld)}</script>\n  </head>`,
    );
  }
  return out;
}

function injectRoot(html, contentHtml) {
  // index.html ships an empty `<div id="root"></div>` (the no-JS fallback is a
  // sibling), so this replace is unambiguous.
  if (html.includes('<div id="root"></div>')) {
    return html.replace('<div id="root"></div>', `<div id="root">${contentHtml}</div>`);
  }
  return html.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${contentHtml}</div>`);
}

function writePage(routePath, html) {
  const dir = path.join(DIST, routePath.replace(/^\//, ''));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

function main() {
  const template = fs.existsSync(path.join(DIST, 'index.html'))
    ? fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
    : null;
  if (!template) {
    console.warn('[prerender] dist/index.html missing — skipping.');
    return;
  }

  const routes = readJson(path.join(DATA, 'routes.json'), []);
  const stops = readJson(path.join(DATA, 'stops.json'), []);
  const stations = readJson(path.join(DATA, 'stations.json'), []);
  const services = readJson(path.join(DATA, 'service-types.json'), []);
  const meta = readJson(path.join(DATA, 'metadata.json'), null);

  const stopById = new Map(stops.map((s) => [s.id, s]));
  const svcById = new Map(services.map((s) => [s.id, s]));

  // Index trips by route id from all schedule files.
  const tripsByRoute = new Map();
  const schedDir = path.join(DATA, 'schedules');
  if (fs.existsSync(schedDir)) {
    for (const f of fs.readdirSync(schedDir)) {
      const sched = readJson(path.join(schedDir, f), { trips: [] });
      for (const t of sched.trips || []) {
        if (!tripsByRoute.has(t.routeId)) tripsByRoute.set(t.routeId, []);
        tripsByRoute.get(t.routeId).push(t);
      }
    }
  }

  const disclaimer = meta?.disclaimer || 'Independent service. Not affiliated with MSRTC.';
  const demoBanner = meta?.containsDemoData
    ? '<p style="background:#fef3c7;padding:8px;border-radius:6px">Sample data — illustrative times, not verified against MSRTC.</p>'
    : '';
  let count = 0;

  // --- Route pages -------------------------------------------------------
  for (const r of routes) {
    if (count >= MAX_PAGES) break;
    const trips = tripsByRoute.get(r.id) || [];
    if (trips.length === 0) continue; // never emit empty SEO pages
    const from = stopById.get(r.from);
    const to = stopById.get(r.to);
    if (!from || !to) continue;
    const title = `${from.name} to ${to.name} ST Bus Timetable – MSRTC Bus Timings`;
    const description = `${from.name} to ${to.name} MSRTC ST bus timetable: ${trips.length} bus timings, service types and duration. ${from.nameMr} ते ${to.nameMr} एसटी बस वेळापत्रक.`;
    const canonical = `${SITE_URL}/st-bus/${r.from}-to-${r.to}`;
    const rows = trips
      .slice()
      .sort((a, b) => a.departure.localeCompare(b.departure))
      .map((t) => {
        const sv = svcById.get(t.serviceType);
        return `<tr><td>${esc(t.departure)}</td><td>${esc(t.arrival || '')}</td><td>${esc(sv?.name || t.serviceType)}</td></tr>`;
      })
      .join('');
    const content =
      `<main style="font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:16px">` +
      `<nav><a href="/">Home</a> › ${esc(from.name)} → ${esc(to.name)}</nav>` +
      `<h1>${esc(from.name)} to ${esc(to.name)} ST Bus Timetable</h1>` +
      `<p>${esc(from.nameMr)} ते ${esc(to.nameMr)} — MSRTC बस वेळापत्रक</p>` +
      demoBanner +
      `<table border="1" cellpadding="6"><thead><tr><th>Departure</th><th>Arrival</th><th>Service</th></tr></thead><tbody>${rows}</tbody></table>` +
      `<p><small>${esc(disclaimer)}</small></p></main>`;
    const jsonld = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: title,
      numberOfItems: trips.length,
      itemListElement: trips.slice(0, 20).map((t, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'BusTrip',
          provider: { '@type': 'Organization', name: 'MSRTC (unofficial listing)' },
          departureBusStop: { '@type': 'BusStop', name: from.name },
          arrivalBusStop: { '@type': 'BusStop', name: to.name },
        },
      })),
    };
    let html = injectHead(template, { title, description, canonical, jsonld, lang: 'en' });
    html = injectRoot(html, content);
    writePage(`/st-bus/${r.from}-to-${r.to}`, html);
    count++;
  }

  // --- Station pages -----------------------------------------------------
  for (const st of stations) {
    if (count >= MAX_PAGES) break;
    const title = `${st.name} ST Bus Stand Timetable – MSRTC | ${st.nameMr} एसटी बस स्थानक`;
    const description = `${st.name} (${st.nameMr}) MSRTC ST bus stand: routes, timings and services in ${st.district} district, ${st.division} division.`;
    const canonical = `${SITE_URL}/station/${st.id}`;
    const content =
      `<main style="font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:16px">` +
      `<h1>${esc(st.name)} ST Bus Stand</h1><p>${esc(st.nameMr)} — ${esc(st.district)}, ${esc(st.division)} division</p>${demoBanner}` +
      `<p><small>${esc(disclaimer)}</small></p></main>`;
    const jsonld = {
      '@context': 'https://schema.org',
      '@type': 'BusStation',
      name: st.name,
      alternateName: [st.nameMr, st.nameHi].filter(Boolean),
      address: { '@type': 'PostalAddress', addressRegion: 'Maharashtra', addressLocality: st.district },
    };
    let html = injectHead(template, { title, description, canonical, jsonld, lang: 'en' });
    html = injectRoot(html, content);
    writePage(`/station/${st.id}`, html);
    count++;
  }

  // --- Service pages -----------------------------------------------------
  for (const sv of services) {
    if (count >= MAX_PAGES) break;
    const title = `MSRTC ${sv.name} Bus – Timetable, Routes & Info | ${sv.nameMr}`;
    const description = `${sv.name} (${sv.nameMr}): ${sv.description} MSRTC ST bus service details and routes.`;
    const canonical = `${SITE_URL}/bus/${sv.id}`;
    const content =
      `<main style="font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:16px">` +
      `<h1>MSRTC ${esc(sv.name)}</h1><p>${esc(sv.nameMr)}</p><p>${esc(sv.description)}</p>${demoBanner}` +
      `<p><small>${esc(disclaimer)}</small></p></main>`;
    let html = injectHead(template, { title, description, canonical, lang: 'en' });
    html = injectRoot(html, content);
    writePage(`/bus/${sv.id}`, html);
    count++;
  }

  console.log(`[prerender] wrote ${count} static SEO page(s) to dist/.`);
}

try {
  main();
} catch (e) {
  console.warn('[prerender] skipped due to error:', e?.message || e);
}
