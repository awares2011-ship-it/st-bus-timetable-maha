/* Tiny dependency-free logger with levels + timing. */

const t0 = Date.now();

function stamp(): string {
  const s = ((Date.now() - t0) / 1000).toFixed(2);
  return `+${s}s`;
}

export const log = {
  info: (...a: unknown[]) => console.log(`\x1b[36m[info ${stamp()}]\x1b[0m`, ...a),
  ok: (...a: unknown[]) => console.log(`\x1b[32m[ ok  ${stamp()}]\x1b[0m`, ...a),
  warn: (...a: unknown[]) => console.warn(`\x1b[33m[warn ${stamp()}]\x1b[0m`, ...a),
  error: (...a: unknown[]) => console.error(`\x1b[31m[err  ${stamp()}]\x1b[0m`, ...a),
  step: (n: number, total: number, msg: string) =>
    console.log(`\x1b[35m[${n}/${total} ${stamp()}]\x1b[0m ${msg}`),
};
