import type {
  DatasetMetadata,
  Division,
  Depot,
  Stop,
  Route,
  ServiceType,
  PopularRoute,
  ChangeSet,
  ScheduleFile,
  Trip,
  District,
} from '@/types/domain';
import { cacheGet, cachePut } from './db';

const DATA_URL = `${import.meta.env.BASE_URL}data/`;

export interface CoreData {
  metadata: DatasetMetadata;
  divisions: Division[];
  depots: Depot[];
  stops: Stop[];
  stations: Stop[];
  routes: Route[];
  serviceTypes: ServiceType[];
  popularRoutes: PopularRoute[];
  changes: ChangeSet;
  districts: District[];
  /** True when at least one file was served from the offline cache. */
  fromCache: boolean;
}

/**
 * Fetch a JSON file with an offline fallback:
 *   1. try the network (and refresh the IndexedDB cache on success)
 *   2. on failure, fall back to the last cached copy
 * The service worker also caches /data (stale-while-revalidate); this second
 * layer means the app works offline even in dev, and can report cache use.
 */
async function fetchJson<T>(path: string): Promise<{ data: T; fromCache: boolean }> {
  const url = `${DATA_URL}${path}`;
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as T;
    void cachePut(path, data);
    return { data, fromCache: false };
  } catch (err) {
    const cached = await cacheGet<T>(path);
    if (cached !== undefined) return { data: cached, fromCache: true };
    throw err;
  }
}

export async function loadCore(): Promise<CoreData> {
  const files = [
    'metadata.json',
    'divisions.json',
    'depots.json',
    'stops.json',
    'stations.json',
    'routes.json',
    'service-types.json',
    'popular-routes.json',
    'changes.json',
    'districts.json',
  ] as const;

  const results = await Promise.all(files.map((f) => fetchJson<unknown>(f)));
  const [metadata, divisions, depots, stops, stations, routes, serviceTypes, popularRoutes, changes, districts] =
    results.map((r) => r.data);

  return {
    metadata: metadata as DatasetMetadata,
    divisions: divisions as Division[],
    depots: depots as Depot[],
    stops: stops as Stop[],
    stations: stations as Stop[],
    routes: routes as Route[],
    serviceTypes: serviceTypes as ServiceType[],
    popularRoutes: popularRoutes as PopularRoute[],
    changes: changes as ChangeSet,
    districts: (districts as District[]) ?? [],
    fromCache: results.some((r) => r.fromCache),
  };
}

const scheduleCache = new Map<string, Trip[]>();

/** Lazy-load one division's schedule file (the large per-division trip data). */
export async function loadSchedule(slug: string): Promise<Trip[]> {
  if (scheduleCache.has(slug)) return scheduleCache.get(slug)!;
  const { data } = await fetchJson<ScheduleFile>(`schedules/${slug}.json`);
  const trips = data.trips ?? [];
  scheduleCache.set(slug, trips);
  return trips;
}

/** Load several division schedule files at once (dedup + parallel). */
export async function loadSchedules(slugs: string[]): Promise<Trip[]> {
  const unique = [...new Set(slugs)];
  const lists = await Promise.all(unique.map((s) => loadSchedule(s).catch(() => [] as Trip[])));
  return lists.flat();
}
