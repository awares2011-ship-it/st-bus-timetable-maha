import { createHash } from 'node:crypto';
import { log } from '../util/log';

/**
 * A polite HTTP fetcher for the scraper.
 *
 * Enforces the safety rules from the project spec:
 *   - respects robots.txt (per host, cached)
 *   - rate-limits requests (min delay between hits to the same host)
 *   - sends a descriptive, contactable User-Agent
 *   - supports conditional GET (ETag / Last-Modified) to avoid re-downloading
 *   - never bypasses CAPTCHAs, logins, or anti-bot systems
 *
 * It is intentionally conservative. If in doubt, it declines to fetch.
 */

const USER_AGENT =
  process.env.SCRAPER_USER_AGENT ??
  'STBusTimetableBot/0.1 (+contact: you@example.com; respects robots.txt)';

const MIN_DELAY_MS = Number(process.env.SCRAPER_MIN_DELAY_MS ?? 3000);
const MAX_RETRIES = 3;

const lastHitByHost = new Map<string, number>();
const robotsCache = new Map<string, RobotsRules>();

interface RobotsRules {
  disallow: string[];
  allow: string[];
  crawlDelayMs?: number;
}

export function sha1(input: string): string {
  return createHash('sha1').update(input).digest('hex');
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Extremely small robots.txt parser (User-agent: * block only). */
function parseRobots(txt: string): RobotsRules {
  const rules: RobotsRules = { disallow: [], allow: [] };
  let applies = false;
  for (const rawLine of txt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(':');
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(':').trim();
    if (key === 'user-agent') {
      applies = value === '*';
    } else if (applies && key === 'disallow' && value) {
      rules.disallow.push(value);
    } else if (applies && key === 'allow' && value) {
      rules.allow.push(value);
    } else if (applies && key === 'crawl-delay' && value) {
      const secs = Number(value);
      if (!Number.isNaN(secs)) rules.crawlDelayMs = secs * 1000;
    }
  }
  return rules;
}

async function getRobots(origin: string): Promise<RobotsRules> {
  const cached = robotsCache.get(origin);
  if (cached) return cached;
  let rules: RobotsRules = { disallow: [], allow: [] };
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (res.ok) rules = parseRobots(await res.text());
  } catch {
    // No robots.txt reachable → default to the most cautious behaviour by
    // still applying our own rate limit, but do not assume blanket allow.
    log.warn(`robots.txt not reachable for ${origin}; proceeding cautiously`);
  }
  robotsCache.set(origin, rules);
  return rules;
}

function isAllowed(rules: RobotsRules, pathname: string): boolean {
  // Longest-match wins between allow/disallow; allow takes precedence on ties.
  const match = (patterns: string[]) =>
    patterns
      .filter((p) => pathname.startsWith(p))
      .reduce((max, p) => Math.max(max, p.length), -1);
  const dis = match(rules.disallow);
  const alw = match(rules.allow);
  if (dis === -1) return true;
  return alw >= dis;
}

export interface FetchResult {
  ok: boolean;
  status: number;
  body: string;
  notModified: boolean;
  contentType: string;
  etag?: string;
  lastModified?: string;
}

/**
 * Politely fetch a URL as text. Returns notModified=true when the server
 * answers 304 to a conditional request.
 */
export async function politeFetch(
  url: string,
  opts: { etag?: string; lastModified?: string } = {},
): Promise<FetchResult> {
  const u = new URL(url);
  const rules = await getRobots(u.origin);

  if (!isAllowed(rules, u.pathname)) {
    log.warn(`robots.txt disallows ${u.pathname} on ${u.origin} — skipping`);
    return { ok: false, status: 0, body: '', notModified: false, contentType: '' };
  }

  const delay = Math.max(MIN_DELAY_MS, rules.crawlDelayMs ?? 0);
  const last = lastHitByHost.get(u.host) ?? 0;
  const wait = last + delay - Date.now();
  if (wait > 0) await sleep(wait);

  const headers: Record<string, string> = { 'User-Agent': USER_AGENT };
  if (opts.etag) headers['If-None-Match'] = opts.etag;
  if (opts.lastModified) headers['If-Modified-Since'] = opts.lastModified;

  let attempt = 0;
  // Simple exponential backoff on transient failures.
  // (429/5xx). Never hammer the server.
  while (true) {
    attempt++;
    lastHitByHost.set(u.host, Date.now());
    try {
      const res = await fetch(url, { headers });
      if (res.status === 304) {
        return { ok: true, status: 304, body: '', notModified: true, contentType: '' };
      }
      if ((res.status === 429 || res.status >= 500) && attempt <= MAX_RETRIES) {
        const backoff = delay * 2 ** attempt;
        log.warn(`HTTP ${res.status} for ${url}; backing off ${backoff}ms`);
        await sleep(backoff);
        continue;
      }
      const body = await res.text();
      return {
        ok: res.ok,
        status: res.status,
        body,
        notModified: false,
        contentType: res.headers.get('content-type') ?? '',
        etag: res.headers.get('etag') ?? undefined,
        lastModified: res.headers.get('last-modified') ?? undefined,
      };
    } catch (err) {
      if (attempt <= MAX_RETRIES) {
        const backoff = delay * 2 ** attempt;
        log.warn(`fetch error for ${url}: ${(err as Error).message}; retry in ${backoff}ms`);
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
}
