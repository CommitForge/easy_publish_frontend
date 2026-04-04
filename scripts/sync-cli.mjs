#!/usr/bin/env node

import JSZip from 'jszip';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { promisify } from 'node:util';

const SOURCE_REPO = process.env.CLI_SOURCE_REPO || 'CommitForge/easy_publish_cli';
const SOURCE_REF = process.env.CLI_SOURCE_REF || 'main';
const STRIP_VITE_COMPAT = process.env.CLI_STRIP_VITE_COMPAT !== 'false';
const SKIP_REMOTE_WHEN_CACHED = process.env.CLI_SKIP_REMOTE_WHEN_CACHED !== 'false';
const FORCE_REFRESH = process.env.CLI_FORCE_REFRESH === 'true';
const REMOTE_CHECK_TIMEOUT_MS = Number(process.env.CLI_REMOTE_CHECK_TIMEOUT_MS || 8000);

const SYNC_STATE_PATH = '.lh/sync-cli-state.json';
const ZIP_OUTPUT_PATH = 'public/scripts/easy_publish_cli_scripts.zip';
const execFileAsync = promisify(execFile);

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

const ZIP_FILES = [
  { source: 'public/scripts/izipub.js', path: 'izipub.js' },
  { source: 'public/scripts/cli.sh', path: 'cli.sh' },
  { source: 'public/scripts/lib/commands.js', path: 'lib/commands.js' },
  { source: 'public/scripts/lib/iota.js', path: 'lib/iota.js' },
  { source: 'public/scripts/lib/logger.js', path: 'lib/logger.js' },
  { source: 'public/scripts/.env.cli.example', path: '.env.cli.example' },
  { source: 'public/scripts/package.json', path: 'package.json' },
  { source: 'public/scripts/README.md', path: 'README.md' },
];
const ZIP_ENTRY_DATE = new Date('2000-01-01T00:00:00.000Z');

function stateSignature() {
  return {
    sourceRepo: SOURCE_REPO,
    sourceRef: SOURCE_REF,
    stripViteCompat: STRIP_VITE_COMPAT,
  };
}

function isCompatibleState(state) {
  if (!state || typeof state !== 'object') return false;
  const sig = stateSignature();
  return (
    state.sourceRepo === sig.sourceRepo &&
    state.sourceRef === sig.sourceRef &&
    state.stripViteCompat === sig.stripViteCompat
  );
}

function rawBase(ref) {
  return `https://raw.githubusercontent.com/${SOURCE_REPO}/${ref}`;
}

function repoUrl() {
  return `https://github.com/${SOURCE_REPO}.git`;
}

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

async function fetchRaw(path, ref) {
  const url = `${rawBase(ref)}/${path}`;
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

async function readSyncState() {
  try {
    const raw = await readFile(SYNC_STATE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

async function writeSyncState(extra = {}) {
  const payload = {
    ...stateSignature(),
    syncVersion: 1,
    syncedAt: new Date().toISOString(),
    ...extra,
  };
  await mkdir(dirname(SYNC_STATE_PATH), { recursive: true });
  await writeFile(SYNC_STATE_PATH, JSON.stringify(payload, null, 2), 'utf8');
}

async function haveAllRequiredLocalFiles() {
  for (const file of FILES) {
    if (!(await fileExists(file.dest))) return false;
  }
  return true;
}

async function packCliZip() {
  const zip = new JSZip();
  for (const entry of ZIP_FILES) {
    const content = await readFile(entry.source, 'utf8');
    zip.file(entry.path, content, { createFolders: false, date: ZIP_ENTRY_DATE });
  }

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
    platform: 'UNIX',
  });

  try {
    const existing = await readFile(ZIP_OUTPUT_PATH);
    if (existing.equals(buffer)) {
      return false;
    }
  } catch {
    // file does not exist yet; write below
  }

  await mkdir(dirname(ZIP_OUTPUT_PATH), { recursive: true });
  await writeFile(ZIP_OUTPUT_PATH, buffer);
  return true;
}

async function resolveRemoteSha() {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['ls-remote', repoUrl(), SOURCE_REF],
      {
        timeout: REMOTE_CHECK_TIMEOUT_MS,
      }
    );
    const firstLine = stdout
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0);
    if (!firstLine) return null;
    const sha = firstLine.split(/\s+/)[0];
    return /^[a-f0-9]{40}$/i.test(sha) ? sha.toLowerCase() : null;
  } catch {
    return null;
  }
}

async function syncOneFile(fileSpec, ref) {
  for (const candidate of fileSpec.candidates) {
    try {
      const raw = await fetchRaw(candidate, ref);
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
  console.log(`[sync-cli] skip_remote_when_cached=${SKIP_REMOTE_WHEN_CACHED ? 'true' : 'false'}`);
  console.log(`[sync-cli] force_refresh=${FORCE_REFRESH ? 'true' : 'false'}`);

  const cachedState = await readSyncState();
  const remoteSha = await resolveRemoteSha();
  if (remoteSha) {
    console.log(`[sync-cli] remote_sha=${remoteSha}`);
  } else {
    console.warn('[sync-cli] remote SHA check unavailable (network/offline), falling back');
  }

  const effectiveRef = remoteSha || SOURCE_REF;
  const hasRemoteMatch = !!remoteSha && cachedState?.remoteSha === remoteSha;
  const cacheEligible =
    SKIP_REMOTE_WHEN_CACHED &&
    !FORCE_REFRESH &&
    isCompatibleState(cachedState) &&
    (await haveAllRequiredLocalFiles()) &&
    (hasRemoteMatch || !remoteSha);

  if (cacheEligible) {
    const zipWritten = await packCliZip();
    console.log('[sync-cli] cache hit, skipped remote checks');
    console.log(`[sync-cli] ${zipWritten ? 'packed' : 'zip unchanged'} ${ZIP_OUTPUT_PATH}`);
    console.log('[sync-cli] done (updated=0, sanitized-local=0, kept-local=0, cache-hit=true)');
    return;
  }

  let updated = 0;
  let keptLocal = 0;
  let sanitizedLocal = 0;
  const missing = [];

  for (const file of FILES) {
    const result = await syncOneFile(file, effectiveRef);
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

  const zipWritten = await packCliZip();
  await writeSyncState({
    updated,
    sanitizedLocal,
    keptLocal,
    cacheHit: false,
    remoteSha,
  });
  console.log(`[sync-cli] ${zipWritten ? 'packed' : 'zip unchanged'} ${ZIP_OUTPUT_PATH}`);

  console.log(
    `[sync-cli] done (updated=${updated}, sanitized-local=${sanitizedLocal}, kept-local=${keptLocal})`
  );
}

main().catch((error) => {
  console.error('[sync-cli] unexpected error:', error);
  process.exit(1);
});
