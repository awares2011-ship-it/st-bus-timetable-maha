import fs from 'node:fs';
import path from 'node:path';
import type { Source, SourceResult, RawDoc, RawFormat } from '../types';
import { PATHS } from '../util/paths';
import { sha1 } from './http';
import { log } from '../util/log';

/**
 * DEMO source.
 *
 * Reads local fixture documents from `data/demo/source/` and returns them as
 * RawDocs. This lets the ENTIRE pipeline (parse → normalise → validate → diff
 * → generate) run end-to-end with zero network access, so you can see exactly
 * how real data would flow once a real source adapter is wired in.
 *
 * The fixtures use REAL Maharashtra geography and REAL MSRTC service brands,
 * but the departure times are illustrative. Everything generated from this
 * source is marked `verified: false` / source `DEMO` and is clearly labelled
 * as sample data in the UI. It is never presented as official timetable data.
 */
const EXT_TO_FORMAT: Record<string, RawFormat> = {
  '.json': 'json-fixture',
  '.html': 'html',
  '.htm': 'html',
  '.txt': 'text',
  '.pdf': 'pdf',
};

export class DemoSource implements Source {
  id = 'demo';
  label = 'DEMO' as const;

  describe(): string {
    return `Local demo fixtures at ${PATHS.demoSource} (real geography, illustrative times).`;
  }

  async fetch(): Promise<SourceResult> {
    const dir = PATHS.demoSource;
    const notes: string[] = [];
    const docs: RawDoc[] = [];
    if (!fs.existsSync(dir)) {
      throw new Error(`Demo source dir not found: ${dir}`);
    }
    for (const name of fs.readdirSync(dir).sort()) {
      const ext = path.extname(name).toLowerCase();
      const format = EXT_TO_FORMAT[ext];
      if (!format) continue;
      const full = path.join(dir, name);
      const isPdf = format === 'pdf';
      const content = isPdf
        ? fs.readFileSync(full).toString('base64')
        : fs.readFileSync(full, 'utf8');
      docs.push({
        id: name,
        format,
        content,
        hash: sha1(content),
        fetchedAt: new Date().toISOString(),
      });
    }
    log.ok(`demo source: loaded ${docs.length} fixture doc(s)`);
    notes.push('Demo data — illustrative times, not verified against MSRTC.');
    return {
      sourceId: this.id,
      sourceLabel: this.label,
      docs,
      fetchedAt: new Date().toISOString(),
      notes,
    };
  }
}
