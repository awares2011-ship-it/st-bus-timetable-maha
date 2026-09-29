import { useEffect, useMemo, useState } from 'react';
import { useData } from '@/context/DataContext';
import { loadSchedules } from '@/services/data';
import { weekdayOf } from '@/utils/format';
import {
  assembleJourney,
  findConnections,
  planJourney,
  type HubOption,
  type PlannedTrip,
} from '@/search/journeyPlanner';
import type { Trip } from '@/types/domain';

export interface ConnectionView extends HubOption {
  firstTrips: Trip[];
  secondTrips: Trip[];
}

interface JourneyResult {
  loading: boolean;
  error?: string;
  /** trips running on the chosen date (all trips if no date) */
  trips: PlannedTrip[];
  /** trips before the weekday filter */
  allTrips: PlannedTrip[];
  connections: ConnectionView[];
  fromStands: string[];
  toStands: string[];
}

/**
 * Every way to get from `from` to `to` on a date: all stands in both cities,
 * buses continuing beyond the destination, buses passing through from other
 * depots, and one-change connections when through buses are scarce.
 */
export function useJourney(from: string | null, to: string | null, dateISO?: string): JourneyResult {
  const { core, stopById, divisionById } = useData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [allTrips, setAllTrips] = useState<PlannedTrip[]>([]);
  const [connections, setConnections] = useState<ConnectionView[]>([]);

  const plan = useMemo(() => {
    if (!core || !from || !to) return null;
    const p = planJourney(core.routes, stopById, core.stops, from, to);
    const exactCount = p.matches.filter((m) => !m.approx).length;
    const hubs = exactCount < 4 ? findConnections(core.routes, stopById, p.A, p.B, from, to) : [];
    return { ...p, hubs };
  }, [core, stopById, from, to]);

  useEffect(() => {
    let cancelled = false;
    if (!plan || (plan.matches.length === 0 && plan.hubs.length === 0)) {
      setAllTrips([]);
      setConnections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    const routes = [...plan.matches.map((m) => m.route), ...plan.hubs.flatMap((h) => [...h.first, ...h.second])];
    const slugs = [...new Set(routes.map((r) => divisionById.get(r.division)?.slug).filter((s): s is string => Boolean(s)))];
    loadSchedules(slugs)
      .then((trips) => {
        if (cancelled) return;
        setAllTrips(assembleJourney(plan.matches, trips));
        const byRoute = new Map<string, Trip[]>();
        for (const tr of trips) {
          const l = byRoute.get(tr.routeId) ?? [];
          l.push(tr);
          byRoute.set(tr.routeId, l);
        }
        const pick = (rs: typeof routes) =>
          rs.flatMap((r) => byRoute.get(r.id) ?? []).sort((a, b) => a.departure.localeCompare(b.departure));
        setConnections(plan.hubs.map((h) => ({ ...h, firstTrips: pick(h.first), secondTrips: pick(h.second) })));
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [plan, divisionById]);

  const trips = useMemo(() => {
    if (!dateISO) return allTrips;
    const wd = weekdayOf(new Date(`${dateISO}T00:00:00`));
    return allTrips.filter((p) => p.trip.operatingDays.length === 0 || p.trip.operatingDays.includes(wd));
  }, [allTrips, dateISO]);

  return {
    loading,
    error,
    trips,
    allTrips,
    connections,
    fromStands: plan ? [...plan.A] : [],
    toStands: plan ? [...plan.B] : [],
  };
}
