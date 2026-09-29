/**
 * Stage 1: SCRAPE (fetch → parse → normalise) into a staged dataset.
 *
 *   npm run scrape             # uses DATA_SOURCE env or 'demo'
 *   npm run scrape:demo        # forces the local demo fixtures
 *   npm run scrape -- --source=msrtc
 *
 * Writes data/.tmp/staged.json. Does NOT publish anything.
 */
import { runScrape } from '../scraper/pipeline';
import { resolveSourceId } from '../scraper/sources';
import { writeJson, ensureDir } from '../scraper/util/fs';
import { PATHS } from '../scraper/util/paths';
import { log } from '../scraper/util/log';

async function main() {
  const sourceId = resolveSourceId();
  log.step(1, 3, `SCRAPE from source '${sourceId}'`);
  const staged = await runScrape(sourceId);
  ensureDir(PATHS.tmp);
  writeJson(PATHS.staged, staged);
  if (staged.meta.imageOnlyDocs.length) {
    log.warn(`image-only docs skipped (no OCR guessing): ${staged.meta.imageOnlyDocs.join(', ')}`);
  }
  if (staged.meta.warnings.length) {
    log.warn(`${staged.meta.warnings.length} warning(s) during scrape (see staged.json)`);
  }
  log.ok(`staged → ${PATHS.staged}`);
}

main().catch((err) => {
  log.error(err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});
