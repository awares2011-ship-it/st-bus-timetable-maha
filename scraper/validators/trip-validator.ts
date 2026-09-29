import type { Trip, Route, Stop } from '../../src/types/domain';
import { toMinutes } from '../normalizers/time-normalizer';

export interface Issue {
  level: 'error' | 'warning';
  code: string;
  message: string;
  tripId?: string;
  routeId?: string;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_DURATION_MIN = 22 * 60; // longest realistic single ST run

/** Validate one trip in the context of its route and the stop set. */
export function validateTrip(
  trip: Trip,
  routesById: Map<string, Route>,
  stopsById: Map<string, Stop>,
): Issue[] {
  const issues: Issue[] = [];
  const push = (level: Issue['level'], code: string, message: string) =>
    issues.push({ level, code, message, tripId: trip.id, routeId: trip.routeId });

  // Required fields
  if (!trip.serviceType) push('error', 'MISSING_SERVICE', 'trip has no serviceType');
  if (!trip.operatingDays || trip.operatingDays.length === 0)
    push('error', 'NO_DAYS', 'trip has no operating days');
  if (!TIME_RE.test(trip.departure)) push('error', 'BAD_DEPARTURE', `bad departure "${trip.departure}"`);
  if (trip.arrival && !TIME_RE.test(trip.arrival)) push('error', 'BAD_ARRIVAL', `bad arrival "${trip.arrival}"`);

  // Route existence + endpoints
  const route = routesById.get(trip.routeId);
  if (!route) {
    push('error', 'NO_ROUTE', `route '${trip.routeId}' not found`);
    return issues;
  }
  if (route.from === route.to) push('error', 'SAME_ENDPOINT', 'route from == to');
  if (!stopsById.has(route.from)) push('error', 'BAD_ORIGIN', `origin stop '${route.from}' unknown`);
  if (!stopsById.has(route.to)) push('error', 'BAD_DEST', `destination stop '${route.to}' unknown`);

  // Timing sanity
  if (trip.arrival && TIME_RE.test(trip.departure) && TIME_RE.test(trip.arrival)) {
    let dur = toMinutes(trip.arrival) - toMinutes(trip.departure);
    if (dur < 0) dur += 24 * 60; // overnight
    if (dur === 0) push('error', 'ZERO_DURATION', 'arrival equals departure');
    if (dur > MAX_DURATION_MIN)
      push('warning', 'LONG_DURATION', `duration ${dur}min exceeds ${MAX_DURATION_MIN}min`);
    if (trip.durationMin != null && Math.abs(trip.durationMin - dur) > 1)
      push('warning', 'DURATION_MISMATCH', `stored durationMin ${trip.durationMin} != computed ${dur}`);
  }

  return issues;
}

/** Detect duplicate trips (same route + departure + service + identical days). */
export function findDuplicateTrips(trips: Trip[]): Issue[] {
  const seen = new Map<string, string>();
  const issues: Issue[] = [];
  for (const t of trips) {
    const key = `${t.routeId}|${t.departure}|${t.serviceType}|${[...t.operatingDays].sort().join(',')}`;
    if (seen.has(key)) {
      issues.push({
        level: 'warning',
        code: 'DUPLICATE_TRIP',
        message: `duplicate of ${seen.get(key)}`,
        tripId: t.id,
        routeId: t.routeId,
      });
    } else {
      seen.set(key, t.id);
    }
  }
  return issues;
}
