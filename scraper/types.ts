import type { Weekday, DataSource } from '../src/types/domain';

/**
 * Pipeline-internal types. These describe data as it flows through
 * fetch → parse → normalise → validate → generate.
 */

export type RawFormat = 'html' | 'pdf' | 'text' | 'json-fixture';

/** A raw document fetched from a source, before parsing. */
export interface RawDoc {
  /** Stable id for this document (e.g. url or fixture filename). */
  id: string;
  format: RawFormat;
  url?: string;
  /** Text content for html/text; base64 for pdf; JSON string for fixtures. */
  content: string;
  /** Content hash, used to skip re-processing unchanged documents. */
  hash: string;
  fetchedAt: string;
  /** For image-only PDFs we set this and refuse to publish OCR guesses. */
  imageOnly?: boolean;
}

/** A parsed trip before normalisation (names are still raw strings). */
export interface ParsedTrip {
  fromRaw: string;
  toRaw: string;
  viaRaw: string[];
  serviceRaw: string;
  departure: string;
  arrival?: string;
  operatingDays?: Weekday[];
  depotRaw?: string;
  sourceDocId: string;
  /** MSRTC division the source document belongs to (disambiguates same-name towns). */
  divisionHint?: string;
  /** Marathi spelling as printed in the source, when known. */
  fromMr?: string;
  toMr?: string;
  /** False when the source transcription is not yet cross-checked. */
  verified?: boolean;
  /** Official document + page this trip was read from. */
  sourceRef?: string;
  /** Through bus: its real origin. `fromRaw` is then where the time applies. */
  originRaw?: string;
  originMr?: string;
}

export interface ParseResult {
  trips: ParsedTrip[];
  /** Non-fatal issues surfaced for review. */
  warnings: string[];
}

/** What a source returns: raw docs + provenance. */
export interface SourceResult {
  sourceId: string;
  sourceLabel: DataSource;
  docs: RawDoc[];
  fetchedAt: string;
  notes: string[];
}

export interface Source {
  id: string;
  label: DataSource;
  /** Human description of what/where this source is. */
  describe(): string;
  /** Fetch raw documents. MUST respect robots.txt & rate limits. */
  fetch(): Promise<SourceResult>;
  /** Which parser format each doc uses (source knows its own docs). */
}
