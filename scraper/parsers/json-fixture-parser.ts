import type { RawDoc, ParseResult, ParsedTrip } from '../types';
import { normalizeTime, parseOperatingDays } from '../normalizers/time-normalizer';

interface FixtureTrip {
  from: string;
  to: string;
  via?: string[];
  service: string;
  departure: string;
  arrival?: string;
  days?: string;
  depot?: string;
}

interface Fixture {
  docType?: string;
  division?: string;
  unverified?: boolean;
  trips: FixtureTrip[];
}

/**
 * Compact one-page transcription of an official MSRTC division timetable PDF.
 *
 *   { "docType": "timetable-page", "division": "akola", "pdf": "…pdf", "page": 1,
 *     "from": "Akola", "fromMr": "अकोला", "depot": "Akola", "service": "Ordinary",
 *     "rows": [ ["Paratwada", "परतवाडा", "05:45 06:30 12:00"], ["Pune", "पुणे", "21:00", "Shivshahi"] ] }
 *
 * Each row is [destination EN, destination MR, space-separated departures, optional service].
 * A page may hold several origin blocks via "blocks": [{from, fromMr, depot?, rows}].
 */
interface PageBlock {
  from: string;
  page?: number | string;
  fromMr?: string;
  depot?: string;
  service?: string;
  days?: string;
  /** Through buses: the real origin; `from` is then the timing point. */
  throughFrom?: string;
  throughFromMr?: string;
  /** [destEn, destMr, times, service?, originEn?, originMr?] */
  rows: [string, string, string, string?, string?, string?][];
}
interface PageFixture extends PageBlock {
  docType: 'timetable-page';
  division: string;
  pdf: string;
  page: number | string;
  unverified?: boolean;
  blocks?: PageBlock[];
}

function parsePageFixture(doc: RawDoc, f: PageFixture): ParseResult {
  const warnings: string[] = [];
  const trips: ParsedTrip[] = [];
  const blocks: PageBlock[] = f.blocks?.length ? f.blocks : [f];
  for (const b of blocks) {
    const ref = `${f.pdf} p.${b.page ?? f.page}`;
    for (const [i, row] of (b.rows ?? []).entries()) {
      const [toEn, toMr, times, service, rowOrigin, rowOriginMr] = row;
      const origin = rowOrigin || b.throughFrom;
      const originMr = rowOrigin ? rowOriginMr : b.throughFromMr;
      for (const raw of new Set(String(times ?? '').split(/[\s,]+/).filter(Boolean))) {
        const departure = normalizeTime(raw);
        if (!departure) {
          warnings.push(`${doc.id} ${b.from}#${i}: unparseable departure "${raw}" — dropped`);
          continue;
        }
        trips.push({
          fromRaw: b.from,
          fromMr: b.fromMr,
          toRaw: toEn,
          toMr: toMr || undefined,
          viaRaw: [],
          serviceRaw: service || b.service || f.service || 'Ordinary',
          departure,
          operatingDays: parseOperatingDays(b.days ?? f.days),
          depotRaw: b.depot ?? f.depot,
          sourceDocId: doc.id,
          divisionHint: f.division,
          verified: !f.unverified,
          sourceRef: ref,
          ...(origin ? { originRaw: origin, originMr } : {}),
        });
      }
    }
  }
  return { trips, warnings };
}

/**
 * Parses the structured JSON timetable fixtures used by the demo source.
 * This is the "already tabular" easy case — real sources use the HTML/PDF/text
 * parsers instead.
 */
export function parseJsonFixture(doc: RawDoc): ParseResult {
  const warnings: string[] = [];
  let fixture: Fixture;
  try {
    fixture = JSON.parse(doc.content) as Fixture;
  } catch (e) {
    return { trips: [], warnings: [`${doc.id}: invalid JSON (${(e as Error).message})`] };
  }
  if (fixture.docType === 'timetable-page') return parsePageFixture(doc, fixture as unknown as PageFixture);
  const trips: ParsedTrip[] = [];
  for (const [i, t] of (fixture.trips ?? []).entries()) {
    const departure = normalizeTime(t.departure);
    if (!departure) {
      warnings.push(`${doc.id}#${i}: unparseable departure "${t.departure}" — dropped`);
      continue;
    }
    trips.push({
      fromRaw: t.from,
      toRaw: t.to,
      viaRaw: t.via ?? [],
      serviceRaw: t.service,
      departure,
      arrival: normalizeTime(t.arrival),
      operatingDays: parseOperatingDays(t.days),
      depotRaw: t.depot,
      sourceDocId: doc.id,
      divisionHint: fixture.division,
      verified: !fixture.unverified,
    });
  }
  return { trips, warnings };
}
