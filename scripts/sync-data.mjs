// Copies the canonical generated dataset (data/generated) into public/data so
// the Vite app can fetch it at /data/*, and regenerates public/sitemap.xml from
// the real data. Runs automatically before `dev` and `build`.
//
// Plain Node ESM (no TS) so it needs zero build step.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const GENERATED = path.join(ROOT, 'data', 'generated');
const PUBLIC_DATA = path.join(ROOT, 'public', 'data');
const SITE_URL = (process.env.SITE_URL || 'https://example.com').replace(/\/$/, '');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue; // skip .backup etc.
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function buildSitemap() {
  const routes = readJson(path.join(GENERATED, 'routes.json'), []);
  const stations = readJson(path.join(GENERATED, 'stations.json'), []);
  const services = readJson(path.join(GENERATED, 'service-types.json'), []);

  const urls = new Set(['/', '/about', '/favorites']);
  for (const r of routes) urls.add(`/st-bus/${r.from}-to-${r.to}`);
  for (const st of stations) urls.add(`/station/${st.id}`);
  for (const sv of services) urls.add(`/bus/${sv.id}`);

  const now = new Date().toISOString();
  const body = [...urls]
    .map(
      (u) =>
        `  <url><loc>${SITE_URL}${u}</loc><changefreq>weekly</changefreq><lastmod>${now}</lastmod></url>`,
    )
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  fs.mkdirSync(path.join(ROOT, 'public'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'public', 'sitemap.xml'), xml);
  return urls.size;
}

function main() {
  if (!fs.existsSync(GENERATED)) {
    console.warn('[sync-data] data/generated not found — run `npm run data:build` first.');
    return;
  }
  fs.rmSync(PUBLIC_DATA, { recursive: true, force: true });
  copyDir(GENERATED, PUBLIC_DATA);
  const count = buildSitemap();
  console.log(`[sync-data] copied data/generated → public/data; sitemap has ${count} URLs.`);
}

main();
