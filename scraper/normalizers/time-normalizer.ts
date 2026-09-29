import type { Weekday } from '../../src/types/domain';
import { ALL_WEEKDAYS } from '../../src/types/domain';

const DAY_INDEX: Record<string, Weekday> = {
  MON: 'MON', MONDAY: 'MON', SOM: 'MON',
  TUE: 'TUE', TUES: 'TUE', TUESDAY: 'TUE', MANGAL: 'TUE',
  WED: 'WED', WEDNESDAY: 'WED', BUDH: 'WED',
  THU: 'THU', THUR: 'THU', THURS: 'THU', THURSDAY: 'THU', GURU: 'THU',
  FRI: 'FRI', FRIDAY: 'FRI', SHUKRA: 'FRI',
  SAT: 'SAT', SATURDAY: 'SAT', SHANI: 'SAT',
  SUN: 'SUN', SUNDAY: 'SUN', RAVI: 'SUN',
};

/**
 * Normalise a raw time to 24h "HH:MM". Handles:
 *   "6:00", "06:00", "6.00", "0600", "6:00 AM", "6:00 pm", "18:00"
 * Returns undefined if the value is not a plausible time.
 */
export function normalizeTime(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let s = raw.trim().toLowerCase();
  const ampm = /\b(am|pm)\b/.exec(s)?.[1];
  s = s.replace(/\b(am|pm)\b/, '').trim();
  s = s.replace('.', ':');
  let hh: number;
  let mm: number;
  if (/^\d{3,4}$/.test(s)) {
    // "600" or "0600"
    const padded = s.padStart(4, '0');
    hh = Number(padded.slice(0, 2));
    mm = Number(padded.slice(2));
  } else {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s);
    if (!m) return undefined;
    hh = Number(m[1]);
    mm = Number(m[2]);
  }
  if (ampm === 'pm' && hh < 12) hh += 12;
  if (ampm === 'am' && hh === 12) hh = 0;
  if (!Number.isInteger(hh) || !Number.isInteger(mm)) return undefined;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return undefined;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Duration in minutes from departure to arrival. If arrival is earlier than
 * departure, the trip is assumed to cross midnight (overnight service).
 */
export function computeDuration(departure: string, arrival?: string): number | undefined {
  if (!arrival) return undefined;
  const dep = toMinutes(departure);
  let arr = toMinutes(arrival);
  if (arr < dep) arr += 24 * 60;
  return arr - dep;
}

/**
 * Parse an operating-days expression into an ordered Weekday[]:
 *   "DAILY" | "ALL"            → all 7
 *   "MON-SAT" | "MON-FRI"      → inclusive range
 *   "MON,WED,FRI"             → explicit list
 *   "SUN"                     → single day
 */
export function parseOperatingDays(raw: string | undefined): Weekday[] {
  if (!raw) return [...ALL_WEEKDAYS];
  const s = raw.trim().toUpperCase();
  if (s === 'DAILY' || s === 'ALL' || s === 'EVERYDAY') return [...ALL_WEEKDAYS];

  const rangeMatch = /^([A-Z]+)\s*-\s*([A-Z]+)$/.exec(s);
  if (rangeMatch) {
    const start = DAY_INDEX[rangeMatch[1]];
    const end = DAY_INDEX[rangeMatch[2]];
    if (start && end) {
      const si = ALL_WEEKDAYS.indexOf(start);
      const ei = ALL_WEEKDAYS.indexOf(end);
      if (si <= ei) return ALL_WEEKDAYS.slice(si, ei + 1);
      // wrap-around range e.g. SAT-SUN handled by slice; FRI-MON:
      return [...ALL_WEEKDAYS.slice(si), ...ALL_WEEKDAYS.slice(0, ei + 1)];
    }
  }

  const days = s
    .split(/[,/ ]+/)
    .map((tok) => DAY_INDEX[tok])
    .filter((d): d is Weekday => Boolean(d));

  return days.length ? dedupeDays(days) : [...ALL_WEEKDAYS];
}

function dedupeDays(days: Weekday[]): Weekday[] {
  const set = new Set(days);
  return ALL_WEEKDAYS.filter((d) => set.has(d));
}
