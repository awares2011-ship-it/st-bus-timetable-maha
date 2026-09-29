/**
 * Data + search audit.  npx tsx scripts/debug/audit.ts  →  data/.tmp/audit.md
 *
 * Checks the published dataset for the kinds of error that make a from→to
 * search show wrong buses:
 *  1. stops geocoded far away from their own division (bad coordinates)
 *  2. route origins far from the division whose board printed them
 *  3. routes whose two ends are implausibly far apart (> 900 km)
 *  4. destinations with a same-named place much nearer the origin
 *     (possible wrong match — "Deoli" vs "Devli")
 *  5. for every pair of district HQs: inferred results whose estimated
 *     boarding time is more than 8 h after the printed time, or that
 *     travel away from the destination
 */
import fs from 'node:fs';
import { planJourney, haversineKm } from '../../src/search/journeyPlanner';
import type { Route, Stop } from '../../src/types/domain';

const stops: Stop[] = JSON.parse(fs.readFileSync('public/data/stops.json', 'utf8'));
const routes: Route[] = JSON.parse(fs.readFileSync('public/data/routes.json', 'utf8'));
const districts = JSON.parse(fs.readFileSync('public/data/districts.json', 'utf8'));
const byId = new Map(stops.map((s) => [s.id, s]));
const out: string[] = ['# Data & search audit', ''];

// Division centre = median of its geocoded stations.
const centre = new Map<string, Stop>();
{
  const g = new Map<string, Stop[]>();
  for (const s of stops) if (s.lat !== undefined && s.type === 'station') (g.get(s.division) ?? g.set(s.division, []).get(s.division)!).push(s);
  for (const [d, l] of g) {
    const lat = [...l].sort((a, b) => a.lat! - b.lat!)[l.length >> 1].lat!;
    const lng = [...l].sort((a, b) => a.lng! - b.lng!)[l.length >> 1].lng!;
    centre.set(d, { id: `c-${d}`, name: d, nameMr: d, nameHi: d, aliases: [], division: d, district: '', type: 'stop', lat, lng });
  }
}
const far = (s: Stop, d: string) => {
  const c = centre.get(d);
  return c && s.lat !== undefined ? haversineKm(s, c)! : 0;
};

// 1
const bad1 = stops.filter((s) => s.lat !== undefined && s.type !== 'station' && far(s, s.division) > 220);
out.push(`## 1. Village stops > 220 km from their division (${bad1.length})`, '');
for (const s of bad1) out.push(`- ${s.id} (${s.nameMr}) div=${s.division} ${Math.round(far(s, s.division))} km`);

// 2
const bad2 = routes.filter((r) => {
  const o = byId.get(r.from)!;
  return !o.city && far(o, r.division) > 200;
});
out.push('', `## 2. Route origins > 200 km from the board's division (${bad2.length})`, '');
for (const r of bad2.slice(0, 80)) out.push(`- ${r.id} (board div ${r.division}, ${Math.round(far(byId.get(r.from)!, r.division))} km)`);

// 3
const bad3 = routes.filter((r) => {
  const a = byId.get(r.from)!, b = byId.get(r.to)!;
  const d = haversineKm(a, b);
  return d !== undefined && d > 900;
});
out.push('', `## 3. Routes with ends > 900 km apart (${bad3.length})`, '');
for (const r of bad3) out.push(`- ${r.id} ${Math.round(haversineKm(byId.get(r.from)!, byId.get(r.to)!)!)} km`);

// 4
const key = (s: string) => s.split(' (')[0].toLowerCase().replace(/[^a-zऀ-ॿ]/g, '');
const byName = new Map<string, Stop[]>();
for (const s of stops) for (const k of [key(s.name), key(s.nameMr)]) (byName.get(k) ?? byName.set(k, []).get(k)!).push(s);
const bad4: string[] = [];
for (const r of routes) {
  const o = byId.get(r.from)!, t = byId.get(r.to)!;
  const dT = haversineKm(o, t);
  if (dT === undefined || dT < 150) continue;
  const twins = [...new Set([...(byName.get(key(t.name)) ?? []), ...(byName.get(key(t.nameMr)) ?? [])])].filter((x) => x.id !== t.id && x.lat !== undefined);
  const near = twins.find((x) => haversineKm(o, x)! < dT / 3);
  if (near) bad4.push(`- ${r.id}: '${t.id}' ${Math.round(dT)} km, but '${near.id}' only ${Math.round(haversineKm(o, near)!)} km`);
}
out.push('', `## 4. Destinations with a same-named place much nearer (${bad4.length}) — review`, '', ...bad4);

// 5
const hqs: string[] = districts.map((d: any) => d.talukas[0]?.stop).filter((id: string) => byId.get(id)?.lat !== undefined);
let pairs = 0, withResults = 0, inferredCount = 0;
const bad5: string[] = [];
for (const a of hqs) {
  for (const b of hqs) {
    if (a === b) continue;
    pairs++;
    const { matches } = planJourney(routes, byId as any, stops, a, b);
    if (matches.length) withResults++;
    for (const m of matches) {
      if (m.kind === 'direct') continue;
      inferredCount++;
      if (m.boardOffsetMin > 8 * 60) bad5.push(`- ${a}→${b}: ${m.route.id} boards ${Math.round(m.boardOffsetMin / 60)} h after printed time`);
      const t = byId.get(m.route.to)!, B = byId.get(b)!, A = byId.get(a)!;
      // terminus must not be behind the traveller
      if (haversineKm(A, t)! + 5 < haversineKm(A, B)! * 0.9 && !m.route.stops.includes(b)) bad5.push(`- ${a}→${b}: ${m.route.id} ends before reaching destination`);
    }
  }
}
out.push('', `## 5. District-HQ pair search (${pairs} pairs, ${withResults} with results, ${inferredCount} inferred matches)`, '', `${bad5.length} suspicious:`, ...bad5.slice(0, 100));

fs.mkdirSync('data/.tmp', { recursive: true });
fs.writeFileSync('data/.tmp/audit.md', out.join('\n'));
console.log(`1:${bad1.length} 2:${bad2.length} 3:${bad3.length} 4:${bad4.length} 5:${bad5.length}  pairs ${withResults}/${pairs}`);
