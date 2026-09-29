import type { Weekday } from '@/types/domain';

const ORDER: Weekday[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

/** "06:00" → "6:00 AM" (locale-neutral, 12h with AM/PM). */
export function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Minutes → "2h 15m" using localised unit labels. */
export function formatDuration(min: number | undefined, hLabel: string, mLabel: string): string {
  if (min == null || min <= 0) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}${mLabel}`;
  if (m === 0) return `${h}${hLabel}`;
  return `${h}${hLabel} ${m}${mLabel}`;
}

/** Is a trip's operatingDays effectively "every day"? */
export function isEveryDay(days: Weekday[]): boolean {
  return days.length === 7;
}

/** Compact operating-days label, e.g. "Mon–Sat" or "Mon, Wed, Fri". */
export function formatDays(days: Weekday[], dayLabel: (d: Weekday) => string, everyLabel: string): string {
  if (days.length === 7) return everyLabel;
  const sorted = ORDER.filter((d) => days.includes(d));
  // Detect a single contiguous range.
  const indices = sorted.map((d) => ORDER.indexOf(d));
  let contiguous = true;
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) {
      contiguous = false;
      break;
    }
  }
  if (contiguous && sorted.length >= 3) {
    return `${dayLabel(sorted[0])}–${dayLabel(sorted[sorted.length - 1])}`;
  }
  return sorted.map(dayLabel).join(', ');
}

const JS_DAY_TO_WEEKDAY: Weekday[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** Weekday enum for a JS Date. */
export function weekdayOf(date: Date): Weekday {
  return JS_DAY_TO_WEEKDAY[date.getDay()];
}

/** YYYY-MM-DD in local time. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "04 Sep 2026" style date. */
export function formatHumanDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
