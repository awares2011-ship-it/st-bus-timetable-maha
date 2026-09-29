import type {
  Division,
  Depot,
  Stop,
  Route,
  ServiceType,
  Trip,
  PopularRoute,
  ScheduleFile,
  DataSource,
  District,
} from '../../src/types/domain';
import type { ParsedTrip } from '../types';
import { StopResolver, normalizeKey, slugify, phoneticKey } from './name-normalizer';
import { computeDuration } from './time-normalizer';

export interface ReferenceData {
  divisions: Division[];
  depots: Depot[];
  stops: Stop[];
  routes: Route[];
  serviceTypes: ServiceType[];
  popularRoutes?: PopularRoute[];
  districts?: District[];
  /** stopId → [lat, lng, source] from scripts/geography/geocode_*.py */
  coords?: Record<string, [number, number, string]>;
  /** cityId → stands in that city */
  cities?: Record<string, { name: string; nameMr: string; stops: string[] }>;
}

export interface NormalizeResult {
  divisions: Division[];
  depots: Depot[];
  stops: Stop[];
  stations: Stop[];
  routes: Route[];
  serviceTypes: ServiceType[];
  popularRoutes: PopularRoute[];
  districts: District[];
  schedules: ScheduleFile[];
  trips: Trip[];
  warnings: string[];
}

/** Build a name→serviceTypeId resolver from the reference service catalogue. */
function buildServiceResolver(serviceTypes: ServiceType[]) {
  const index = new Map<string, string>();
  const add = (name: string, id: string) => {
    const k = normalizeKey(name);
    if (k && !index.has(k)) index.set(k, id);
  };
  for (const s of serviceTypes) {
    for (const n of [s.id, s.name, s.nameMr, s.nameHi, ...(s.aliases ?? [])]) add(n, s.id);
    // Also index the short name before any parenthetical, e.g. "E-Shivai".
    add(s.name.split('(')[0], s.id);
    add(s.nameMr.split('(')[0], s.id);
  }
  return (raw: string): string | undefined => index.get(normalizeKey(raw));
}

function buildDepotResolver(depots: Depot[]) {
  const index = new Map<string, string>();
  for (const d of depots) {
    for (const n of [d.id, d.name, d.nameMr]) {
      const k = normalizeKey(n);
      if (k && !index.has(k)) index.set(k, d.id);
    }
  }
  return (raw?: string): string | undefined =>
    raw ? index.get(normalizeKey(raw)) : undefined;
}

/**
 * Turn parsed trips + reference geography into a fully normalised dataset.
 * Unknown stations are auto-created as intermediate stops (flagged via
 * warnings) rather than dropped, mirroring how a real pipeline discovers new
 * halts over time.
 */
export function normalizeDataset(
  parsed: ParsedTrip[],
  ref: ReferenceData,
  opts: { source: DataSource; lastVerified: string },
): NormalizeResult {
  const warnings: string[] = [];
  const stops: Stop[] = [...ref.stops];
  const stopResolver = new StopResolver(stops);
  const resolveService = buildServiceResolver(ref.serviceTypes);
  const resolveDepot = buildDepotResolver(ref.depots);
  const routeMap = new Map<string, Route>(ref.routes.map((r) => [r.id, r]));
  const routeByEndpoints = new Map<string, Route>();
  for (const r of ref.routes) routeByEndpoints.set(`${r.from}__${r.to}`, r);

  const divisionById = new Map(ref.divisions.map((d) => [d.id, d]));
  const defaultDivision = ref.divisions[0]?.id ?? 'unknown';

  const stopById = new Map(stops.map((s) => [s.id, s]));

  /**
   * Resolve by the English name first (transcriptions qualify same-name towns,
   * e.g. "Malkapur (Buldhana)"), then by the Marathi spelling printed on the
   * board. Unknown places become village-level stops inside the source
   * document's division instead of being dropped.
   */
  function ensureStop(rawName: string, mr?: string, hint?: string): string {
    // A bracket qualifier ("Talegaon (Wardha)") means the transcriber already
    // disambiguated a same-name place — don't let the bare Marathi spelling
    // (तळेगाव) pull it back to the namesake elsewhere.
    const qualified = /\(.+\)/.test(rawName);
    // Candidates in order: same division → towns anywhere (Marathi matches
    // must agree phonetically with the English) → nothing. A village in
    // another division never matches: village names repeat everywhere.
    const pick = (ids: string[], viaMr: boolean): string | undefined => {
      const cands = ids.map((id) => stopById.get(id)).filter((x): x is Stop => Boolean(x));
      const local = hint ? cands.find((c) => c.division === hint) : undefined;
      if (local) return local.id;
      const town = cands.find(
        (c) => c.type === 'station' && (!viaMr || phoneticKey(rawName) === phoneticKey(c.name.split(' (')[0])),
      );
      if (town) return town.id;
      return hint ? undefined : cands[0]?.id;
    };
    const existing =
      pick(stopResolver.resolveAll(rawName), false) ?? (mr && !qualified ? pick(stopResolver.resolveAll(mr), true) : undefined);
    if (existing) {
      const s = stopById.get(existing);
      if (s && mr && s.nameMr === s.name) {
        s.nameMr = mr;
        s.nameHi = mr;
      }
      return existing;
    }
    let id = slugify(rawName);
    if (stopById.has(id)) id = `${id}-${hint ?? defaultDivision}`;
    if (!stopById.has(id)) {
      const division = hint ?? defaultDivision;
      const created: Stop = {
        id,
        name: rawName.trim(),
        nameMr: (mr ?? rawName).trim(),
        nameHi: (mr ?? rawName).trim(),
        aliases: [],
        division,
        // A destination named on a division's board may lie outside it, so
        // never guess the district.
        district: 'Unknown',
        type: 'stop',
      };
      stops.push(created);
      stopById.set(id, created);
      stopResolver.addStop(created);
      warnings.push(`Discovered stop "${rawName}"${mr ? ` (${mr})` : ''} → '${id}' in ${division}`);
    }
    return id;
  }

  const trips: Trip[] = [];
  const usedTripIds = new Set<string>();

  for (const p of parsed) {
    const boardId = ensureStop(p.fromRaw, p.fromMr, p.divisionHint);
    // Through bus: real origin, with the printed time applying at the board.
    const originId = p.originRaw ? ensureStop(p.originRaw, p.originMr, p.divisionHint) : boardId;
    const fromId = originId;
    const toId = ensureStop(p.toRaw, p.toMr, p.divisionHint);
    // An intermediate stop must lie roughly between the ends; a far namesake
    // ("Pimpri" → Pimpri-Chinchwad on a Basmat–Jintur road) is dropped when
    // it is a known town, or replaced by a village local to the board.
    const c = ref.coords ?? {};
    const rawVias = p.viaRaw.map((v) => ({ v, id: ensureStop(v, undefined, p.divisionHint) }));
    const known = rawVias.map((x) => c[x.id]).filter(Boolean);
    const endC = c[toId] ?? known[known.length - 1];
    const viaIds = rawVias.flatMap(({ v, id }) => {
      const [o, t, m] = [c[originId], c[toId] ? endC : known.find((k) => k !== c[id]) ?? endC, c[id]];
      if (o && t && m && km([o[0], o[1]], [m[0], m[1]]) + km([m[0], m[1]], [t[0], t[1]]) > km([o[0], o[1]], [t[0], t[1]]) * 1.6 + 30) {
        if (stopById.get(id)?.type === 'station') {
          warnings.push(`Via '${v}' → far town '${id}' dropped`);
          return [];
        }
        const local = `${slugify(v)}-${p.divisionHint ?? defaultDivision}`;
        if (!stopById.has(local)) {
          const st: Stop = { id: local, name: v.trim(), nameMr: v.trim(), nameHi: v.trim(), aliases: [], division: p.divisionHint ?? defaultDivision, district: 'Unknown', type: 'stop' };
          stops.push(st);
          stopById.set(local, st);
        }
        warnings.push(`Via '${v}' resolved to far '${id}' — used local '${local}'`);
        return [local];
      }
      return [id];
    });
    const serviceId = resolveService(p.serviceRaw) ?? 'ordinary';
    if (!resolveService(p.serviceRaw)) {
      warnings.push(`Unknown service "${p.serviceRaw}" → defaulted to 'ordinary'`);
    }
    const through = originId !== boardId;

    // Find or synthesise a route.
    const endpointKey = through ? `${fromId}__${toId}__via__${boardId}` : `${fromId}__${toId}`;
    let route = routeByEndpoints.get(endpointKey);
    if (!route) {
      const rid = through ? `${fromId}-to-${toId}-via-${boardId}` : endpointKey.replace(/__/g, '-to-');
      const fromStop = stops.find((s) => s.id === fromId);
      route = {
        id: rid,
        from: fromId,
        to: toId,
        stops: through ? [fromId, boardId, ...viaIds, toId] : [fromId, ...viaIds, toId],
        division: p.divisionHint ?? fromStop?.division ?? defaultDivision,
        ...(through ? { timingPoint: boardId } : {}),
      };
      routeMap.set(route.id, route);
      routeByEndpoints.set(endpointKey, route);
    }

    const durationMin = computeDuration(p.departure, p.arrival);
    let tripId = `${route.id}-${p.departure.replace(':', '')}-${serviceId}`;
    let n = 1;
    while (usedTripIds.has(tripId)) tripId = `${route.id}-${p.departure.replace(':', '')}-${serviceId}-${++n}`;
    usedTripIds.add(tripId);

    trips.push({
      id: tripId,
      routeId: route.id,
      serviceType: serviceId,
      departure: p.departure,
      arrival: p.arrival,
      durationMin,
      operatingDays: p.operatingDays ?? [],
      depot: resolveDepot(p.depotRaw),
      source: opts.source,
      lastVerified: opts.lastVerified,
      verified: opts.source === 'MSRTC' && p.verified !== false,
    });
  }

  repointImplausibleDestinations(routeMap, routeByEndpoints, trips, stops, stopById, ref, divisionById, warnings);

  // Prune reference routes that have zero trips (orphan routes).
  const routesWithTrips = new Set(trips.map((t) => t.routeId));
  const routes = [...routeMap.values()].filter((r) => routesWithTrips.has(r.id));

  // Group trips into per-division schedule files.
  const byDivision = new Map<string, Trip[]>();
  for (const t of trips) {
    const route = routeMap.get(t.routeId);
    const div = route?.division ?? defaultDivision;
    if (!byDivision.has(div)) byDivision.set(div, []);
    byDivision.get(div)!.push(t);
  }
  const generatedAt = new Date().toISOString();
  const schedules: ScheduleFile[] = [...byDivision.entries()].map(([division, dtrips]) => ({
    division,
    slug: divisionById.get(division)?.slug ?? slugify(division),
    generatedAt,
    trips: dtrips.sort((a, b) => a.departure.localeCompare(b.departure)),
  }));

  // Popular routes: use reference list, else derive top corridors by trip count.
  let popularRoutes: PopularRoute[];
  if (ref.popularRoutes && ref.popularRoutes.length) {
    popularRoutes = ref.popularRoutes.filter((p) => routeMap.has(p.routeId));
  } else {
    const counts = new Map<string, number>();
    for (const t of trips) counts.set(t.routeId, (counts.get(t.routeId) ?? 0) + 1);
    popularRoutes = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([routeId]) => {
        const r = routeMap.get(routeId)!;
        return { routeId, from: r.from, to: r.to };
      });
  }

  // Coordinates + city grouping (used by the interconnected search).
  const cityOf = new Map<string, string>();
  for (const [cid, c] of Object.entries(ref.cities ?? {})) {
    if (cid.startsWith('_')) continue;
    for (const sid of c.stops) cityOf.set(sid, cid);
  }
  for (const s of stops) {
    const c = ref.coords?.[s.id];
    if (c && (s.lat === undefined || s.lng === undefined)) {
      s.lat = c[0];
      s.lng = c[1];
    }
    const city = cityOf.get(s.id);
    if (city) s.city = city;
  }
  // District headquarters = first taluka of each district (highways meet there).
  // Coastal / off-highway HQs are not through-routing hubs: Alibag is across
  // the harbour from Mumbai, Palghar sits off the main highway.
  const NOT_HUB = new Set(['alibag', 'palghar']);
  const hqIds = new Set((ref.districts ?? []).map((d) => d.talukas[0]?.stop).filter((id) => id && !NOT_HUB.has(id)));
  for (const s of stops) if (hqIds.has(s.id)) s.hub = true;

  const stations = stops.filter((s) => s.type === 'station');

  return {
    divisions: ref.divisions,
    depots: ref.depots,
    stops,
    stations,
    routes,
    serviceTypes: ref.serviceTypes,
    popularRoutes,
    districts: ref.districts ?? [],
    schedules,
    trips,
    warnings,
  };
}

function km(a: [number, number], b: [number, number]): number {
  const r = Math.PI / 180;
  const h =
    Math.sin(((b[0] - a[0]) * r) / 2) ** 2 +
    Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(((b[1] - a[1]) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/**
 * A board printed in one division names a destination; when the name matched
 * a town far away in another division ("Deoli" in Wardha for a Malvan village
 * board, the Kolhapur "Malkapur" for a Nashik board meaning Buldhana's), the
 * whole journey planner goes wrong. Accept a far cross-division destination
 * only when it is plausible:
 *   - it is a district HQ / city, or
 *   - it is within 350 km of the board's origin, or
 *   - that town's own board runs buses back to the origin's MSRTC region.
 * Otherwise switch to another place with the same name (nearest plausible
 * first); if there is none the destination is kept as printed.
 */
function repointImplausibleDestinations(
  routeMap: Map<string, Route>,
  routeByEndpoints: Map<string, Route>,
  trips: Trip[],
  stops: Stop[],
  stopById: Map<string, Stop>,
  ref: ReferenceData,
  divisionById: Map<string, Division>,
  warnings: string[],
): void {
  const coords = ref.coords ?? {};
  const ll = (id: string): [number, number] | undefined => {
    const c = coords[id];
    return c ? [c[0], c[1]] : undefined;
  };
  const regionOf = (div: string) => divisionById.get(div)?.region ?? div;
  const hubIds = new Set((ref.districts ?? []).map((d) => d.talukas[0]?.stop).filter(Boolean) as string[]);
  const cityIds = new Set(Object.entries(ref.cities ?? {}).filter(([k]) => !k.startsWith('_')).flatMap(([, c]) => c.stops));
  // regions each stop has buses to (from boards printed at that stop)
  const servesRegion = new Map<string, Set<string>>();
  for (const r of routeMap.values()) {
    const to = stopById.get(r.to);
    if (!to) continue;
    const set = servesRegion.get(r.from) ?? new Set<string>();
    set.add(regionOf(to.division));
    servesRegion.set(r.from, set);
  }
  const byName = new Map<string, Stop[]>();
  for (const s of stops) {
    for (const k of [normalizeKey(s.name.split(' (')[0]), normalizeKey(s.nameMr.split(' (')[0])]) {
      const l = byName.get(k) ?? [];
      if (!l.includes(s)) l.push(s);
      byName.set(k, l);
    }
  }
  const plausible = (origin: Stop, dest: Stop, boardDiv: string): boolean => {
    if (dest.division === boardDiv || hubIds.has(dest.id) || cityIds.has(dest.id)) return true;
    const a = ll(origin.id), b = ll(dest.id);
    if (!a || !b) return true; // can't judge without coordinates
    if (km(a, b) <= 350) return true;
    return servesRegion.get(dest.id)?.has(regionOf(origin.division)) ?? false;
  };

  const moved = new Map<string, string>(); // old route id → new route id
  for (const route of [...routeMap.values()]) {
    const origin = stopById.get(route.from);
    const dest = stopById.get(route.to);
    if (!origin || !dest || route.timingPoint || plausible(origin, dest, route.division)) continue;
    const a = ll(origin.id);
    const alts = [
      ...(byName.get(normalizeKey(dest.name.split(' (')[0])) ?? []),
      ...(byName.get(normalizeKey(dest.nameMr.split(' (')[0])) ?? []),
    ].filter((s, i, arr) => s.id !== dest.id && s.id !== origin.id && arr.indexOf(s) === i && plausible(origin, s, route.division));
    alts.sort((x, y) => {
      const dx = a && ll(x.id) ? km(a, ll(x.id)!) : 9e9;
      const dy = a && ll(y.id) ? km(a, ll(y.id)!) : 9e9;
      return dx - dy;
    });
    // Only switch when a same-named, nearer, plausible place exists. A
    // unique far destination (Pandharpur, Akkalkot, Belgaum…) is a real long
    // route whose return board just isn't transcribed yet — keep it.
    const target = alts[0];
    if (!target) continue;
    const newId = `${route.from}-to-${target.id}`;
    warnings.push(`Re-pointed ${route.id} → ${newId} (far '${dest.id}' implausible for this board)`);
    routeMap.delete(route.id);
    routeByEndpoints.delete(`${route.from}__${route.to}`);
    const existing = routeMap.get(newId);
    if (!existing) {
      const nr: Route = { ...route, id: newId, to: target.id, stops: [...route.stops.slice(0, -1), target.id] };
      routeMap.set(newId, nr);
      routeByEndpoints.set(`${nr.from}__${nr.to}`, nr);
    }
    moved.set(route.id, newId);
  }
  if (moved.size === 0) return;
  for (const t of trips) {
    const n = moved.get(t.routeId);
    if (n) {
      t.id = t.id.replace(t.routeId, n);
      t.routeId = n;
    }
  }
}
