#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const SOURCE_REPO = process.env.CLI_SOURCE_REPO || 'CommitForge/easy_publish_cli';
const SOURCE_REF = process.env.CLI_SOURCE_REF || 'main';
const STRIP_VITE_COMPAT = process.env.CLI_STRIP_VITE_COMPAT !== 'false';

const RAW_BASE = `https://raw.githubusercontent.com/${SOURCE_REPO}/${SOURCE_REF}`;

const FILES = [
  { dest: 'public/scripts/izipub.js', candidates: ['izipub.js'] },
  { dest: 'public/scripts/cli.sh', candidates: ['cli.sh'] },
  { dest: 'public/scripts/lib/commands.js', candidates: ['lib/commands.js'] },
  { dest: 'public/scripts/lib/iota.js', candidates: ['lib/iota.js'] },
  { dest: 'public/scripts/lib/logger.js', candidates: ['lib/logger.js'] },
  { dest: 'public/scripts/package.json', candidates: ['package.json'] },
  { dest: 'public/scripts/README.md', candidates: ['README.md'] },
  {
    dest: 'public/scripts/env.cli.example',
    candidates: ['env.cli.example', '.env.cli.example'],
  },
  {
    dest: 'public/scripts/.env.cli.example',
    candidates: ['.env.cli.example', 'env.cli.example'],
  },
];

function transformFile(dest, content) {
  if (!STRIP_VITE_COMPAT) return content;

  if (dest.endsWith('izipub.js')) {
    return content.replace(/ \/ VITE_IOTA_NETWORK/g, '');
  }

  if (dest.endsWith('lib/commands.js')) {
    return content
      .replace(/\s*\?\?\s*process\.env\.VITE_IOTA_NETWORK\s*\?\?\s*''/g, " ?? ''")
      .replace(
        /\[\s*'([A-Z0-9_]+)'\s*,\s*'VITE_[A-Z0-9_]+'\s*\]/g,
        "['$1']"
      );
  }

  if (dest.endsWith('README.md')) {
    return content
      .replace(
        /- network can be set via `--network`, `IOTA_NETWORK`, `IZIPUB_NETWORK`, or `VITE_IOTA_NETWORK`/g,
        '- network can be set via `--network`, `IOTA_NETWORK`, or `IZIPUB_NETWORK`'
      )
      .replace(
        /- also supported for app compatibility:\n(?:\s*-\s*`VITE_[A-Z0-9_]+`.*\n)+/g,
        ''
      )
      .replace(/^\s*-\s+also supported for app compatibility:\s*$/gm, '');
  }

  if (dest.endsWith('env.cli.example') || dest.endsWith('.env.cli.example')) {
    return content.replace(/^#\s*VITE_[A-Z0-9_]+=.*\n/gm, '');
  }

  return content;
}

async function fetchRaw(path) {
  const url = `${RAW_BASE}/${path}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return await response.text();
}

async function fileExists(path) {
  try {
    await readFile(path, 'utf8');
    return true;
  } catch {
    return false;
  }
}

async function syncOneFile(fileSpec) {
  for (const candidate of fileSpec.candidates) {
    try {
      const raw = await fetchRaw(candidate);
      const transformed = transformFile(fileSpec.dest, raw);
      await mkdir(dirname(fileSpec.dest), { recursive: true });
      await writeFile(fileSpec.dest, transformed, 'utf8');
      return { status: 'updated', source: candidate };
    } catch {
      // try next candidate
    }
  }

  if (await fileExists(fileSpec.dest)) {
    const current = await readFile(fileSpec.dest, 'utf8');
    const transformed = transformFile(fileSpec.dest, current);
    if (transformed !== current) {
      await writeFile(fileSpec.dest, transformed, 'utf8');
      return { status: 'sanitized-local' };
    }
    return { status: 'kept-local' };
  }

  return { status: 'missing' };
}

async function main() {
  console.log(`[sync-cli] source=${SOURCE_REPO}@${SOURCE_REF}`);
  console.log(`[sync-cli] strip_vite_compat=${STRIP_VITE_COMPAT ? 'true' : 'false'}`);

  let updated = 0;
  let keptLocal = 0;
  let sanitizedLocal = 0;
  const missing = [];

  for (const file of FILES) {
    const result = await syncOneFile(file);
    if (result.status === 'updated') {
      updated += 1;
      console.log(`[sync-cli] updated ${file.dest} <- ${result.source}`);
    } else if (result.status === 'sanitized-local') {
      sanitizedLocal += 1;
      console.warn(`[sync-cli] sanitized existing ${file.dest}`);
    } else if (result.status === 'kept-local') {
      keptLocal += 1;
      console.warn(`[sync-cli] network unavailable, keeping existing ${file.dest}`);
    } else {
      missing.push(file.dest);
      console.error(`[sync-cli] missing ${file.dest} and could not fetch source`);
    }
  }

  if (missing.length > 0) {
    console.error(`[sync-cli] failed, missing required files:\n- ${missing.join('\n- ')}`);
    process.exit(1);
  }

  console.log(
    `[sync-cli] done (updated=${updated}, sanitized-local=${sanitizedLocal}, kept-local=${keptLocal})`
  );
}

main().catch((error) => {
  console.error('[sync-cli] unexpected error:', error);
  process.exit(1);
});
