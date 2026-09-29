import type { RawDoc, ParseResult, ParsedTrip } from '../types';
import { normalizeTime, parseOperatingDays } from '../normalizers/time-normalizer';

/**
 * Parses plain-text timetables where each line is one trip, using a delimiter
 * ("|", tab, or ";"). Expected column order (header line optional):
 *
 *   FROM | TO | VIA | SERVICE | DEPARTURE | ARRIVAL | DAYS | DEPOT
 *
 * VIA is "a;b;c". This is the format many scanned-then-OCR'd or copy-pasted
 * timetables end up in.
 */
export function parseTextTimetable(doc: RawDoc): ParseResult {
  const warnings: string[] = [];
  const trips: ParsedTrip[] = [];
  const lines = doc.content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (line.startsWith('#')) continue; // comment
    const delim = line.includes('|') ? '|' : line.includes('\t') ? '\t' : ';';
    const cols = line.split(delim).map((c) => c.trim());
    if (cols.length < 5) continue;
    const [from, to, via, service, dep, arr, days, depot] = cols;
    if (/^from$/i.test(from)) continue; // header line
    const departure = normalizeTime(dep);
    if (!departure || !from || !to) {
      warnings.push(`${doc.id}: could not parse line "${line}"`);
      continue;
    }
    trips.push({
      fromRaw: from,
      toRaw: to,
      viaRaw: via ? via.split(/[;,]/).map((s) => s.trim()).filter(Boolean) : [],
      serviceRaw: service || 'Ordinary',
      departure,
      arrival: normalizeTime(arr),
      operatingDays: parseOperatingDays(days),
      depotRaw: depot || undefined,
      sourceDocId: doc.id,
    });
  }
  return { trips, warnings };
}
