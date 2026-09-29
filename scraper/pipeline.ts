import path from 'node:path';
import type {
  Division,
  Depot,
  Stop,
  Route,
  ServiceType,
  PopularRoute,
  DataSource,
  District,
} from '../src/types/domain';
import type { ParsedTrip } from './types';
import { getSource } from './sources';
import { parseDoc } from './parsers';
import { normalizeDataset, type ReferenceData, type NormalizeResult } from './normalizers/normalize-dataset';
import { PATHS } from './util/paths';
import { readJson, readJsonIfExists } from './util/fs';
import { log } from './util/log';

const REF_DIR = path.join(PATHS.demo, 'reference');

/**
 * Load curated reference geography + service catalogue. This is the stable
 * "master data" (divisions, depots, stations, named corridors, service types).
 * Timetables (trips) come from the source documents; this is everything else.
 */
export function loadReference(): ReferenceData {
  return {
    divisions: readJson<Division[]>(path.join(REF_DIR, 'divisions.json')),
    depots: readJson<Depot[]>(path.join(REF_DIR, 'depots.json')),
    stops: readJson<Stop[]>(path.join(REF_DIR, 'stops.json')),
    routes: readJson<Route[]>(path.join(REF_DIR, 'routes.json')),
    serviceTypes: readJson<ServiceType[]>(path.join(REF_DIR, 'service-types.json')),
    popularRoutes: readJson<PopularRoute[]>(path.join(REF_DIR, 'popular-routes.json')),
    districts: readJson<District[]>(path.join(REF_DIR, 'districts.json')),
    coords: readJsonIfExists(path.join(PATHS.data, 'msrtc', 'reference', 'stop-coords.json')) ?? {},
    cities: readJsonIfExists(path.join(PATHS.data, 'msrtc', 'reference', 'cities.json')) ?? {},
  };
}

export interface StagedDataset {
  meta: {
    sourceId: string;
    sourceLabel: DataSource;
    fetchedAt: string;
    warnings: string[];
    imageOnlyDocs: string[];
  };
  normalized: NormalizeResult;
}

/**
 * Stage 1–3 of the pipeline: fetch → parse → normalise.
 * Returns a fully normalised (but not yet validated/published) dataset.
 */
export async function runScrape(sourceId: string): Promise<StagedDataset> {
  const source = getSource(sourceId);
  log.info(`source '${source.id}': ${source.describe()}`);
  const result = await source.fetch();

  const parsed: ParsedTrip[] = [];
  const warnings: string[] = [...result.notes];
  const imageOnlyDocs: string[] = [];

  for (const doc of result.docs) {
    const pr = await parseDoc(doc);
    parsed.push(...pr.trips);
    warnings.push(...pr.warnings);
    if (doc.imageOnly) imageOnlyDocs.push(doc.id);
    log.info(`parsed ${doc.id} (${doc.format}): ${pr.trips.length} trip(s)`);
  }

  const ref = loadReference();
  const today = new Date().toISOString().slice(0, 10);
  const normalized = normalizeDataset(parsed, ref, {
    source: result.sourceLabel,
    lastVerified: today,
  });
  warnings.push(...normalized.warnings);

  log.ok(`normalised: ${normalized.trips.length} trips, ${normalized.routes.length} routes, ${normalized.stops.length} stops`);
  return {
    meta: {
      sourceId: source.id,
      sourceLabel: result.sourceLabel,
      fetchedAt: result.fetchedAt,
      warnings,
      imageOnlyDocs,
    },
    normalized,
  };
}
