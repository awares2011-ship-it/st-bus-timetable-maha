/**
 * Core domain model for the Maharashtra ST (MSRTC) bus timetable.
 *
 * These types are the single source of truth shared by BOTH the frontend
 * (client-side search) and the scraper pipeline (data generation). Keeping
 * them together guarantees the generated JSON always matches what the app
 * expects to read.
 */

export type Weekday = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export const ALL_WEEKDAYS: Weekday[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

/** Localised string set. Marathi is a first-class language for this app. */
export interface Localised {
  en: string;
  mr: string;
  hi: string;
}

export interface Division {
  id: string;
  name: string;
  nameMr: string;
  nameHi: string;
  /** slug used in schedule file names: /data/schedules/<slug>.json */
  slug: string;
  /** MSRTC regional office (6 regions). */
  region?: string;
  regionName?: string;
  regionNameMr?: string;
  /** Revenue district ids served by this division. */
  districts?: string[];
  /** Official MSRTC division timetable PDF. */
  timetablePdf?: string;
}

/** Revenue district with its talukas (tahsils). */
export interface District {
  id: string;
  name: string;
  nameMr: string;
  division: string; // Division.id
  talukas: { name: string; nameMr: string; hq: string; hqMr: string; stop: string }[];
}

export interface Depot {
  id: string;
  name: string;
  nameMr: string;
  division: string; // Division.id
}

/**
 * A point that a bus can serve. `type: 'station'` marks a major bus stand
 * (gets its own SEO page); `type: 'stop'` is an intermediate halt.
 */
export interface Stop {
  id: string;
  name: string;
  nameMr: string;
  nameHi: string;
  /** Alternate spellings / short names used in search matching. */
  aliases: string[];
  division: string; // Division.id
  district: string;
  /** Taluka this stop is the headquarters of (when it is one). */
  taluka?: string;
  talukas?: string[];
  /** City group id when a city has several bus stands (pune, mumbai…). */
  city?: string;
  /** District headquarters — a place long-distance buses route through. */
  hub?: boolean;
  type: 'station' | 'stop';
  /** Depot id, when this is a station operated by a specific depot. */
  depot?: string;
  lat?: number;
  lng?: number;
}

/** A named corridor between two points, with ordered intermediate halts. */
export interface Route {
  id: string;
  from: string; // Stop.id
  to: string; // Stop.id
  /** Ordered stop ids INCLUDING from & to. */
  stops: string[];
  division: string; // Division.id
  distanceKm?: number;
  /** Stop where the published times apply, when not the origin (through buses). */
  timingPoint?: string;
}

export type ServiceCategory =
  | 'ordinary'
  | 'semi-luxury'
  | 'ac'
  | 'premium-ac'
  | 'sleeper'
  | 'electric'
  | 'midi'
  | 'city';

export interface ServiceType {
  id: string;
  name: string;
  nameMr: string;
  nameHi: string;
  category: ServiceCategory;
  ac: boolean;
  /** Alternate names used when matching raw service labels from sources. */
  aliases?: string[];
  description: string;
  descriptionMr: string;
  descriptionHi: string;
  /** Path under /buses/ to a generic, self-authored illustration. */
  image: string;
  /** Sort/priority for display (lower = shown first). */
  order: number;
}

export type DataSource = 'MSRTC' | 'DEMO';

/** A single scheduled departure on a route. */
export interface Trip {
  id: string;
  routeId: string;
  serviceType: string; // ServiceType.id
  /** 24h "HH:MM" at the route origin. */
  departure: string;
  /** 24h "HH:MM" at the route destination (may be next day). Optional. */
  arrival?: string;
  /** Minutes from departure to arrival (may exceed 24h for overnight). */
  durationMin?: number;
  operatingDays: Weekday[];
  /** Operating depot id, when known. */
  depot?: string;
  source: DataSource;
  /** ISO date (YYYY-MM-DD) the trip was last verified against the source. */
  lastVerified: string;
  /**
   * TRUE only for data confirmed against an official MSRTC source.
   * Demo/sample data is always `false` and is labelled as such in the UI.
   */
  verified: boolean;
}

/** Popular from→to pairs surfaced on the home screen. */
export interface PopularRoute {
  routeId: string;
  from: string; // Stop.id
  to: string; // Stop.id
  /** Optional human label override. */
  label?: string;
}

/** Written by the generator; the single "what version am I looking at" file. */
export interface DatasetMetadata {
  datasetVersion: string;
  generatedAt: string; // ISO datetime
  source: string;
  /** TRUE when the dataset contains any unverified/demo trips. */
  containsDemoData: boolean;
  /** Trips transcribed from MSRTC documents but not yet cross-checked. */
  unverifiedTrips?: number;
  counts: {
    divisions: number;
    depots: number;
    stations: number;
    stops: number;
    routes: number;
    trips: number;
    serviceTypes: number;
  };
  /** Per-division trip counts, so the app knows which schedule files exist. */
  schedules: { division: string; slug: string; trips: number }[];
  disclaimer: string;
}

export type ChangeType =
  | 'NEW_ROUTE'
  | 'REMOVED_ROUTE'
  | 'NEW_TRIP'
  | 'REMOVED_TRIP'
  | 'TIME_CHANGED'
  | 'SERVICE_CHANGED';

export interface DataChange {
  type: ChangeType;
  routeId?: string;
  route?: string; // human label, e.g. "Pune → Satara"
  tripId?: string;
  field?: string;
  old?: string;
  new?: string;
}

export interface ChangeSet {
  datasetVersion: string;
  generatedAt: string;
  previousVersion?: string;
  changes: DataChange[];
}

/** Per-division schedule file: the large data, lazy-loaded on demand. */
export interface ScheduleFile {
  division: string; // Division.id
  slug: string;
  generatedAt: string;
  trips: Trip[];
}

/** The full in-memory dataset the generator assembles / the app can hold. */
export interface Dataset {
  metadata: DatasetMetadata;
  divisions: Division[];
  depots: Depot[];
  stops: Stop[];
  stations: Stop[];
  routes: Route[];
  serviceTypes: ServiceType[];
  popularRoutes: PopularRoute[];
  schedules: ScheduleFile[];
  changes: ChangeSet;
}
