/**
 * Stage 2: VALIDATE the staged dataset.
 *
 *   npm run validate
 *
 * Exits non-zero (blocking the pipeline) on hard errors or a suspicious
 * mass-deletion, so a broken source can never overwrite good data.
 */
import { validateDataset } from '../scraper/validators';
import { loadPreviousGenerated } from '../scraper/generate-data';
import { readJson, writeJson } from '../scraper/util/fs';
import { PATHS } from '../scraper/util/paths';
import { log } from '../scraper/util/log';
import type { StagedDataset } from '../scraper/pipeline';

function main() {
  log.step(2, 3, 'VALIDATE staged dataset');
  const staged = readJson<StagedDataset>(PATHS.staged);
  const previous = loadPreviousGenerated();

  const report = validateDataset(staged.normalized, {
    previousTripCount: previous?.trips.length,
    minRetainFraction: 0.4,
  });

  writeJson(PATHS.validationReport, report);

  for (const w of report.warnings.slice(0, 20)) log.warn(`${w.code}: ${w.message}`);
  if (report.warnings.length > 20) log.warn(`… ${report.warnings.length - 20} more warning(s)`);
  for (const e of report.errors) log.error(`${e.code}: ${e.message}`);

  log.info(report.summary);
  if (!report.ok) {
    log.error('Validation FAILED — previous dataset will be retained (nothing published).');
    process.exit(1);
  }
  log.ok('Validation passed.');
}

main();
