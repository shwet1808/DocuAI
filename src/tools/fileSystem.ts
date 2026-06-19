import { writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Writes the final report content atomically to a file path.
 * It writes first to a .tmp file and then renames it.
 */
export function writeReportAtomically(content: string, relativePath: string = './output/report.txt'): void {
  const absolutePath = resolve(relativePath);
  const dir = dirname(absolutePath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const tmpPath = `${absolutePath}.tmp`;
  writeFileSync(tmpPath, content, 'utf-8');
  renameSync(tmpPath, absolutePath);
}
