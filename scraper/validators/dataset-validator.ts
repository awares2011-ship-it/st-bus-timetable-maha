import type { Route, Stop, Trip } from '../../src/types/domain';
import type { NormalizeResult } from '../normalizers/normalize-dataset';
import { validateTrip, findDuplicateTrips, type Issue } from './trip-validator';

export interface ValidationReport {
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
  stats: {
    trips: number;
    routes: number;
    stops: number;
    previousTrips?: number;
    tripDeltaPct?: number;
  };
  /** True when a suspicious drop blocked publication. */
  blockedBySuspiciousChange: boolean;
  summary: string;
}

export interface ValidateOptions {
  /** Previous dataset's trip count, for the suspicious-change guard. */
  previousTripCount?: number;
  /**
   * If the new trip count is below this fraction of the previous count, refuse
   * to publish (the source was probably broken). Default 0.4 (a 60%+ drop).
   */
  minRetainFraction?: number;
}

/**
 * Validate a full normalised dataset. Returns ok=false when there are hard
 * errors OR a suspicious mass-deletion is detected — in which case the caller
 * must KEEP the previous dataset and not publish.
 */
export function validateDataset(
  data: Pick<NormalizeResult, 'trips' | 'routes' | 'stops'>,
  opts: ValidateOptions = {},
): ValidationReport {
  const routesById = new Map<string, Route>(data.routes.map((r) => [r.id, r]));
  const stopsById = new Map<string, Stop>(data.stops.map((s) => [s.id, s]));

  const allIssues: Issue[] = [];
  for (const t of data.trips as Trip[]) {
    allIssues.push(...validateTrip(t, routesById, stopsById));
  }
  allIssues.push(...findDuplicateTrips(data.trips as Trip[]));

  const errors = allIssues.filter((i) => i.level === 'error');
  const warnings = allIssues.filter((i) => i.level === 'warning');

  // Suspicious-change guard.
  const minFraction = opts.minRetainFraction ?? 0.4;
  let blocked = false;
  let tripDeltaPct: number | undefined;
  if (opts.previousTripCount && opts.previousTripCount > 0) {
    tripDeltaPct = ((data.trips.length - opts.previousTripCount) / opts.previousTripCount) * 100;
    if (data.trips.length < opts.previousTripCount * minFraction) {
      blocked = true;
      errors.push({
        level: 'error',
        code: 'SUSPICIOUS_DROP',
        message: `new trip count ${data.trips.length} is far below previous ${opts.previousTripCount} (${tripDeltaPct.toFixed(1)}%) — refusing to publish`,
      });
    }
  }

  const ok = errors.length === 0 && !blocked;
  const summary = ok
    ? `OK — ${data.trips.length} trips, ${data.routes.length} routes, ${warnings.length} warning(s)`
    : `FAILED — ${errors.length} error(s), ${warnings.length} warning(s)${blocked ? ' [suspicious change]' : ''}`;

  return {
    ok,
    errors,
    warnings,
    stats: {
      trips: data.trips.length,
      routes: data.routes.length,
      stops: data.stops.length,
      previousTrips: opts.previousTripCount,
      tripDeltaPct,
    },
    blockedBySuspiciousChange: blocked,
    summary,
  };
}
