import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Repository root (two levels up from scraper/util). */
export const ROOT = path.resolve(__dirname, '..', '..');

export const PATHS = {
  root: ROOT,
  data: path.join(ROOT, 'data'),
  demo: path.join(ROOT, 'data', 'demo'),
  demoSource: path.join(ROOT, 'data', 'demo', 'source'),
  generated: path.join(ROOT, 'data', 'generated'),
  generatedSchedules: path.join(ROOT, 'data', 'generated', 'schedules'),
  backup: path.join(ROOT, 'data', 'generated', '.backup'),
  tmp: path.join(ROOT, 'data', '.tmp'),
  staged: path.join(ROOT, 'data', '.tmp', 'staged.json'),
  validationReport: path.join(ROOT, 'data', '.tmp', 'validation-report.json'),
  publicData: path.join(ROOT, 'public', 'data'),
  cache: path.join(ROOT, 'scraper', '.cache'),
};
