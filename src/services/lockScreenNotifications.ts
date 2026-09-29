import { Capacitor } from '@capacitor/core';
import { kvGet, kvSet, getFavorites } from './db';
import { notifier } from './notifications';
import { buildAlerts, getProfile, getMyPass, localISO, type SmartAlert } from './smartAlerts';
import { TONES, SCHEMES, type Tone, type Category } from '@/data/schemes';

/**
 * Lock-screen notifications on the traveller's phone, every few hours.
 *
 * Android app (Capacitor): real local notifications, scheduled on the device
 * for the next 7 days at fixed slots (default every 4 h: 08, 12, 16, 20 —
 * nothing between 22:00 and 07:00). They appear on the lock screen through a
 * high-importance, public-visibility channel, and the small icon is tinted
 * with the alert's colour. Opening the app re-plans the next 7 days, so the
 * content stays fresh; no server is involved.
 *
 * Installed PWA (Chrome on Android): the same plan is saved to IndexedDB and
 * the service worker (public/sw-alerts.js) shows the next due item when the
 * browser wakes it via Periodic Background Sync. The browser decides how often
 * that happens (it depends on how much the app is used), so on the web this is
 * best-effort — the Android app is the reliable path.
 */

export type Frequency = 'h4' | 'h8' | 'daily' | 'off';

export const FREQUENCIES: { id: Frequency; mr: string; en: string; slots: number[] }[] = [
  { id: 'h4', mr: 'दर ४ तासांनी (८, १२, ४, ८ वाजता)', en: 'Every 4 hours (8am, 12pm, 4pm, 8pm)', slots: [8, 12, 16, 20] },
  { id: 'h8', mr: 'दिवसातून दोनदा (९ व ५ वाजता)', en: 'Twice a day (9am, 5pm)', slots: [9, 17] },
  { id: 'daily', mr: 'दिवसातून एकदा (सकाळी ९)', en: 'Once a day (9am)', slots: [9] },
  { id: 'off', mr: 'बंद', en: 'Off', slots: [] },
];

const FREQ_KEY = 'lockscreen-frequency';
const QUEUE_KEY = 'notif-queue';
const CHANNEL = 'st-alerts';
/** Our notification ids live in [ID_BASE, ID_BASE + 200). */
const ID_BASE = 7100;
const DAYS_AHEAD = 7;

export interface PlannedNotification {
  id: number;
  at: number; // epoch ms
  title: string;
  body: string;
  tone: Tone;
  color: string;
  to: string;
}

export const isNativeApp = () => Capacitor.isNativePlatform();

export async function getFrequency(): Promise<Frequency> {
  return (await kvGet<Frequency>(FREQ_KEY)) ?? 'off';
}

/** Short, true, useful tips to fill slots when there is no fresh alert. */
function tips(mr: boolean, favRoutes: { fromName: string; toName: string; from: string; to: string }[], cats: Category[]): Omit<PlannedNotification, 'id' | 'at'>[] {
  const t = (tone: Tone, title: string, body: string, to: string) => ({ tone, color: TONES[tone].color, title, body, to });
  const out = favRoutes.slice(0, 3).map((f) =>
    t('personal',
      mr ? `🚌 ${f.fromName} → ${f.toName}` : `🚌 ${f.fromName} → ${f.toName}`,
      mr ? 'तुमच्या आवडत्या मार्गावरील आजच्या पुढील बस पाहा.' : 'See the next buses on your saved route today.',
      `/search?from=${f.from}&to=${f.to}`));
  // With a profile, only that traveller's schemes; without one, all of them.
  const schemes = cats.length ? SCHEMES.filter((s) => s.for.some((c) => cats.includes(c))) : SCHEMES;
  for (const s of schemes) {
    out.push(t(s.tone === 'urgent' ? 'info' : s.tone,
      `${s.icon} ${mr ? s.titleMr : s.titleEn} — ${mr ? s.benefitMr : s.benefitEn}`,
      mr ? s.whoMr : s.whoEn,
      `/passes#${s.id}`));
  }
  out.push(t('info', mr ? '🗺️ सर्व जिल्हे व तालुक्यांचे वेळापत्रक' : '🗺️ Timetables for every district',
    mr ? 'तुमच्या गावाची बस शोधा — इंटरनेटशिवायही चालते.' : 'Find buses from your village — works offline too.', '/districts'));
  return out;
}

/** Plan the next DAYS_AHEAD days of notifications for the chosen frequency. */
export async function planNotifications(freq: Frequency, lang: string, now = new Date()): Promise<PlannedNotification[]> {
  const slots = FREQUENCIES.find((f) => f.id === freq)?.slots ?? [];
  if (!slots.length) return [];
  const mr = lang === 'mr';
  const [profile, pass, favs] = await Promise.all([getProfile(), getMyPass(), getFavorites().catch(() => [])]);
  const favRoutes = favs.filter((f) => f.kind === 'route') as unknown as { fromName: string; toName: string; from: string; to: string }[];
  const fillers = tips(mr, favRoutes, profile.categories);
  let tipIdx = Math.floor(now.getTime() / 86_400_000) % Math.max(fillers.length, 1);

  const plan: PlannedNotification[] = [];
  const shownOnce = new Set<string>();
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const day = new Date(now);
    day.setDate(now.getDate() + d);
    // Alerts as they will be on that day (deadlines, pass expiry, festivals…).
    const dayAlerts: SmartAlert[] = buildAlerts(localISO(day), profile, pass, favs.length)
      .filter((a) => !a.id.startsWith('setup-')); // setup nudges stay in-app
    // Lock-screen rules (keep it useful, not noisy):
    //  - urgent / for-you / to-do alerts that apply to this traveller: once a day;
    //  - everything else (offers, info, festival, or alerts for other groups):
    //    once in the whole 7-day plan;
    //  - remaining slots rotate through different tips.
    const queue: SmartAlert[] = [];
    for (const a of dayAlerts) {
      const daily = a.forMe && (a.tone === 'urgent' || a.tone === 'personal' || a.tone === 'action');
      if (daily) queue.push(a);
      else if (!shownOnce.has(a.id)) { shownOnce.add(a.id); queue.push(a); }
    }
    let used = 0;
    for (const h of slots) {
      const at = new Date(day);
      at.setHours(h, 0, 0, 0);
      if (at.getTime() <= now.getTime() + 60_000) continue;
      const a = queue[used];
      let item: Omit<PlannedNotification, 'id' | 'at'>;
      if (a) {
        item = {
          tone: a.tone, color: TONES[a.tone].color,
          title: `${TONES[a.tone].icon} ${mr ? a.titleMr : a.titleEn}`,
          body: mr ? a.bodyMr : a.bodyEn,
          to: a.to ?? '/alerts',
        };
        used++;
      } else {
        item = fillers[tipIdx++ % fillers.length];
      }
      plan.push({ ...item, id: ID_BASE + plan.length, at: at.getTime() });
    }
  }
  return plan;
}

/** Ask for permission (Android 13+ / browser). */
export async function requestLockScreenPermission(): Promise<boolean> {
  if (isNativeApp()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const cur = await LocalNotifications.checkPermissions();
    if (cur.display === 'granted') return true;
    return (await LocalNotifications.requestPermissions()).display === 'granted';
  }
  return notifier.requestPermission();
}

/** Save the frequency and (re)schedule. Call on app start and whenever inputs change. */
export async function setFrequency(freq: Frequency, lang: string): Promise<void> {
  await kvSet(FREQ_KEY, freq);
  await rescheduleLockScreen(lang);
}

export async function rescheduleLockScreen(lang: string): Promise<void> {
  const freq = await getFrequency();
  const plan = await planNotifications(freq, lang);
  await kvSet(QUEUE_KEY, plan); // read by the PWA service worker

  if (isNativeApp()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    if ((await LocalNotifications.checkPermissions()).display !== 'granted') return;
    await LocalNotifications.createChannel({
      id: CHANNEL,
      name: lang === 'mr' ? 'एसटी सूचना' : 'ST alerts',
      description: 'Pass, concession and bus alerts',
      importance: 4, // high → heads-up + lock screen
      visibility: 1, // public → full text on the lock screen
      vibration: true,
      lights: true,
      lightColor: '#E11D48',
    });
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter((n) => n.id >= ID_BASE && n.id < ID_BASE + 200);
    if (ours.length) await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) });
    if (!plan.length) return;
    await LocalNotifications.schedule({
      notifications: plan.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        largeBody: p.body,
        channelId: CHANNEL,
        smallIcon: 'ic_stat_bus',
        iconColor: p.color,
        schedule: { at: new Date(p.at), allowWhileIdle: true },
        extra: { to: p.to },
      })),
    });
    return;
  }

  // Installed PWA: ask the browser to wake the service worker roughly every 4 h.
  try {
    const reg = await navigator.serviceWorker?.ready;
    const ps = (reg as unknown as { periodicSync?: { register(tag: string, o: { minInterval: number }): Promise<void>; unregister(tag: string): Promise<void> } })?.periodicSync;
    if (!ps) return;
    if (freq === 'off') { await ps.unregister('st-alerts'); return; }
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName });
    if (status.state === 'granted') await ps.register('st-alerts', { minInterval: 4 * 60 * 60 * 1000 });
  } catch {
    /* not supported — in-app alerts still work */
  }
}

/** Open the right page when a notification is tapped (Android app). */
export async function listenForNotificationTaps(open: (to: string) => void): Promise<void> {
  if (!isNativeApp()) return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  await LocalNotifications.addListener('localNotificationActionPerformed', (e) => {
    const to = (e.notification.extra as { to?: string } | undefined)?.to;
    if (to) open(to);
  });
}
