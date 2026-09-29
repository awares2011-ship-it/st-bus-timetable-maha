import fs from 'node:fs';
import path from 'node:path';

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

export function readJsonIfExists<T>(file: string): T | undefined {
  if (!fs.existsSync(file)) return undefined;
  try {
    return readJson<T>(file);
  } catch {
    return undefined;
  }
}

/** Write JSON atomically (write to a temp file, then rename). */
export function writeJson(file: string, data: unknown, pretty = true): void {
  ensureDir(path.dirname(file));
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, pretty ? 2 : 0));
  fs.renameSync(tmp, file);
}

export function listFiles(dir: string, ext?: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => (ext ? f.endsWith(ext) : true))
    .map((f) => path.join(dir, f));
}

export function copyDir(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    // Never recurse into a `.backup` subtree — that folder is the destination
    // of the very same copy, and following it triggers unbounded nested
    // .backup/.backup/… growth (recovered here after a Windows crash left one).
    if (entry.name === '.backup') continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

export function rmrf(target: string): void {
  // Windows occasionally reports ENOTEMPTY under load / antivirus scans even
  // when the caller has already emptied the target. Retry with backoff so a
  // spurious failure doesn't abort `writeDataset` (which would leave the
  // published data half-written).
  fs.rmSync(target, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
