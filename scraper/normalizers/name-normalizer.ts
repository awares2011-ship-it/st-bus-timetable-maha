import type { Stop } from '../../src/types/domain';

/**
 * Name normalisation: turn messy, real-world station names into a canonical
 * key, and resolve raw names to known stop ids using name + alias + Marathi/
 * Hindi matching. This is where "Pune", "Pune ST", "पुणे", "Poona" all collapse
 * to the same station.
 */

/** Lowercased, de-accented, punctuation-free key for fuzzy matching. */
export function normalizeKey(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip Latin combining diacritics
    .toLowerCase()
    .replace(/\b(s\.?t\.?|bus\s*stand|bus\s*stop|depot|stand|station|bstand)\b/g, '')
    .replace(/[^a-z0-9ऀ-ॿ]+/g, ' ') // keep Devanagari
    .trim()
    .replace(/\s+/g, ' ');
}

/** URL-safe slug (ASCII). Used for ids and SEO paths. */
export function slugify(input: string): string {
  const ascii = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return ascii || 'x';
}

export class StopResolver {
  private index = new Map<string, string[]>(); // normalizedKey -> stopIds (first = primary)
  private divisionOf = new Map<string, string>();

  constructor(stops: Stop[]) {
    // Real names first for every stop, then aliases, so an alias never
    // shadows another place's actual name ("Khed" the town vs Khed taluka).
    for (const stop of stops) this.addNames(stop);
    for (const stop of stops) this.addAliases(stop);
  }

  addStop(stop: Stop): void {
    this.addNames(stop);
    this.addAliases(stop);
  }

  private addNames(stop: Stop): void {
    this.divisionOf.set(stop.id, stop.division);
    for (const n of [stop.name, stop.nameMr, stop.nameHi, stop.id]) this.add(n, stop.id);
  }

  private addAliases(stop: Stop): void {
    for (const a of stop.aliases) this.add(a, stop.id);
  }

  private add(name: string, id: string): void {
    const key = normalizeKey(name ?? '');
    if (!key) return;
    const list = this.index.get(key);
    if (!list) this.index.set(key, [id]);
    else if (!list.includes(id)) list.push(id);
  }

  /** All stop ids registered under this name (primary names first). */
  resolveAll(rawName: string): string[] {
    return this.index.get(normalizeKey(rawName ?? '')) ?? [];
  }

  /**
   * Resolve a raw name to a known stop id, or undefined if unknown. When a
   * name is shared by several places (Karjat, Malegaon, Ashti, Kalamb…) the
   * one inside `divisionHint` wins, else the first registered.
   */
  resolve(rawName: string, divisionHint?: string): string | undefined {
    const ids = this.index.get(normalizeKey(rawName ?? ''));
    if (!ids?.length) return undefined;
    if (divisionHint && ids.length > 1) {
      const local = ids.find((id) => this.divisionOf.get(id) === divisionHint);
      if (local) return local;
    }
    return ids[0];
  }
}

/**
 * Loose Latin sound key used to tell whether two romanisations name the same
 * place (Kurundwad ≈ Kurundvad, Ajra ≈ Ajara) but not different places that
 * share a Marathi spelling (Devli ≠ Deoli).
 */
export function phoneticKey(input: string): string {
  let k = normalizeKey(input).replace(/\s+/g, '');
  for (const [a, b] of [
    ['aa', 'a'], ['ee', 'i'], ['oo', 'u'], ['w', 'v'], ['ph', 'f'], ['sh', 's'], ['kh', 'k'],
    ['gh', 'g'], ['chh', 'c'], ['ch', 'c'], ['th', 't'], ['dh', 'd'], ['bh', 'b'], ['jh', 'j'], ['z', 'j'], ['y', 'i'],
  ] as const) k = k.split(a).join(b);
  return k.replace(/[aeiou]/g, '');
}
