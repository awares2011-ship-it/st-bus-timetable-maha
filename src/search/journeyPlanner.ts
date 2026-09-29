import type { Route, Stop, Trip } from '@/types/domain';

/**
 * Interconnected journey planner (all client-side).
 *
 * The published boards only give departure times at the stand that prints
 * them, and rarely list intermediate stops. To answer "every bus from Pune to
 * Satara today" we therefore combine:
 *
 *  direct   – a board in city A lists city B as destination (exact time)
 *  onward   – a board in A lists a farther town T and B lies on the A→T
 *             highway corridor (exact departure; "stops at B" is inferred)
 *  passing  – a bus from another town O runs O→T and passes A then B
 *             (time at A is ESTIMATED from distance)
 *  connection – no/few through buses: change at a hub H with buses A→H and H→B
 *
 * Corridor test uses great-circle distances between geocoded stops:
 * d(A,B)+d(B,T) ≤ 1.12·d(A,T)+6 km. Everything inferred is labelled in the UI.
 */

export type JourneyKind = 'direct' | 'onward' | 'passing';

export interface JourneyMatch {
  route: Route;
  kind: JourneyKind;
  /** stand where the passenger boards (in city A) — for 'passing' the city's point */
  boardStop: string;
  /** minutes from the route's printed departure until the bus reaches A */
  boardOffsetMin: number;
  /** estimated minutes from boarding to reaching B (undefined if unknown) */
  rideMin?: number;
  /** true when times are distance-based estimates */
  approx: boolean;
  /** true when the stop at B is inferred from geography (not printed) */
  inferred: boolean;
  /** stop where the published time applies, when not the origin */
  timedAt?: string;
}

export interface HubOption {
  hub: string;
  first: Route[]; // A → hub
  second: Route[]; // hub → B (direct or onward through B)
  detourKm: number;
}

const ROAD_FACTOR = 1.25; // road km ≈ 1.25 × straight-line km
const AVG_KMPH = 40; // ST average incl. halts

export function haversineKm(a: Stop, b: Stop): number | undefined {
  if (a.lat === undefined || a.lng === undefined || b.lat === undefined || b.lng === undefined) return undefined;
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export function travelMinutes(km: number): number {
  return Math.round(((km * ROAD_FACTOR) / AVG_KMPH) * 60);
}

/** Every stand of the stop's city, or just the stop. */
export function cityStops(stop: Stop, stops: Stop[]): Set<string> {
  if (!stop.city) return new Set([stop.id]);
  return new Set(stops.filter((s) => s.city === stop.city).map((s) => s.id));
}

/**
 * Is waypoint W on the way from P to Q?
 *
 *  - Hubs (district HQs and multi-stand cities) are where highways meet, so
 *    buses really do bend through them (Mumbai → Satara runs via Pune): a
 *    detour of up to 10 % over the straight line is accepted.
 *  - Any other town must sit within a few km of the P→Q line and between P
 *    and Q — e.g. Shevgaon is ~34 km off the Pune → Chh. Sambhajinagar road,
 *    so those buses are NOT offered for Shevgaon.
 */
function onWay(P: Stop, W: Stop, Q: Stop): boolean {
  const dPW = haversineKm(P, W);
  const dWQ = haversineKm(W, Q);
  const dPQ = haversineKm(P, Q);
  if (dPW === undefined || dWQ === undefined || dPQ === undefined) return false;
  if (dPW < 8 || dWQ < 8) return false;
  if (isHub(W)) return dPW + dWQ <= dPQ * 1.1 + 6;
  // Cross-track / along-track on a local flat projection.
  const kx = 111.32 * Math.cos(((P.lat! + Q.lat!) / 2) * (Math.PI / 180));
  const ky = 110.57;
  const qx = (Q.lng! - P.lng!) * kx, qy = (Q.lat! - P.lat!) * ky;
  const wx = (W.lng! - P.lng!) * kx, wy = (W.lat! - P.lat!) * ky;
  const len = Math.hypot(qx, qy);
  if (len < 1) return false;
  const along = (wx * qx + wy * qy) / len;
  const cross = Math.abs(wx * qy - wy * qx) / len;
  return along > 0.05 * len && along < 0.97 * len && cross <= Math.max(8, 0.07 * len);
}

function isHub(s: Stop): boolean {
  return Boolean(s.hub || s.city);
}

export function planJourney(
  routes: Route[],
  stopById: Map<string, Stop>,
  allStops: Stop[],
  fromId: string,
  toId: string,
): { matches: JourneyMatch[]; A: Set<string>; B: Set<string> } {
  const from = stopById.get(fromId);
  const to = stopById.get(toId);
  if (!from || !to) return { matches: [], A: new Set(), B: new Set() };
  const A = cityStops(from, allStops);
  const B = cityStops(to, allStops);
  const pA = from.lat !== undefined ? from : allStops.find((s) => A.has(s.id) && s.lat !== undefined);
  const pB = to.lat !== undefined ? to : allStops.find((s) => B.has(s.id) && s.lat !== undefined);
  const dAB = pA && pB ? haversineKm(pA, pB) : undefined;
  const matches: JourneyMatch[] = [];

  /**
   * Minutes from the published time to the moment the bus is at `x`.
   * Published times apply at the route's origin, or at its timing point for
   * through buses (e.g. Pune → Shevgaon times printed at Shirur).
   */
  const offsetTo = (route: Route, x: Stop): { min: number; exact: boolean } => {
    const refId = route.timingPoint ?? route.from;
    if (x.id === refId) return { min: 0, exact: true };
    const o = stopById.get(route.from);
    const ref = stopById.get(refId);
    if (!o || !ref) return { min: 0, exact: false };
    const dOx = x.id === o.id ? 0 : haversineKm(o, x);
    const dOr = ref.id === o.id ? 0 : haversineKm(o, ref);
    if (dOx === undefined || dOr === undefined) return { min: 0, exact: false };
    return { min: travelMinutes(dOx) - travelMinutes(dOr), exact: false };
  };

  for (const route of routes) {
    const o = stopById.get(route.from);
    const t = stopById.get(route.to);
    if (!o || !t) continue;
    const fromA = A.has(route.from);
    const toB = B.has(route.to);
    const iA = route.stops.findIndex((s) => A.has(s));
    const iB = route.stops.findIndex((s) => B.has(s));

    // Printed stops: both on the route, in order (origin/via/timing point/end).
    if (iA !== -1 && iB !== -1 && iA < iB) {
      const bs = stopById.get(route.stops[iA]) ?? o;
      const off = offsetTo(route, bs);
      const kind: JourneyKind = fromA && toB ? 'direct' : fromA ? 'onward' : iA === 0 ? 'onward' : 'passing';
      matches.push({
        route, kind: toB && fromA ? 'direct' : kind, boardStop: bs.id, boardOffsetMin: off.min,
        rideMin: dAB ? travelMinutes(dAB) : undefined, approx: !off.exact, inferred: false,
        ...(route.timingPoint ? { timedAt: route.timingPoint } : {}),
      });
      continue;
    }
    if (route.timingPoint) continue; // through buses: only their printed stops
    if (!pA || !pB || dAB === undefined) continue;
    // No geographic guessing for short hops or within one city: local buses
    // there aren't on these boards, and long-distance buses are not local
    // transport (Mumbai Central → Kurla).
    if (dAB < 25 || (from.city && from.city === to.city)) continue;
    if (A.has(route.to) || B.has(route.from)) continue; // wrong direction

    if (fromA) {
      // Onward: A → T, with B on the way.
      if (onWay(o, pB, t)) {
        matches.push({ route, kind: 'onward', boardStop: route.from, boardOffsetMin: 0, rideMin: travelMinutes(dAB), approx: false, inferred: true });
      }
      continue;
    }
    // Passing: O → (A) → (B) → T, where T may be B itself. Only through a
    // hub or a town right on the line, and never for journeys so long that a
    // distance-based time estimate would be meaningless.
    const dOA = haversineKm(o, pA);
    // Beyond ~250 km (≈ 8 h) a distance-based arrival estimate is too unreliable.
    if (dOA === undefined || dOA < 10 || dOA > 250) continue;
    if (toB) {
      if (onWay(o, pA, pB)) {
        matches.push({ route, kind: 'passing', boardStop: pA.id, boardOffsetMin: travelMinutes(dOA), rideMin: travelMinutes(dAB), approx: true, inferred: true });
      }
      continue;
    }
    if (onWay(o, pA, t) && onWay(pA, pB, t)) {
      matches.push({ route, kind: 'passing', boardStop: pA.id, boardOffsetMin: travelMinutes(dOA), rideMin: travelMinutes(dAB), approx: true, inferred: true });
    }
  }
  return { matches, A, B };
}

/** Hubs for a one-change journey, best first. */
export function findConnections(
  routes: Route[],
  stopById: Map<string, Stop>,
  A: Set<string>,
  B: Set<string>,
  fromId: string,
  toId: string,
  limit = 3,
): HubOption[] {
  const pA = stopById.get(fromId);
  const pB = stopById.get(toId);
  const dAB = pA && pB ? haversineKm(pA, pB) : undefined;
  const firstBy = new Map<string, Route[]>();
  for (const r of routes) {
    if (!A.has(r.from) || A.has(r.to) || B.has(r.to)) continue;
    const l = firstBy.get(r.to) ?? [];
    l.push(r);
    firstBy.set(r.to, l);
  }
  const secondBy = new Map<string, Route[]>();
  for (const r of routes) {
    if (!B.has(r.to) || A.has(r.from) || B.has(r.from)) continue;
    const l = secondBy.get(r.from) ?? [];
    l.push(r);
    secondBy.set(r.from, l);
  }
  const out: HubOption[] = [];
  for (const [hub, first] of firstBy) {
    const second = secondBy.get(hub);
    if (!second) continue;
    const h = stopById.get(hub);
    let detour = 0;
    if (h && pA && pB && dAB !== undefined) {
      const a = haversineKm(pA, h);
      const b = haversineKm(h, pB);
      if (a !== undefined && b !== undefined) {
        detour = a + b - dAB;
        if (a + b > dAB * 1.6 + 20) continue; // big detour: not a sensible change
      }
    }
    out.push({ hub, first, second, detourKm: detour });
  }
  out.sort((x, y) => x.detourKm - y.detourKm || y.first.length + y.second.length - (x.first.length + x.second.length));
  return out.slice(0, limit);
}

/** HH:MM + minutes, wrapped to 24 h. */
export function addMinutes(hhmm: string, min: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const t = (((h * 60 + m + min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

export interface PlannedTrip {
  trip: Trip;
  match: JourneyMatch;
  /** time the bus leaves (or is expected at) city A */
  boardTime: string;
  /** estimated time at B, when distance is known */
  arriveEst?: string;
}

export function assembleJourney(matches: JourneyMatch[], trips: Trip[]): PlannedTrip[] {
  const byRoute = new Map(matches.map((m) => [m.route.id, m]));
  const out: PlannedTrip[] = [];
  for (const trip of trips) {
    const m = byRoute.get(trip.routeId);
    if (!m) continue;
    const boardTime = addMinutes(trip.departure, m.boardOffsetMin);
    const arriveEst =
      m.kind === 'direct' && trip.arrival ? trip.arrival : m.rideMin !== undefined ? addMinutes(boardTime, m.rideMin) : undefined;
    out.push({ trip, match: m, boardTime, arriveEst });
  }
  const rank: Record<JourneyKind, number> = { direct: 0, onward: 1, passing: 2 };
  out.sort((a, b) => a.boardTime.localeCompare(b.boardTime) || rank[a.match.kind] - rank[b.match.kind]);
  // Two boards can print the same physical bus (e.g. O's board and A's board
  // both listing the O→T service). Drop a passing estimate when an exact
  // departure from A to the same terminus exists within 20 minutes.
  const exact = out.filter((p) => !p.match.approx);
  return out.filter((p) => {
    if (!p.match.approx) return true;
    return !exact.some((e) => e.match.route.to === p.match.route.to && Math.abs(toMin(e.boardTime) - toMin(p.boardTime)) <= 20);
  });
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
