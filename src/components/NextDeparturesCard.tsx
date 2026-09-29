import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '@/context/DataContext';
import { useI18n, localName } from '@/i18n/I18nContext';
import { serviceRole, roleStyle } from './ServiceBadge';
import type { Trip, Stop } from '@/types/domain';
import { routePairSlug } from '@/utils/text';
import { loadSchedules } from '@/services/data';

/**
 * NextDeparturesCard — the marquee visual on the home page.
 *
 * Picks the next 5 upcoming departures across all loaded schedules and
 * shows a live countdown to each. This gives someone opening the app in
 * the morning an immediate answer to "what's leaving soon from around
 * me?" without having to search.
 *
 * The card intentionally has no location/permission dependency: it works
 * offline and everywhere. When the user opts into notifications from
 * SettingsPage, the countdown itself becomes the alert (see
 * `scheduleAlerts` in services/notifications.ts).
 */

interface Row {
  trip: Trip;
  from: Stop;
  to: Stop;
  minutesUntil: number;
}

/** Minutes from `now` until the next occurrence of "HH:MM" (today or tomorrow). */
function minutesUntil(hhmm: string, now: Date): number {
  const [h, m] = hhmm.split(':').map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const tripMin = (h ?? 0) * 60 + (m ?? 0);
  let diff = tripMin - nowMin;
  if (diff < 0) diff += 24 * 60;
  return diff;
}

export function NextDeparturesCard() {
  const { core, routeById, stopById } = useData();
  const { lang } = useI18n();
  const [now, setNow] = useState<Date>(() => new Date());
  const [trips, setTrips] = useState<Trip[] | null>(null);

  // Re-tick every 30s so the countdown updates without hammering React.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Lazy-load every division schedule we know about, then flatten. Cached by
  // loadSchedules so subsequent renders are free.
  useEffect(() => {
    if (!core) return;
    const slugs = (core.metadata.schedules ?? []).map((s) => s.slug);
    let alive = true;
    void loadSchedules(slugs).then((t) => { if (alive) setTrips(t); });
    return () => { alive = false; };
  }, [core]);

  const rows = useMemo<Row[]>(() => {
    if (!core || !trips) return [];
    const list: Row[] = [];
    for (const trip of trips) {
      const route = routeById.get(trip.routeId);
      if (!route) continue;
      const from = stopById.get(route.from);
      const to   = stopById.get(route.to);
      if (!from || !to) continue;
      list.push({ trip, from, to, minutesUntil: minutesUntil(trip.departure, now) });
    }
    return list.sort((a, b) => a.minutesUntil - b.minutesUntil).slice(0, 5);
  }, [core, trips, routeById, stopById, now]);

  if (rows.length === 0) return null;
  const serviceById = new Map((core?.serviceTypes ?? []).map((s) => [s.id, s]));

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            पुढच्या बस / Next departures
          </p>
          <p className="text-sm font-bold text-slate-900">आज • {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <span aria-hidden className="h-2.5 w-2.5 animate-softpulse rounded-full" style={{ background: 'var(--accent)' }} />
      </div>
      <ul className="divide-y divide-slate-100">
        {rows.map(({ trip, from, to, minutesUntil }) => {
          const service = serviceById.get(trip.serviceType);
          const roleCls = service ? roleStyle(serviceRole(service)) : '';
          const soon = minutesUntil <= 30;
          return (
            <li key={trip.id}>
              <Link
                to={`/route/${routePairSlug(from.id, to.id)}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition"
              >
                <div className="w-14 shrink-0 text-right">
                  <p className={`text-lg font-bold tabular-nums ${soon ? 'text-red-600' : 'text-slate-800'}`}>
                    {trip.departure}
                  </p>
                  <p className={`text-[10px] leading-none ${soon ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                    {minutesUntil < 60
                      ? `${minutesUntil}m`
                      : `${Math.floor(minutesUntil / 60)}h${minutesUntil % 60 ? ' ' + (minutesUntil % 60) + 'm' : ''}`}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {localName(lang, from)} → {localName(lang, to)}
                  </p>
                  {service && (
                    <span className={`chip mt-0.5 ring-1 ${roleCls}`}>
                      {service.ac && <span aria-hidden className="text-[10px]">❄</span>}
                      {localName(lang, service)}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
