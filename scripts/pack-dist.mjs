import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import JSZip from 'jszip';

const DIST_DIR = process.env.DIST_DIR?.trim() || 'dist';
const ARTIFACT_BASE = process.env.ARTIFACT_BASE?.trim() || 'dist-easy_publish_frontend';
const ARTIFACT_VERSION = process.env.ARTIFACT_VERSION?.trim() || '';
const ARTIFACT_STEM = ARTIFACT_VERSION ? `${ARTIFACT_BASE}-${ARTIFACT_VERSION}` : ARTIFACT_BASE;
const OUTPUT_ZIP = `${ARTIFACT_STEM}.zip`;
const ZIP_ROOT_DIR = ARTIFACT_STEM;

async function collectFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const distStat = await stat(DIST_DIR).catch(() => null);
  if (!distStat || !distStat.isDirectory()) {
    throw new Error(`Missing dist directory. Run build first: ${DIST_DIR}`);
  }

  const files = await collectFiles(DIST_DIR);
  const zip = new JSZip();

  for (const filePath of files) {
    const content = await readFile(filePath);
    const distRelativePath = relative(DIST_DIR, filePath).replaceAll('\\\\', '/');
    const zipPath = `${ZIP_ROOT_DIR}/${distRelativePath}`;
    zip.file(zipPath, content);
  }

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  await mkdir(dirname(OUTPUT_ZIP), { recursive: true });
  await writeFile(OUTPUT_ZIP, buffer);

  const kib = (buffer.length / 1024).toFixed(1);
  console.log(`[pack-dist] wrote ${OUTPUT_ZIP} (${kib} KiB) with ${files.length} files`);
}

main().catch((err) => {
  console.error('[pack-dist] failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
