import type { RawDoc, ParseResult } from '../types';
import { parseTextTimetable } from './text-timetable-parser';
import { log } from '../util/log';

/**
 * Extracts text from a (text-based) timetable PDF, then reuses the text parser.
 *
 * Critically: if the PDF has (almost) no extractable text it is treated as a
 * SCANNED / IMAGE-ONLY document. We do NOT run OCR and guess — unreliable OCR
 * of a government timetable could put wrong bus times in front of travellers.
 * Instead we flag it and skip, so the previous verified data is retained.
 */
export async function parsePdf(doc: RawDoc): Promise<ParseResult> {
  let text = '';
  try {
    // pdfjs-dist is a heavy, optional dependency; import lazily.
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = Uint8Array.from(Buffer.from(doc.content, 'base64'));
    const loadingTask = pdfjs.getDocument({ data, useSystemFonts: true });
    const pdf = await loadingTask.promise;
    const parts: string[] = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const line = content.items
        .map((it) => ('str' in it ? (it as { str: string }).str : ''))
        .join(' ');
      parts.push(line);
    }
    text = parts.join('\n');
  } catch (e) {
    return { trips: [], warnings: [`${doc.id}: PDF parse failed (${(e as Error).message})`] };
  }

  const stripped = text.replace(/\s+/g, '');
  if (stripped.length < 40) {
    log.warn(`${doc.id}: appears to be scanned/image-only — refusing to OCR-guess`);
    doc.imageOnly = true;
    return {
      trips: [],
      warnings: [`${doc.id}: image-only/scanned PDF detected — skipped (no OCR guessing)`],
    };
  }

  // Reuse the text parser on the extracted lines.
  return parseTextTimetable({ ...doc, content: text, format: 'text' });
}
