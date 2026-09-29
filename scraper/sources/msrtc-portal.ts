import type { Source, SourceResult, RawDoc, RawFormat } from '../types';
import { politeFetch } from './http';
import { log } from '../util/log';

/**
 * Official MSRTC source adapter — SCAFFOLD / DISABLED BY DEFAULT.
 * =============================================================================
 * Findings from probing the official sources (Sep 2026):
 *
 *   - https://npublic.msrtcors.com/ is a LIVE reservation/booking engine
 *     (JSF/XHTML, session + ViewState based). It exposes seat availability and
 *     fares for specific date queries — it is NOT a bulk, machine-readable
 *     timetable. Querying it at scale to harvest a statewide timetable would be
 *     abusive to a government booking server, would surface live availability
 *     (which this app must never present), and is explicitly out of scope.
 *
 *   - https://msrtc.maharashtra.gov.in / https://msrtc.gov.in is an
 *     informational site. It does not publish a comprehensive, structured,
 *     machine-readable timetable dataset.
 *
 * Therefore this adapter is deliberately left as a guarded scaffold. It shows
 * exactly where a *permitted* official feed would plug in (e.g. an official
 * open-data export, an official timetable PDF page, or a data-sharing
 * agreement). It refuses to run unless explicitly enabled AND pointed at
 * concrete, permitted document URLs.
 *
 * SAFETY: never bypass CAPTCHA/login/anti-bot; never scrape the live booking
 * flow for bulk data; respect robots.txt and rate limits (enforced by
 * politeFetch); retain the previous dataset on any failure.
 * =============================================================================
 */
export class MsrtcOfficialSource implements Source {
  id = 'msrtc';
  label = 'MSRTC' as const;

  /** Set of official, permitted, machine-readable document URLs. Empty = none. */
  private readonly documentUrls: string[];

  constructor(documentUrls: string[] = parseUrlEnv(process.env.MSRTC_DOC_URLS)) {
    this.documentUrls = documentUrls;
  }

  describe(): string {
    return (
      'Official MSRTC source (scaffold). Enable only with permitted, ' +
      'machine-readable timetable document URLs in MSRTC_DOC_URLS.'
    );
  }

  async fetch(): Promise<SourceResult> {
    if (this.documentUrls.length === 0) {
      throw new Error(
        'MsrtcOfficialSource is not configured: no permitted document URLs.\n' +
          'The official booking portal must NOT be scraped for bulk timetables.\n' +
          'Provide official, permitted timetable document URLs via MSRTC_DOC_URLS, ' +
          'or keep using the demo source until a permitted feed is available.',
      );
    }

    const docs: RawDoc[] = [];
    const notes: string[] = ['Official MSRTC documents (permitted URLs only).'];
    for (const url of this.documentUrls) {
      log.info(`fetching official document: ${url}`);
      const res = await politeFetch(url);
      if (!res.ok) {
        // On ANY failure we do NOT fabricate data. The caller keeps the last
        // valid dataset.
        notes.push(`Skipped ${url} (status ${res.status}).`);
        continue;
      }
      const isPdf = res.contentType.includes('pdf') || url.toLowerCase().endsWith('.pdf');
      const format: RawFormat = isPdf ? 'pdf' : res.contentType.includes('html') ? 'html' : 'text';
      docs.push({
        id: url,
        format,
        url,
        content: res.body,
        hash: (await import('node:crypto')).createHash('sha1').update(res.body).digest('hex'),
        fetchedAt: new Date().toISOString(),
      });
    }

    if (docs.length === 0) {
      throw new Error('No official documents could be fetched; retaining previous dataset.');
    }

    return {
      sourceId: this.id,
      sourceLabel: this.label,
      docs,
      fetchedAt: new Date().toISOString(),
      notes,
    };
  }
}

function parseUrlEnv(v: string | undefined): string[] {
  if (!v) return [];
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
