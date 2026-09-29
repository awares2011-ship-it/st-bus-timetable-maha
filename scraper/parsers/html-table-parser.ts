import { parse } from 'node-html-parser';
import type { RawDoc, ParseResult, ParsedTrip } from '../types';
import { normalizeTime, parseOperatingDays } from '../normalizers/time-normalizer';

/**
 * Parses timetable data from HTML tables.
 *
 * Strategy: find <table> elements, read the header row to locate the columns
 * we care about (from / to / via / service / departure / arrival / days /
 * depot) by fuzzy header matching, then read each body row.
 *
 * This is deliberately tolerant: MSRTC-style timetable HTML varies a lot, so
 * we match header synonyms rather than fixed positions, and skip rows we can't
 * make sense of (recording a warning) instead of failing the whole document.
 */
const HEADER_SYNONYMS: Record<string, string[]> = {
  from: ['from', 'origin', 'source', 'departure station', 'from station', 'पासून', 'कडून'],
  to: ['to', 'destination', 'arrival station', 'to station', 'पर्यंत'],
  via: ['via', 'through', 'route', 'मार्गे'],
  service: ['service', 'type', 'bus type', 'class', 'सेवा', 'प्रकार'],
  departure: ['departure', 'dep', 'dep time', 'start', 'time', 'सुटण्याची वेळ', 'वेळ'],
  arrival: ['arrival', 'arr', 'arr time', 'reach', 'पोहोचण्याची वेळ'],
  days: ['days', 'operating days', 'frequency', 'दिवस'],
  depot: ['depot', 'agar', 'आगार'],
};

function classifyHeader(text: string): keyof typeof HEADER_SYNONYMS | undefined {
  const t = text.trim().toLowerCase();
  for (const [field, syns] of Object.entries(HEADER_SYNONYMS)) {
    if (syns.some((s) => t === s || t.includes(s))) {
      return field as keyof typeof HEADER_SYNONYMS;
    }
  }
  return undefined;
}

export function parseHtmlTable(doc: RawDoc): ParseResult {
  const warnings: string[] = [];
  const trips: ParsedTrip[] = [];
  const root = parse(doc.content);
  const tables = root.querySelectorAll('table');
  if (tables.length === 0) {
    warnings.push(`${doc.id}: no <table> found`);
  }

  for (const table of tables) {
    const rows = table.querySelectorAll('tr');
    if (rows.length < 2) continue;

    const headerCells = rows[0].querySelectorAll('th, td').map((c) => c.text);
    const colMap = new Map<number, keyof typeof HEADER_SYNONYMS>();
    headerCells.forEach((h, idx) => {
      const field = classifyHeader(h);
      if (field) colMap.set(idx, field);
    });
    if (![...colMap.values()].includes('from') || ![...colMap.values()].includes('departure')) {
      // Not a timetable table we understand; skip quietly.
      continue;
    }

    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r].querySelectorAll('td').map((c) => c.text.trim());
      if (cells.length === 0) continue;
      const get = (field: string) => {
        for (const [idx, f] of colMap) if (f === field) return cells[idx] ?? '';
        return '';
      };
      const departure = normalizeTime(get('departure'));
      const from = get('from');
      const to = get('to');
      if (!departure || !from || !to) {
        warnings.push(`${doc.id} table row ${r}: missing from/to/departure — skipped`);
        continue;
      }
      trips.push({
        fromRaw: from,
        toRaw: to,
        viaRaw: get('via') ? get('via').split(/[,-]/).map((s) => s.trim()).filter(Boolean) : [],
        serviceRaw: get('service') || 'Ordinary',
        departure,
        arrival: normalizeTime(get('arrival')),
        operatingDays: parseOperatingDays(get('days')),
        depotRaw: get('depot') || undefined,
        sourceDocId: doc.id,
      });
    }
  }
  return { trips, warnings };
}
