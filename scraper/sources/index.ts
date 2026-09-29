import type { Source } from '../types';
import { DemoSource } from './demo-source';
import { MsrtcOfficialSource } from './msrtc-portal';
import { MsrtcPdfSource } from './msrtc-pdf-source';

/** Registry of available data sources, keyed by id. */
export function getSource(id: string): Source {
  switch (id) {
    case 'demo':
      return new DemoSource();
    case 'msrtc':
      return new MsrtcOfficialSource();
    case 'msrtc-pdf':
      return new MsrtcPdfSource();
    default:
      throw new Error(`Unknown source '${id}'. Known: demo, msrtc, msrtc-pdf.`);
  }
}

/**
 * Resolve the source id from CLI args / env, defaulting to `msrtc-pdf` (the
 * hand-verified + OCR-derived divisional-PDF data). The old `demo` source is
 * still available on request; the live-booking `msrtc` scaffold requires
 * explicit MSRTC_DOC_URLS.
 */
export function resolveSourceId(argv: string[] = process.argv): string {
  const arg = argv.find((a) => a.startsWith('--source='));
  if (arg) return arg.split('=')[1];
  return process.env.DATA_SOURCE ?? 'msrtc-pdf';
}
