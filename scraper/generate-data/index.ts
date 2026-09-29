import path from 'node:path';
import type {
  Route,
  Trip,
  DatasetMetadata,
  ChangeSet,
  ScheduleFile,
} from '../../src/types/domain';
import type { NormalizeResult } from '../normalizers/normalize-dataset';
import { PATHS } from '../util/paths';
import { writeJson, readJsonIfExists, ensureDir, copyDir, listFiles, rmrf } from '../util/fs';
import { log } from '../util/log';

const DISCLAIMER =
  'This is an independent public-transport information service and is not affiliated with or ' +
  'operated by Maharashtra State Road Transport Corporation (MSRTC). Timetables may change. ' +
  'Please verify important travel information with official MSRTC sources.';

export interface PreviousGenerated {
  routes: Route[];
  trips: Trip[];
  metadata?: DatasetMetadata;
}

/** Load the currently-published generated dataset (routes + all trips). */
export function loadPreviousGenerated(): PreviousGenerated | undefined {
  const routes = readJsonIfExists<Route[]>(path.join(PATHS.generated, 'routes.json'));
  const metadata = readJsonIfExists<DatasetMetadata>(path.join(PATHS.generated, 'metadata.json'));
  if (!routes) return undefined;
  const trips: Trip[] = [];
  for (const file of listFiles(PATHS.generatedSchedules, '.json')) {
    const sched = readJsonIfExists<ScheduleFile>(file);
    if (sched?.trips) trips.push(...sched.trips);
  }
  return { routes, trips, metadata };
}

function nextVersion(prev?: DatasetMetadata): string {
  const today = new Date().toISOString().slice(0, 10);
  if (prev?.datasetVersion?.startsWith(today)) {
    const seq = Number(prev.datasetVersion.slice(-3)) + 1;
    return `${today}-${String(seq).padStart(3, '0')}`;
  }
  return `${today}-001`;
}

/**
 * Write the full generated dataset atomically.
 *
 * Safety: before overwriting, the current generated folder is copied to
 * `.backup/`. If anything throws mid-write, the previous data on disk is the
 * last thing the app will keep serving (files are written with atomic renames),
 * and the backup allows a manual rollback.
 */
export function writeDataset(
  normalized: NormalizeResult,
  opts: { changes: ChangeSet; previous?: PreviousGenerated },
): DatasetMetadata {
  ensureDir(PATHS.generated);
  ensureDir(PATHS.generatedSchedules);

  // Back up the current dataset.
  if (listFiles(PATHS.generated, '.json').length > 0) {
    rmrf(PATHS.backup);
    copyDir(PATHS.generated, PATHS.backup);
    // Don't back up the backup into itself on next run.
    rmrf(path.join(PATHS.backup, '.backup'));
    log.info(`backed up previous dataset → ${PATHS.backup}`);
  }

  // Demo = trips not taken from an MSRTC document at all. Transcriptions that
  // are still awaiting a second check are counted separately.
  const containsDemoData = normalized.trips.some((t) => t.source !== 'MSRTC');
  const unverifiedTrips = normalized.trips.filter((t) => !t.verified).length;
  const version = nextVersion(opts.previous?.metadata);
  const generatedAt = new Date().toISOString();

  const metadata: DatasetMetadata = {
    datasetVersion: version,
    generatedAt,
    source: containsDemoData ? 'DEMO (sample data)' : 'MSRTC',
    containsDemoData,
    unverifiedTrips,
    counts: {
      divisions: normalized.divisions.length,
      depots: normalized.depots.length,
      stations: normalized.stations.length,
      stops: normalized.stops.length,
      routes: normalized.routes.length,
      trips: normalized.trips.length,
      serviceTypes: normalized.serviceTypes.length,
    },
    schedules: normalized.schedules.map((s) => ({
      division: s.division,
      slug: s.slug,
      trips: s.trips.length,
    })),
    disclaimer: DISCLAIMER,
  };

  // Remove stale per-division schedule files no longer produced.
  const wantedSlugs = new Set(normalized.schedules.map((s) => `${s.slug}.json`));
  for (const f of listFiles(PATHS.generatedSchedules, '.json')) {
    if (!wantedSlugs.has(path.basename(f))) rmrf(f);
  }

  writeJson(path.join(PATHS.generated, 'divisions.json'), normalized.divisions, false);
  writeJson(path.join(PATHS.generated, 'depots.json'), normalized.depots, false);
  writeJson(path.join(PATHS.generated, 'stations.json'), normalized.stations, false);
  writeJson(path.join(PATHS.generated, 'stops.json'), normalized.stops, false);
  writeJson(path.join(PATHS.generated, 'routes.json'), normalized.routes, false);
  writeJson(path.join(PATHS.generated, 'service-types.json'), normalized.serviceTypes, false);
  writeJson(path.join(PATHS.generated, 'popular-routes.json'), normalized.popularRoutes, false);
  writeJson(path.join(PATHS.generated, 'districts.json'), normalized.districts ?? [], false);
  for (const sched of normalized.schedules) {
    writeJson(path.join(PATHS.generatedSchedules, `${sched.slug}.json`), sched, false);
  }
  // Stamp the resolved version into the change set before persisting it.
  opts.changes.datasetVersion = version;
  writeJson(path.join(PATHS.generated, 'changes.json'), opts.changes);
  writeJson(path.join(PATHS.generated, 'metadata.json'), metadata);

  log.ok(`wrote dataset ${version}: ${metadata.counts.trips} trips across ${normalized.schedules.length} division file(s)`);
  return metadata;
}

export { DISCLAIMER };
