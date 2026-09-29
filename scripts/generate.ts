/**
 * Stage 3: GENERATE (diff + publish) the validated dataset into data/generated.
 *
 *   npm run generate
 *
 * Re-validates as a safety net, computes the change set vs the currently
 * published data, then writes all JSON atomically (keeping a backup). If
 * validation fails here, nothing is overwritten.
 */
import type { ChangeSet } from '../src/types/domain';
import { validateDataset } from '../scraper/validators';
import { loadPreviousGenerated, writeDataset } from '../scraper/generate-data';
import { diffDatasets } from '../scraper/diff/diff';
import { readJson } from '../scraper/util/fs';
import { PATHS } from '../scraper/util/paths';
import { log } from '../scraper/util/log';
import type { StagedDataset } from '../scraper/pipeline';

function main() {
  log.step(3, 3, 'GENERATE published dataset');
  const staged = readJson<StagedDataset>(PATHS.staged);
  const previous = loadPreviousGenerated();

  // Safety re-validation.
  const report = validateDataset(staged.normalized, {
    previousTripCount: previous?.trips.length,
    minRetainFraction: 0.4,
  });
  if (!report.ok) {
    log.error('Refusing to publish: dataset failed validation. Retaining previous data.');
    for (const e of report.errors) log.error(`${e.code}: ${e.message}`);
    process.exit(1);
  }

  const changes = previous
    ? diffDatasets(
        { trips: previous.trips, routes: previous.routes },
        { trips: staged.normalized.trips, routes: staged.normalized.routes },
      )
    : [];

  const changeSet: ChangeSet = {
    datasetVersion: '(pending)',
    generatedAt: new Date().toISOString(),
    previousVersion: previous?.metadata?.datasetVersion,
    changes,
  };

  // writeDataset stamps the resolved dataset version into changeSet + changes.json.
  const metadata = writeDataset(staged.normalized, { changes: changeSet, previous });

  log.ok(`Published dataset ${metadata.datasetVersion}. Changes: ${changes.length}.`);
  log.info('Run `npm run sync-data` (or `npm run data:build`) to publish to public/data.');
}

main();
