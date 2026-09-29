/** Text helpers for search matching and route-slug handling. */

/** Lowercased, de-accented, punctuation-free key (keeps Devanagari). */
export function normalizeKey(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    // Strip only the noise words that never distinguish two stops. Keep
    // "station"/"stand"/"depot" so "Pune Station" ≠ bare "Pune".
    .replace(/\b(s\.?t\.?|bus\s*stand|bus\s*stop)\b/g, '')
    .replace(/[^a-z0-9ऀ-ॿ]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Levenshtein distance (bounded use for short station names). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** Build the `/st-bus/<from>-to-<to>` slug from two stop ids. */
export function routePairSlug(from: string, to: string): string {
  return `${from}-to-${to}`;
}

/**
 * Parse a `<from>-to-<to>` slug against the known route pairs. Because stop ids
 * themselves contain hyphens, we resolve against the real list of pairs rather
 * than naively splitting on the first "-to-".
 */
export function parseRoutePair(
  slug: string,
  knownPairs: { from: string; to: string }[],
): { from: string; to: string } | undefined {
  for (const p of knownPairs) {
    if (routePairSlug(p.from, p.to) === slug) return p;
  }
  // Fallback: split on the first "-to-".
  const idx = slug.indexOf('-to-');
  if (idx > 0) {
    return { from: slug.slice(0, idx), to: slug.slice(idx + 4) };
  }
  return undefined;
}
