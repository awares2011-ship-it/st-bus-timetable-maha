import type { RawDoc, ParseResult } from '../types';
import { parseJsonFixture } from './json-fixture-parser';
import { parseHtmlTable } from './html-table-parser';
import { parseTextTimetable } from './text-timetable-parser';
import { parsePdf } from './pdf-parser';

/** Dispatch a raw document to the right parser based on its format. */
export async function parseDoc(doc: RawDoc): Promise<ParseResult> {
  switch (doc.format) {
    case 'json-fixture':
      return parseJsonFixture(doc);
    case 'html':
      return parseHtmlTable(doc);
    case 'text':
      return parseTextTimetable(doc);
    case 'pdf':
      return parsePdf(doc);
    default:
      return { trips: [], warnings: [`${doc.id}: unknown format`] };
  }
}
