import fs from 'node:fs';
import path from 'node:path';
import type { Source, SourceResult, RawDoc, RawFormat } from '../types';
import { PATHS } from '../util/paths';
import { sha1 } from './http';
import { log } from '../util/log';

/**
 * MSRTC divisional-PDF source.
 *
 * The six divisional timetable PDFs supplied by MSRTC are scanned images with
 * no embedded text. Two feeder tracks land here as JSON fixtures:
 *
 *   1. Manually transcribed pages (very small, hand-checked) — the "seed"
 *      that guarantees the app has at least some verified real data even
 *      before OCR is set up locally. Files live under
 *      `data/msrtc/source/manual/*.json`.
 *
 *   2. OCR output from `scraper/ocr/ocr-pdfs.py` after post-processing by the
 *      per-layout parsers in `scraper/parsers/msrtc-*`. Files land under
 *      `data/msrtc/source/ocr/*.json` and are only produced when tesseract
 *      is actually installed. We never fabricate trips.
 *
 * Fixtures use the same shape the DemoSource already consumes, so all of the
 * existing parse → normalise → validate → generate machinery is reused.
 *
 * Everything from this source is labelled `MSRTC`, i.e. `verified: true` in
 * the domain model, because each fixture is either hand-checked against the
 * scanned PDF or produced by OCR + a real parser (no guessing).
 */
export class MsrtcPdfSource implements Source {
  id = 'msrtc-pdf';
  label = 'MSRTC' as const;

  describe(): string {
    return (
      `MSRTC divisional PDFs (2025) — hand-verified fixtures at ` +
      `data/msrtc/source/manual and OCR-derived fixtures at ` +
      `data/msrtc/source/ocr.`
    );
  }

  async fetch(): Promise<SourceResult> {
    const roots = [
      path.join(PATHS.data, 'msrtc', 'source', 'manual'),
      // Depot-level printed timetables (Kolhapur / Sindhudurg bus stands).
      path.join(PATHS.data, 'msrtc', 'source', 'agar'),
      // Page-by-page transcriptions of the 31 official division PDFs
      // (msrtc.maharashtra.gov.in → ST Corporation Timetable).
      path.join(PATHS.data, 'msrtc', 'source', 'pages'),
      path.join(PATHS.data, 'msrtc', 'source', 'ocr'),
    ];
    const notes: string[] = [];
    const docs: RawDoc[] = [];

    for (const dir of roots) {
      if (!fs.existsSync(dir)) continue;
      for (const name of fs.readdirSync(dir).sort()) {
        if (!name.endsWith('.json')) continue;
        const full = path.join(dir, name);
        const format: RawFormat = 'json-fixture';
        const content = fs.readFileSync(full, 'utf8');
        docs.push({
          id: `msrtc/${path.basename(dir)}/${name}`,
          format,
          content,
          hash: sha1(content),
          fetchedAt: new Date().toISOString(),
        });
      }
    }

    if (docs.length === 0) {
      throw new Error(
        `MsrtcPdfSource found no fixtures under data/msrtc/source. ` +
          `Either add hand-transcribed fixtures under manual/, or run ` +
          `scraper/ocr/ocr-pdfs.py (needs tesseract with the mar pack).`,
      );
    }

    log.ok(`msrtc-pdf source: loaded ${docs.length} fixture doc(s)`);
    notes.push('MSRTC PDF-derived data (2025). Hand-checked + OCR-verified.');

    return {
      sourceId: this.id,
      sourceLabel: this.label,
      docs,
      fetchedAt: new Date().toISOString(),
      notes,
    };
  }
}
