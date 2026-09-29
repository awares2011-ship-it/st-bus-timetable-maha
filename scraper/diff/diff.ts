import type { Trip, Route, DataChange } from '../../src/types/domain';

function routeLabel(routesById: Map<string, Route>, routeId: string): string {
  const r = routesById.get(routeId);
  if (!r) return routeId;
  return `${r.from} → ${r.to}`;
}

/**
 * Compute a human-meaningful diff between the previous and new datasets.
 * Produces the change list that powers /data/changes.json (and, later,
 * "your saved route changed" notifications).
 */
export function diffDatasets(
  prev: { trips: Trip[]; routes: Route[] },
  next: { trips: Trip[]; routes: Route[] },
): DataChange[] {
  const changes: DataChange[] = [];

  const prevRoutes = new Map(prev.routes.map((r) => [r.id, r]));
  const nextRoutes = new Map(next.routes.map((r) => [r.id, r]));

  // Route add/remove
  for (const id of nextRoutes.keys())
    if (!prevRoutes.has(id))
      changes.push({ type: 'NEW_ROUTE', routeId: id, route: routeLabel(nextRoutes, id) });
  for (const id of prevRoutes.keys())
    if (!nextRoutes.has(id))
      changes.push({ type: 'REMOVED_ROUTE', routeId: id, route: routeLabel(prevRoutes, id) });

  const prevTrips = new Map(prev.trips.map((t) => [t.id, t]));
  const nextTrips = new Map(next.trips.map((t) => [t.id, t]));

  for (const [id, t] of nextTrips) {
    const old = prevTrips.get(id);
    if (!old) {
      changes.push({ type: 'NEW_TRIP', routeId: t.routeId, route: routeLabel(nextRoutes, t.routeId), tripId: id });
      continue;
    }
    if (old.departure !== t.departure) {
      changes.push({
        type: 'TIME_CHANGED',
        routeId: t.routeId,
        route: routeLabel(nextRoutes, t.routeId),
        tripId: id,
        field: 'departure',
        old: old.departure,
        new: t.departure,
      });
    }
    if (old.arrival !== t.arrival && (old.arrival || t.arrival)) {
      changes.push({
        type: 'TIME_CHANGED',
        routeId: t.routeId,
        route: routeLabel(nextRoutes, t.routeId),
        tripId: id,
        field: 'arrival',
        old: old.arrival ?? '',
        new: t.arrival ?? '',
      });
    }
    if (old.serviceType !== t.serviceType) {
      changes.push({
        type: 'SERVICE_CHANGED',
        routeId: t.routeId,
        route: routeLabel(nextRoutes, t.routeId),
        tripId: id,
        field: 'serviceType',
        old: old.serviceType,
        new: t.serviceType,
      });
    }
  }

  for (const [id, t] of prevTrips)
    if (!nextTrips.has(id))
      changes.push({ type: 'REMOVED_TRIP', routeId: t.routeId, route: routeLabel(prevRoutes, t.routeId), tripId: id });

  return changes;
}
