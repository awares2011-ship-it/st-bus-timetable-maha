import { useEffect, useMemo, useState } from 'react';
import { useData } from '@/context/DataContext';
import { loadSchedules } from '@/services/data';
import { findRouteMatches, assembleResults, type ResultTrip } from '@/search/searchEngine';
import { weekdayOf } from '@/utils/format';

interface Result {
  loading: boolean;
  error?: string;
  results: ResultTrip[];
  /** results before the operating-day filter (for "runs on other days" hints). */
  allResults: ResultTrip[];
  hasRoute: boolean;
}

/**
 * Orchestrates a from→to lookup: find candidate routes (from core data), lazy-
 * load only the needed division schedule files, and assemble direction-aware
 * results. Optionally filters to a given date's weekday.
 */
export function useRouteResults(
  from: string | null,
  to: string | null,
  dateISO?: string,
): Result {
  const { core } = useData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [allResults, setAllResults] = useState<ResultTrip[]>([]);

  const matches = useMemo(() => {
    if (!core || !from || !to) return [];
    return findRouteMatches(core.routes, from, to);
  }, [core, from, to]);

  useEffect(() => {
    let cancelled = false;
    if (!from || !to || matches.length === 0) {
      setAllResults([]);
      setLoading(false);
      setError(undefined);
      return;
    }
    setLoading(true);
    setError(undefined);
    const slugs = matches
      .map((m) => core?.divisions.find((d) => d.id === m.route.division)?.slug)
      .filter((s): s is string => Boolean(s));
    loadSchedules(slugs)
      .then((trips) => {
        if (cancelled) return;
        setAllResults(assembleResults(matches, trips));
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
  }, [from, to, matches, core]);

  const results = useMemo(() => {
    if (!dateISO) return allResults;
    const wd = weekdayOf(new Date(`${dateISO}T00:00:00`));
    return allResults.filter((r) => r.trip.operatingDays.includes(wd));
  }, [allResults, dateISO]);

  return {
    loading,
    error,
    results,
    allResults,
    hasRoute: matches.length > 0,
  };
}
