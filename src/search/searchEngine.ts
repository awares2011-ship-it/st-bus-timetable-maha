import type { Route, Stop, Trip } from '@/types/domain';
import { normalizeKey, levenshtein } from '@/utils/text';

/**
 * Client-side search engine. There is NO backend: everything runs against the
 * static JSON in the browser. Two jobs:
 *   1. resolve a typed query ("puna", "स्वारगेट", "kolapur") to a station
 *   2. find the trips that serve a from→to request, direction-aware
 */

export interface IndexedStop {
  stop: Stop;
  keys: string[];
}

export function buildStopIndex(stops: Stop[]): IndexedStop[] {
  return stops.map((stop) => {
    const raw = [stop.name, stop.nameMr, stop.nameHi, ...stop.aliases, stop.id];
    const keys = [...new Set(raw.map(normalizeKey).filter(Boolean))];
    return { stop, keys };
  });
}

/** Score a query against one stop's keys (lower = better; undefined = no match). */
function scoreStop(q: string, entry: IndexedStop): number | undefined {
  let best: number | undefined;
  for (const key of entry.keys) {
    let s: number | undefined;
    if (key === q) s = 0;
    else if (key.startsWith(q)) s = 1;
    else if (key.split(' ').some((tok) => tok.startsWith(q))) s = 1.5;
    else if (key.includes(q)) s = 2;
    else if (q.length >= 3) {
      const d = levenshtein(q, key.length > q.length ? key.slice(0, q.length + 1) : key);
      if (d <= 1) s = 3 + d;
      else {
        const dFull = levenshtein(q, key);
        if (dFull <= 2) s = 4 + dFull;
      }
    }
    if (s !== undefined && (best === undefined || s < best)) best = s;
  }
  return best;
}

export function searchStops(index: IndexedStop[], query: string, limit = 8): Stop[] {
  const q = normalizeKey(query);
  if (!q) return [];
  const scored: { stop: Stop; score: number }[] = [];
  for (const entry of index) {
    const score = scoreStop(q, entry);
    if (score !== undefined) {
      // Stations rank above intermediate stops at equal textual score.
      const typeBonus = entry.stop.type === 'station' ? 0 : 0.3;
      scored.push({ stop: entry.stop, score: score + typeBonus });
    }
  }
  scored.sort((a, b) => a.score - b.score || a.stop.name.localeCompare(b.stop.name));
  return scored.slice(0, limit).map((s) => s.stop);
}

export interface RouteMatch {
  route: Route;
  isDirect: boolean;
  /** intermediate stop ids strictly between `from` and `to`. */
  via: string[];
}

/**
 * Routes that carry a passenger from `from` to `to`. The route may originate
 * before `from` — we match any route where both stops appear in order, so
 * users can board at intermediate stops.
 */
export function findRouteMatches(routes: Route[], from: string, to: string): RouteMatch[] {
  const matches: RouteMatch[] = [];
  for (const route of routes) {
    const iFrom = route.stops.indexOf(from);
    const iTo = route.stops.indexOf(to);
    if (iFrom === -1 || iTo === -1 || iTo <= iFrom) continue;
    matches.push({
      route,
      isDirect: route.to === to,
      via: route.stops.slice(iFrom + 1, iTo),
    });
  }
  return matches;
}

export interface ResultTrip {
  trip: Trip;
  route: Route;
  isDirect: boolean;
  via: string[];
  /** arrival time is only meaningful when the journey ends at the route's end. */
  showArrival: boolean;
}

export function assembleResults(matches: RouteMatch[], trips: Trip[]): ResultTrip[] {
  const byRoute = new Map<string, RouteMatch>();
  for (const m of matches) byRoute.set(m.route.id, m);
  const out: ResultTrip[] = [];
  for (const trip of trips) {
    const m = byRoute.get(trip.routeId);
    if (!m) continue;
    out.push({
      trip,
      route: m.route,
      isDirect: m.isDirect,
      via: m.via,
      showArrival: m.isDirect,
    });
  }
  out.sort((a, b) => a.trip.departure.localeCompare(b.trip.departure));
  return out;
}
