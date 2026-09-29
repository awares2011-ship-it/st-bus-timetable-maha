// Debug: explain planner matches for a from→to pair.  npx tsx scripts/debug/plan.ts pune-swargate shevgaon
import fs from 'node:fs';
import { planJourney, haversineKm } from '../../src/search/journeyPlanner';
const stops = JSON.parse(fs.readFileSync('public/data/stops.json', 'utf8'));
const routes = JSON.parse(fs.readFileSync('public/data/routes.json', 'utf8'));
const byId = new Map(stops.map((s: any) => [s.id, s]));
const [from, to] = process.argv.slice(2);
const { matches } = planJourney(routes, byId as any, stops, from, to);
for (const m of matches.slice(0, 400)) {
  const o: any = byId.get(m.route.from), t: any = byId.get(m.route.to);
  console.log(m.kind.padEnd(8), m.route.id.padEnd(45), `stops=${m.route.stops.length}`, `O(${o.lat},${o.lng})`, `T(${t.lat},${t.lng}) ${t.division}`);
}
console.log(matches.length, 'matches');
