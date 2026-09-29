import { useCallback, useEffect, useState } from 'react';
import { kvGet, kvSet, getFavorites } from './db';
import { notifier, isOptedIn, scheduleAlerts } from './notifications';
import {
  OFFICIAL_ALERTS, FESTIVALS, SCHEMES, TONE_RANK,
  type Category, type Tone, type Source,
} from '@/data/schemes';

/**
 * Smart, colour-coded alerts.
 *
 * Everything is computed on the device from: dated official notices
 * (data/schemes.ts), festival rush windows, the traveller's own profile
 * ("I am a woman / senior / student …"), their pass expiry date and their
 * saved routes. Nothing is sent to a server.
 *
 * Only alerts that matter to this traveller are shown, each at most once as a
 * browser notification, and never more than one notification per day.
 */

export interface TravellerProfile {
  categories: Category[];
  /** User ticked "I already have an active NCMC card". */
  hasNcmc: boolean;
}

export type PassKind = 'student' | 'monthly' | 'quarterly' | 'ebus' | 'avadel4' | 'avadel7' | 'other';
export interface MyPass { kind: PassKind; expires: string; route?: string }

export const PASS_KINDS: { id: PassKind; mr: string; en: string }[] = [
  { id: 'student', mr: 'विद्यार्थी पास', en: 'Student pass' },
  { id: 'monthly', mr: 'मासिक पास', en: 'Monthly pass' },
  { id: 'quarterly', mr: 'त्रैमासिक पास', en: 'Quarterly pass' },
  { id: 'ebus', mr: 'ई-बस पास', en: 'E-bus pass' },
  { id: 'avadel4', mr: 'आवडेल तेथे प्रवास — ४ दिवस', en: 'Travel-as-you-like — 4 days' },
  { id: 'avadel7', mr: 'आवडेल तेथे प्रवास — ७ दिवस', en: 'Travel-as-you-like — 7 days' },
  { id: 'other', mr: 'इतर पास', en: 'Other pass' },
];

export interface SmartAlert {
  id: string;
  tone: Tone;
  titleMr: string;
  titleEn: string;
  bodyMr: string;
  bodyEn: string;
  /** In-app link to act on it. */
  to?: string;
  source?: Source;
  /** Should it pop up as a browser notification (once)? */
  push: boolean;
  /** True when the alert is for a group the traveller said they belong to (or is for everyone). */
  forMe: boolean;
}

const PROFILE_KEY = 'traveller-profile';
const PASS_KEY = 'my-pass';
const READ_KEY = 'alerts-read';
const PUSHED_KEY = 'alerts-pushed';
const LAST_PUSH_DAY_KEY = 'alerts-last-push-day';
const CHANGED = 'smart-alerts-changed';

export const emptyProfile: TravellerProfile = { categories: [], hasNcmc: false };

export async function getProfile(): Promise<TravellerProfile> {
  return { ...emptyProfile, ...((await kvGet<TravellerProfile>(PROFILE_KEY)) ?? {}) };
}
export async function saveProfile(p: TravellerProfile): Promise<void> {
  await kvSet(PROFILE_KEY, p);
  window.dispatchEvent(new Event(CHANGED));
}
export async function getMyPass(): Promise<MyPass | null> {
  return (await kvGet<MyPass | null>(PASS_KEY)) ?? null;
}
export async function saveMyPass(p: MyPass | null): Promise<void> {
  await kvSet(PASS_KEY, p);
  window.dispatchEvent(new Event(CHANGED));
}

/** Local date as YYYY-MM-DD (not UTC — alerts flip at local midnight). */
export function localISO(d = new Date()): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}
function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return localISO(d);
}
const mrDigits = (s: string | number) => String(s).replace(/\d/g, (c) => '०१२३४५६७८९'[+c]);

export function buildAlerts(today: string, profile: TravellerProfile, pass: MyPass | null, favCount: number): SmartAlert[] {
  const out: SmartAlert[] = [];
  const cats = new Set(profile.categories);
  const hasProfile = cats.size > 0;
  const applies = (forCats: Category[]) => forCats.length === 0 || !hasProfile || forCats.some((c) => cats.has(c));

  // 1. Official notices in their date window, for this traveller.
  for (const a of OFFICIAL_ALERTS) {
    if (today < a.from || today > a.to || !applies(a.for)) continue;
    // A traveller who already has the NCMC card doesn't need the NCMC nags.
    if (profile.hasNcmc && a.schemeId === 'ncmc-card' && a.tone === 'urgent') continue;
    const personal = hasProfile && a.for.some((c) => cats.has(c));
    out.push({
      id: a.id, tone: a.tone, titleMr: a.titleMr, titleEn: a.titleEn, bodyMr: a.bodyMr, bodyEn: a.bodyEn,
      to: a.schemeId ? `/passes#${a.schemeId}` : '/passes', source: a.source,
      push: a.tone === 'urgent' && personal,
      forMe: a.for.length === 0 || personal,
    });
  }

  // 2. Pass expiry — colour escalates as the date nears.
  if (pass?.expires) {
    const left = daysBetween(today, pass.expires);
    const label = PASS_KINDS.find((k) => k.id === pass.kind);
    if (left >= -3 && left <= 7) {
      const tone: Tone = left <= 1 ? 'urgent' : left <= 3 ? 'action' : 'personal';
      const whenMr = left < 0 ? 'संपला आहे' : left === 0 ? 'आज संपतो' : left === 1 ? 'उद्या संपतो' : `${mrDigits(left)} दिवसांत संपतो`;
      const whenEn = left < 0 ? 'has expired' : left === 0 ? 'expires today' : left === 1 ? 'expires tomorrow' : `expires in ${left} days`;
      out.push({
        // New id per stage, so each stage (7 / 3 / 1 day) is a fresh unread alert.
        id: `pass-${pass.expires}-${left <= 1 ? 'd1' : left <= 3 ? 'd3' : 'd7'}`,
        tone,
        titleMr: `तुमचा ${label?.mr ?? 'पास'} ${whenMr}`,
        titleEn: `Your ${label?.en ?? 'pass'} ${whenEn}`,
        bodyMr: `मुदत: ${mrDigits(pass.expires.split('-').reverse().join('-'))}. नूतनीकरण आगारात / पास केंद्रात करा — रांग टाळण्यासाठी आधीच करा.`,
        bodyEn: `Valid till ${pass.expires.split('-').reverse().join('-')}. Renew at the depot / pass counter — early, to skip the queue.`,
        to: '/passes#my-pass',
        push: true,
        forMe: true,
      });
    }
  }

  // 3. Festival rush — 10 days before until the end.
  for (const f of FESTIVALS) {
    if (today < addDays(f.start, -10) || today > f.end) continue;
    const before = today < f.start;
    out.push({
      id: `fest-${f.id}${before ? '-soon' : ''}`,
      tone: 'festival',
      titleMr: before ? `${f.nameMr} जवळ — आधीच आरक्षण करा` : `${f.nameMr} — गर्दीचा काळ`,
      titleEn: before ? `${f.nameEn} is coming — book early` : `${f.nameEn} — rush period`,
      bodyMr: f.noteMr,
      bodyEn: f.noteEn,
      to: favCount > 0 ? '/favorites' : '/',
      push: false,
      forMe: true,
    });
  }

  // 4. Nudges that help the traveller get more from the app (shown, never pushed).
  if (!hasProfile) {
    out.push({
      id: 'setup-profile', tone: 'personal',
      titleMr: 'तुम्हाला कोणती एसटी सवलत मिळते? ३० सेकंदात पाहा',
      titleEn: 'Which ST concessions do you get? Find out in 30 seconds',
      bodyMr: 'महिला, ज्येष्ठ, विद्यार्थी, रोजचा प्रवासी — निवडा आणि फक्त तुमच्यासाठीच्या योजना व सूचना मिळवा.',
      bodyEn: 'Woman, senior, student, commuter — pick yours and see only the schemes and alerts that apply.',
      to: '/passes#profile', push: false, forMe: true,
    });
  } else {
    const mine = SCHEMES.filter((s) => s.for.some((c) => cats.has(c)) && s.id !== 'ncmc-card');
    if (mine.length) {
      out.push({
        id: `my-schemes-${[...cats].sort().join('-')}`, tone: 'offer',
        titleMr: `तुमच्यासाठी ${mrDigits(mine.length)} योजना / सवलती`,
        titleEn: `${mine.length} schemes / concessions for you`,
        bodyMr: mine.map((s) => `${s.titleMr} (${s.benefitMr})`).join(' · '),
        bodyEn: mine.map((s) => `${s.titleEn} (${s.benefitEn})`).join(' · '),
        to: '/passes', push: false, forMe: true,
      });
    }
  }
  if (!pass && (cats.has('student') || cats.has('girlStudent') || cats.has('commuter'))) {
    out.push({
      id: 'setup-pass', tone: 'action',
      titleMr: 'पासची मुदत नोंदवा — संपण्याआधी आठवण करून देऊ',
      titleEn: 'Add your pass expiry — we will remind you before it ends',
      bodyMr: '७, ३ आणि १ दिवस आधी रंगीत सूचना.',
      bodyEn: 'Colour-coded reminders 7, 3 and 1 day before.',
      to: '/passes#my-pass', push: false, forMe: true,
    });
  }
  if (favCount === 0) {
    out.push({
      id: 'setup-favorite', tone: 'info',
      titleMr: 'रोजचा मार्ग ⭐ जतन करा',
      titleEn: 'Save your regular route with ⭐',
      bodyMr: 'वेळापत्रक बदलले की लगेच कळवू, आणि मुखपृष्ठावर पुढील बस दिसेल.',
      bodyEn: "We'll tell you when its timetable changes and show the next bus on the home page.",
      to: '/', push: false, forMe: true,
    });
  }

  return out.sort((a, b) => TONE_RANK[b.tone] - TONE_RANK[a.tone]);
}

export async function getReadIds(): Promise<string[]> {
  return (await kvGet<string[]>(READ_KEY)) ?? [];
}
export async function markRead(ids: string[]): Promise<void> {
  const cur = new Set(await getReadIds());
  ids.forEach((i) => cur.add(i));
  await kvSet(READ_KEY, [...cur].slice(-300));
  window.dispatchEvent(new Event(CHANGED));
}

/** Pop the single most important new alert as a browser notification — at most one a day. */
async function pushTopAlert(alerts: SmartAlert[], lang: string): Promise<void> {
  if (!(await isOptedIn()) || !notifier.hasPermission()) return;
  const today = localISO();
  if ((await kvGet<string>(LAST_PUSH_DAY_KEY)) === today) return;
  const pushed = new Set((await kvGet<string[]>(PUSHED_KEY)) ?? []);
  const next = alerts.find((a) => a.push && !pushed.has(a.id));
  if (!next) return;
  await notifier.notify(lang === 'mr' ? next.titleMr : next.titleEn, lang === 'mr' ? next.bodyMr : next.bodyEn, next.id);
  pushed.add(next.id);
  await kvSet(PUSHED_KEY, [...pushed].slice(-300));
  await kvSet(LAST_PUSH_DAY_KEY, today);
}

/** Shared hook: alerts + unread state; refreshes when the profile/pass/read state changes. */
export function useSmartAlerts(lang = 'mr') {
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [read, setRead] = useState<Set<string>>(new Set());
  const [profile, setProfile] = useState<TravellerProfile>(emptyProfile);
  const [pass, setPass] = useState<MyPass | null>(null);

  const refresh = useCallback(async () => {
    const [p, mp, favs, r] = await Promise.all([getProfile(), getMyPass(), getFavorites().catch(() => []), getReadIds()]);
    const list = buildAlerts(localISO(), p, mp, favs.length);
    setProfile(p); setPass(mp); setRead(new Set(r)); setAlerts(list);
    return list;
  }, []);

  useEffect(() => {
    void refresh();
    const on = () => void refresh();
    window.addEventListener(CHANGED, on);
    window.addEventListener('focus', on);
    return () => { window.removeEventListener(CHANGED, on); window.removeEventListener('focus', on); };
  }, [refresh]);

  const unread = alerts.filter((a) => !read.has(a.id));
  return { alerts, unread, read, profile, pass, refresh, markAllRead: () => markRead(alerts.map((a) => a.id)), markRead, lang };
}

/** Run once at app start: re-arm departure reminders and push today's top alert. */
export async function startSmartAlerts(lang: string): Promise<void> {
  try {
    await scheduleAlerts();
    const [p, mp, favs] = await Promise.all([getProfile(), getMyPass(), getFavorites().catch(() => [])]);
    await pushTopAlert(buildAlerts(localISO(), p, mp, favs.length), lang);
  } catch {
    /* best-effort */
  }
}
