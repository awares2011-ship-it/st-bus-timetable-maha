import type { ChangeSet, DataChange } from '@/types/domain';
import { kvGet, kvSet, getFavorites } from './db';

/**
 * Notification abstraction.
 *
 * Deliberately NOT tied to Firebase or any push service. It defines a small
 * interface so that:
 *   - on the web we use the standard Notification API (opt-in only)
 *   - inside a Capacitor Android build, a native LocalNotifications adapter can
 *     be dropped in later WITHOUT changing any calling code
 *
 * The only notifications this app cares about: a saved route's or saved
 * station's timetable changed.
 */
export interface Notifier {
  isSupported(): boolean;
  hasPermission(): boolean;
  requestPermission(): Promise<boolean>;
  notify(title: string, body: string, tag?: string): Promise<void>;
}

/** Web implementation using the Notification API. */
class WebNotifier implements Notifier {
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }
  hasPermission(): boolean {
    return this.isSupported() && Notification.permission === 'granted';
  }
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    if (Notification.permission === 'granted') return true;
    const res = await Notification.requestPermission();
    return res === 'granted';
  }
  async notify(title: string, body: string, tag?: string): Promise<void> {
    if (!this.hasPermission()) return;
    new Notification(title, { body, tag, icon: '/icons/icon-192.png' });
  }
}

/**
 * A no-op adapter placeholder documenting where the Capacitor
 * `@capacitor/local-notifications` implementation would go for the Android app.
 */
// class CapacitorNotifier implements Notifier { ... }  // added in the native build

export const notifier: Notifier = new WebNotifier();

const OPT_IN_KEY = 'notif-opt-in';
const SEEN_VERSION_KEY = 'notif-seen-version';
const ROUTE_SUB_KEY = 'notif-route-subs';

export async function isOptedIn(): Promise<boolean> {
  return (await kvGet<boolean>(OPT_IN_KEY)) ?? false;
}

export async function setOptedIn(value: boolean): Promise<void> {
  await kvSet(OPT_IN_KEY, value);
}

export async function getRouteSubs(): Promise<string[]> {
  return (await kvGet<string[]>(ROUTE_SUB_KEY)) ?? [];
}
export async function isRouteSubscribed(routeId: string): Promise<boolean> {
  const subs = await getRouteSubs();
  return subs.includes(routeId);
}
export async function setRouteSubscribed(routeId: string, sub: boolean): Promise<void> {
  const subs = new Set(await getRouteSubs());
  if (sub) subs.add(routeId); else subs.delete(routeId);
  await kvSet(ROUTE_SUB_KEY, [...subs]);
}
export async function getSubscribedCount(): Promise<number> {
  return (await getRouteSubs()).length;
}

/* ------------------------------------------------------------------ *
 * Smart next-departure reminders
 * ------------------------------------------------------------------ *
 * A small session-local scheduler that fires an alert `leadMinutes`
 * before an upcoming departure the user cares about. Uses setTimeout
 * (not push) so it works entirely offline and needs no server.
 *
 * Each subscription is a lightweight record of routeId + service +
 * departure time (HH:MM). The scheduler:
 *   - re-evaluates on load / tab-focus,
 *   - picks the next occurrence today or tomorrow,
 *   - fires at (occurrence − leadMinutes),
 *   - respects the user's notification opt-in and the browser permission.
 *
 * When the app is later packaged with Capacitor for Android, the same
 * shape maps 1:1 to `@capacitor/local-notifications` schedules — no
 * caller changes required.
 */

export interface DepartureAlert {
  /** Stable key so we don't schedule the same departure twice. */
  key: string;
  routeId: string;
  routeLabel: string;
  serviceLabel: string;
  /** "HH:MM" 24-hour departure at origin. */
  departure: string;
  /** Minutes before departure at which the reminder should fire. */
  leadMinutes: number;
}

const ALERTS_KEY = 'notif-departure-alerts';
/** In-memory timers keyed by alert key, so re-scheduling is idempotent. */
const timers = new Map<string, ReturnType<typeof setTimeout>>();

export async function getDepartureAlerts(): Promise<DepartureAlert[]> {
  return (await kvGet<DepartureAlert[]>(ALERTS_KEY)) ?? [];
}

export async function addDepartureAlert(alert: DepartureAlert): Promise<void> {
  const list = await getDepartureAlerts();
  const filtered = list.filter((a) => a.key !== alert.key);
  filtered.push(alert);
  await kvSet(ALERTS_KEY, filtered);
  await scheduleAlerts();
}

export async function removeDepartureAlert(key: string): Promise<void> {
  const list = await getDepartureAlerts();
  await kvSet(ALERTS_KEY, list.filter((a) => a.key !== key));
  const t = timers.get(key);
  if (t) { clearTimeout(t); timers.delete(key); }
}

/**
 * Turn "HH:MM" into the next `Date` occurrence at or after `from`. If the
 * time has already passed today, returns tomorrow at that time.
 */
function nextOccurrence(hhmm: string, from: Date): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(from);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  if (d.getTime() <= from.getTime()) d.setDate(d.getDate() + 1);
  return d;
}

/**
 * (Re)schedule every stored departure alert. Safe to call repeatedly — every
 * previous timer is cleared first so no double-fires. Silently no-ops when
 * the user has not opted in / not granted browser permission.
 */
export async function scheduleAlerts(now = new Date()): Promise<void> {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
  if (!(await isOptedIn()) || !notifier.hasPermission()) return;

  const alerts = await getDepartureAlerts();
  for (const a of alerts) {
    const when = nextOccurrence(a.departure, now).getTime() - a.leadMinutes * 60_000;
    const delay = when - now.getTime();
    if (delay <= 0) continue; // Already passed the lead time; skip until tomorrow.
    // setTimeout accepts up to ~24.8 days; every alert here is under 24h.
    const handle = setTimeout(() => {
      void notifier.notify(
        `बस निघत आहे • Departing in ${a.leadMinutes} min`,
        `${a.routeLabel} • ${a.serviceLabel} • ${a.departure}`,
        a.key,
      );
      // Re-schedule for the next day.
      void scheduleAlerts();
    }, delay);
    timers.set(a.key, handle);
  }
}

/**
 * Compare the freshly loaded changes.json against the user's saved routes and
 * fire an opt-in notification for anything relevant. Called after data load.
 */
export async function checkSavedRouteChanges(changes: ChangeSet): Promise<DataChange[]> {
  if (!(await isOptedIn()) || !notifier.hasPermission()) return [];
  const seen = await kvGet<string>(SEEN_VERSION_KEY);
  if (seen === changes.datasetVersion) return [];

  const favs = await getFavorites();
  const favRouteIds = new Set(
    favs.filter((f) => f.kind === 'route').map((f) => `${(f as { from: string }).from}-to-${(f as { to: string }).to}`),
  );
  const subs = new Set(await getRouteSubs());
  const targetIds = subs.size>0 ? subs : favRouteIds;
  const relevant = changes.changes.filter((c) => c.routeId && targetIds.has(c.routeId));

  for (const c of relevant.slice(0, 3)) {
    await notifier.notify(
      'Saved route timetable changed',
      `${c.route ?? c.routeId}: ${c.type.replace(/_/g, ' ').toLowerCase()}`,
      c.routeId,
    );
  }
  await kvSet(SEEN_VERSION_KEY, changes.datasetVersion);
  return relevant;
}
