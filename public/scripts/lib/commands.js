import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Transaction } from '@iota/iota-sdk/transactions';
import { Ed25519Keypair } from '@iota/iota-sdk/keypairs/ed25519';
import { createClient, extractObjectId, fetchObject, walkLinkedList } from './iota.js';

const OBJECT_ID_REGEX = /^0x[a-fA-F0-9]{64}$/;
const TRUE_VALUES = new Set(['1', 'true', 'yes', 'y', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'n', 'off']);
const SCRIPT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const WRITE_COMMANDS = new Set([
  'create-container',
  'update-container',
  'create-data-type',
  'update-data-type',
  'publish-data-item',
  'publish-data-item-verification',
  'attach-child',
  'update-child-link',
  'add-owner',
  'remove-owner',
  'recount-owners-active',
]);

function toCamelCase(value) {
  return String(value).replace(/[-_]+([a-zA-Z0-9])/g, (_m, c) => c.toUpperCase());
}

function toSnakeCase(value) {
  return String(value).replace(/-/g, '_');
}

function getInputValue(input, key) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const keys = [key, toCamelCase(key), toSnakeCase(key)];
  for (const candidate of keys) {
    if (Object.prototype.hasOwnProperty.call(input, candidate)) {
      return input[candidate];
    }
  }
  return undefined;
}

function getOption(args, names, defaultValue = '') {
  for (const name of names) {
    const value = args.options?.[name];
    if (value !== undefined && value !== null) return value;
  }

  for (const name of names) {
    const value = getInputValue(args.inputFileData, name);
    if (value !== undefined && value !== null) return value;
  }
  return defaultValue;
}

function getBoolOption(args, names, defaultValue = false) {
  for (const name of names) {
    const value = args.options?.[name];
    if (value === undefined || value === null) continue;

    if (typeof value === 'boolean') return value;

    const normalized = String(value).trim().toLowerCase();
    if (TRUE_VALUES.has(normalized)) return true;
    if (FALSE_VALUES.has(normalized)) return false;

    throw new Error(`Invalid boolean for --${name}: ${value}`);
  }

  for (const name of names) {
    const value = getInputValue(args.inputFileData, name);
    if (value === undefined || value === null) continue;

    if (typeof value === 'boolean') return value;

    const normalized = String(value).trim().toLowerCase();
    if (TRUE_VALUES.has(normalized)) return true;
    if (FALSE_VALUES.has(normalized)) return false;

    throw new Error(`Invalid boolean for --${name}: ${value}`);
  }

  return defaultValue;
}

function requireObjectId(value, label) {
  const normalized = String(value ?? '').trim();
  if (!OBJECT_ID_REGEX.test(normalized)) {
    throw new Error(`${label} must be a 0x-prefixed 32-byte hex object ID`);
  }
  return normalized;
}

function requireNonEmpty(value, label) {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
}

function parseU128(value, label) {
  if (value === undefined || value === null || value === '') return 0n;
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return BigInt(raw);
}

function parseAddressList(value) {
  if (value === undefined || value === null || value === '') return [];

  const values = Array.isArray(value)
    ? value.filter((item) => item !== undefined && item !== null)
    : String(value).split(/[\n,]+/);

  return values
    .map((s) => String(s))
    .map((s) => s.trim())
    .filter(Boolean)
    .map((addr) => requireObjectId(addr, 'Address'));
}

function loadInputFileData(args, logger) {
  const inputFile = getOption(args, ['input-file', 'input', 'file', 'payload-file'], '');
  if (!inputFile) {
    args.inputFileData = {};
    return;
  }

  const resolvedPath = path.resolve(process.cwd(), String(inputFile));
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Input file not found: ${resolvedPath}`);
  }

  const raw = fs.readFileSync(resolvedPath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in input file ${resolvedPath}: ${err?.message || String(err)}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Input file must contain a JSON object: ${resolvedPath}`);
  }

  args.inputFileData = parsed;
  logger?.debug?.('Loaded input JSON file', { file: resolvedPath });
}

function normalizeObjectId(value) {
  const normalized = extractObjectId(value);
  return normalized && OBJECT_ID_REGEX.test(normalized) ? normalized : null;
}

function groupByDataItemId(items) {
  const grouped = {};
  for (const item of items) {
    const key = normalizeObjectId(item?.fields?.data_item_id) ?? 'unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }
  return grouped;
}

async function getDataItemVerifications(client, dataItemId, startId, count, logger) {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error('count must be a positive integer');
  }

  const targetDataItemId = requireObjectId(dataItemId, 'DATA_ITEM_ID').toLowerCase();
  const dataItem = await fetchObject(client, dataItemId);
  const containerId = normalizeObjectId(dataItem.fields?.container_id);

  if (!containerId) {
    throw new Error(`Unable to resolve container_id from data item ${dataItemId}`);
  }

  let currentId = startId && startId !== 'null' ? startId : null;
  if (!currentId) {
    const container = await fetchObject(client, containerId);
    currentId = normalizeObjectId(container.fields?.last_data_item_verification_id);
  }

  if (!currentId) {
    return [];
  }

  const results = [];
  while (currentId && results.length < count) {
    logger?.debug?.('Scanning verification for data item', { currentId, dataItemId });

    const verification = await fetchObject(client, currentId);
    const verificationDataItemId = normalizeObjectId(verification.fields?.data_item_id);
    if (verificationDataItemId?.toLowerCase() === targetDataItemId) {
      results.push(verification);
    }

    currentId = normalizeObjectId(verification.fields?.prev_id);
  }

  return results;
}

function parseEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return false;
  const raw = fs.readFileSync(filePath, 'utf8');

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    if (!key) continue;

    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return true;
}

function loadEnvFiles(args, logger) {
  const seen = new Set();
  const candidates = [];

  if (args.envFile) {
    candidates.push(path.resolve(process.cwd(), String(args.envFile)));
  }

  const roots = [
    SCRIPT_DIR,
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '../..'),
  ];
  const names = [
    '.env.cli',
    '.env.cli.local',
    '.env',
    '.env.production',
    '.env.local',
  ];

  for (const root of roots) {
    for (const name of names) {
      candidates.push(path.resolve(root, name));
    }
  }

  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    if (parseEnvFile(candidate)) {
      logger?.debug?.('Loaded env file', { file: candidate });
    }
  }
}

function resolveNetwork(args) {
  const fromArg = String(args.network ?? '').trim();
  if (fromArg) return fromArg;

  const fromEnv = String(
    process.env.IOTA_NETWORK ?? process.env.IZIPUB_NETWORK ?? ''
  ).trim();

  return fromEnv || 'mainnet';
}

function getConfigValue(args, optionNames, envNames, fallback = '') {
  const optionValue = getOption(args, optionNames, '');
  if (optionValue !== '') return String(optionValue).trim();

  for (const envName of envNames) {
    const envValue = process.env[envName];
    if (envValue) return String(envValue).trim();
  }

  return fallback;
}

function resolveMoveConfig(args) {
  const config = {
    packageId: getConfigValue(args, ['package-id'], ['PACKAGE_ID']),
    module: getConfigValue(args, ['module', 'module-id'], ['MODULE_ID', 'MODULE']),
    clockId: getConfigValue(args, ['clock-id'], ['CLOCK_ID']),
    containerChainId: getConfigValue(
      args,
      ['container-chain-id'],
      ['CONTAINER_CHAIN_ID']
    ),
    dataItemChainId: getConfigValue(
      args,
      ['data-item-chain-id'],
      ['DATA_ITEM_CHAIN_ID', 'DATA_ITEM_CHAIN']
    ),
    dataItemVerificationChainId: getConfigValue(
      args,
      ['data-item-verification-chain-id'],
      ['DATA_ITEM_VERIFICATION_CHAIN_ID', 'DATA_ITEM_VERIFICATION_CHAIN']
    ),
    updateChainId: getConfigValue(args, ['update-chain-id'], ['UPDATE_CHAIN_ID']),
  };

  if (!config.packageId) throw new Error('Missing PACKAGE_ID (or --package-id)');
  if (!config.module) throw new Error('Missing MODULE_ID/MODULE (or --module-id/--module)');
  config.clockId = requireObjectId(config.clockId, 'CLOCK_ID');
  config.containerChainId = requireObjectId(config.containerChainId, 'CONTAINER_CHAIN_ID');
  config.dataItemChainId = requireObjectId(
    config.dataItemChainId,
    'DATA_ITEM_CHAIN_ID/DATA_ITEM_CHAIN'
  );
  config.dataItemVerificationChainId = requireObjectId(
    config.dataItemVerificationChainId,
    'DATA_ITEM_VERIFICATION_CHAIN_ID/DATA_ITEM_VERIFICATION_CHAIN'
  );
  config.updateChainId = requireObjectId(config.updateChainId, 'UPDATE_CHAIN_ID');

  return config;
}

function stripWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function loadPrivateKeyFromFile(filePath) {
  const normalizedPath = String(filePath ?? '').trim();
  if (!normalizedPath) {
    throw new Error('--private-key-file requires a file path');
  }

  const resolvedPath = path.resolve(process.cwd(), normalizedPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Private key file not found: ${resolvedPath}`);
  }

  const raw = fs.readFileSync(resolvedPath, 'utf8');
  let fallback = '';

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim();
      const value = stripWrappingQuotes(trimmed.slice(eq + 1).trim());
      if (!value) continue;
      if (!fallback) fallback = value;

      if (key === 'IOTA_PRIVATE_KEY' || key === 'IZIPUB_PRIVATE_KEY' || key === 'PRIVATE_KEY') {
        return { privateKey: value, resolvedPath };
      }
      continue;
    }

    const value = stripWrappingQuotes(trimmed);
    if (!value) continue;
    if (!fallback) fallback = value;
  }

  if (!fallback) {
    throw new Error(`Private key file is empty: ${resolvedPath}`);
  }

  return { privateKey: fallback, resolvedPath };
}

function resolveSigner(args, logger) {
  const privateKeyValue = getOption(
    args,
    ['private-key', 'secret-key'],
    process.env.IOTA_PRIVATE_KEY ?? process.env.IZIPUB_PRIVATE_KEY ?? ''
  );
  if (privateKeyValue === true) {
    throw new Error('--private-key requires a value');
  }

  const privateKeyFileValue = getOption(
    args,
    ['private-key-file', 'secret-key-file'],
    process.env.IOTA_PRIVATE_KEY_FILE ?? process.env.IZIPUB_PRIVATE_KEY_FILE ?? ''
  );
  if (privateKeyFileValue === true) {
    throw new Error('--private-key-file requires a file path');
  }

  let privateKey = String(privateKeyValue ?? '').trim();
  const privateKeyFile = String(privateKeyFileValue ?? '').trim();

  if (!privateKey && privateKeyFile) {
    const loaded = loadPrivateKeyFromFile(privateKeyFile);
    privateKey = String(loaded.privateKey).trim();
    logger?.debug?.('Loaded signer private key from file', { file: loaded.resolvedPath });
  }

  const mnemonic = getOption(args, ['mnemonic'], process.env.IOTA_MNEMONIC ?? '');
  const derivationPath = getOption(args, ['derivation-path'], process.env.IOTA_DERIVATION_PATH ?? '');

  if (privateKey) {
    return Ed25519Keypair.fromSecretKey(privateKey);
  }

  if (mnemonic) {
    return Ed25519Keypair.deriveKeypair(
      String(mnemonic).trim(),
      derivationPath ? String(derivationPath).trim() : undefined
    );
  }

  throw new Error(
    'Missing signer. Provide --private-key, --private-key-file, or --mnemonic, or set IOTA_PRIVATE_KEY / IZIPUB_PRIVATE_KEY / IOTA_PRIVATE_KEY_FILE / IZIPUB_PRIVATE_KEY_FILE / IOTA_MNEMONIC'
  );
}

function applyGasBudget(tx, args) {
  if (args.gasBudget === undefined || args.gasBudget === null || args.gasBudget === '') {
    return;
  }

  const value = String(args.gasBudget).trim();
  if (!/^\d+$/.test(value)) {
    throw new Error('--gas-budget must be a non-negative integer');
  }

  tx.setGasBudget(BigInt(value));
}

function moveTarget(config, fn) {
  return `${config.packageId}::${config.module}::${fn}`;
}

function buildCreateContainerTx(tx, args, config) {
  const name = requireNonEmpty(getOption(args, ['name']), '--name');

  tx.moveCall({
    target: moveTarget(config, 'create_container'),
    arguments: [
      tx.object(config.containerChainId),
      tx.object(config.updateChainId),
      tx.pure.string(String(getOption(args, ['external-id'], '')).trim()),
      tx.pure.string(name),
      tx.pure.string(String(getOption(args, ['description'], '')).trim()),
      tx.pure.string(String(getOption(args, ['content'], '')).trim()),
      tx.pure.string(String(getOption(args, ['version'], '')).trim()),
      tx.pure.string(String(getOption(args, ['schemas'], '')).trim()),
      tx.pure.string(String(getOption(args, ['apis'], '')).trim()),
      tx.pure.string(String(getOption(args, ['resources'], '')).trim()),
      tx.pure.bool(getBoolOption(args, ['public-update'], false)),
      tx.pure.bool(getBoolOption(args, ['public-attach'], false)),
      tx.pure.bool(getBoolOption(args, ['public-create-type'], false)),
      tx.pure.bool(getBoolOption(args, ['public-publish'], false)),
      tx.pure.bool(getBoolOption(args, ['event-create'], false)),
      tx.pure.bool(getBoolOption(args, ['event-publish'], false)),
      tx.pure.bool(getBoolOption(args, ['event-attach'], false)),
      tx.pure.bool(getBoolOption(args, ['event-add'], false)),
      tx.pure.bool(getBoolOption(args, ['event-remove'], false)),
      tx.pure.bool(getBoolOption(args, ['event-update'], false)),
      tx.pure.u128(parseU128(getOption(args, ['external-index'], '0'), '--external-index')),
      tx.object(config.clockId),
    ],
  });
}

function buildUpdateContainerTx(tx, args, config) {
  const containerId = requireObjectId(
    getOption(args, ['container-id', 'container'], ''),
    '--container-id'
  );

  tx.moveCall({
    target: moveTarget(config, 'update_container'),
    arguments: [
      tx.object(config.updateChainId),
      tx.object(containerId),
      tx.pure.string(String(getOption(args, ['external-id'], '')).trim()),
      tx.pure.string(String(getOption(args, ['name'], '')).trim()),
      tx.pure.string(String(getOption(args, ['description'], '')).trim()),
      tx.pure.string(String(getOption(args, ['content'], '')).trim()),
      tx.pure.string(String(getOption(args, ['version'], '')).trim()),
      tx.pure.string(String(getOption(args, ['schemas'], '')).trim()),
      tx.pure.string(String(getOption(args, ['apis'], '')).trim()),
      tx.pure.string(String(getOption(args, ['resources'], '')).trim()),
      tx.pure.u128(parseU128(getOption(args, ['external-index'], '0'), '--external-index')),
      tx.object(config.clockId),
    ],
  });
}

function buildCreateDataTypeTx(tx, args, config) {
  const containerId = requireObjectId(
    getOption(args, ['container-id', 'container'], ''),
    '--container-id'
  );
  const name = requireNonEmpty(getOption(args, ['name'], ''), '--name');

  tx.moveCall({
    target: moveTarget(config, 'create_data_type'),
    arguments: [
      tx.object(config.updateChainId),
      tx.object(containerId),
      tx.pure.string(String(getOption(args, ['external-id'], '')).trim()),
      tx.pure.string(name),
      tx.pure.string(String(getOption(args, ['description'], '')).trim()),
      tx.pure.string(String(getOption(args, ['content'], '')).trim()),
      tx.pure.string(String(getOption(args, ['version'], '')).trim()),
      tx.pure.string(String(getOption(args, ['schemas'], '')).trim()),
      tx.pure.string(String(getOption(args, ['apis'], '')).trim()),
      tx.pure.string(String(getOption(args, ['resources'], '')).trim()),
      tx.pure.u128(parseU128(getOption(args, ['external-index'], '0'), '--external-index')),
      tx.object(config.clockId),
    ],
  });
}

function buildUpdateDataTypeTx(tx, args, config) {
  const containerId = requireObjectId(
    getOption(args, ['container-id', 'container'], ''),
    '--container-id'
  );
  const dataTypeId = requireObjectId(
    getOption(args, ['data-type-id', 'data-type'], ''),
    '--data-type-id'
  );

  tx.moveCall({
    target: moveTarget(config, 'update_data_type'),
    arguments: [
      tx.object(config.updateChainId),
      tx.object(containerId),
      tx.object(dataTypeId),
      tx.pure.string(String(getOption(args, ['external-id'], '')).trim()),
      tx.pure.string(String(getOption(args, ['name'], '')).trim()),
      tx.pure.string(String(getOption(args, ['description'], '')).trim()),
      tx.pure.string(String(getOption(args, ['content'], '')).trim()),
      tx.pure.string(String(getOption(args, ['version'], '')).trim()),
      tx.pure.string(String(getOption(args, ['schemas'], '')).trim()),
      tx.pure.string(String(getOption(args, ['apis'], '')).trim()),
      tx.pure.string(String(getOption(args, ['resources'], '')).trim()),
      tx.pure.u128(parseU128(getOption(args, ['external-index'], '0'), '--external-index')),
      tx.object(config.clockId),
    ],
  });
}

function buildPublishDataItemTx(tx, args, config) {
  const containerId = requireObjectId(
    getOption(args, ['container-id', 'container'], ''),
    '--container-id'
  );
  const dataTypeId = requireObjectId(
    getOption(args, ['data-type-id', 'data-type'], ''),
    '--data-type-id'
  );
  const name = requireNonEmpty(getOption(args, ['name'], ''), '--name');
  const description = requireNonEmpty(getOption(args, ['description'], ''), '--description');
  const content = requireNonEmpty(getOption(args, ['content'], ''), '--content');
  const recipients = parseAddressList(getOption(args, ['recipients'], ''));
  const references = parseAddressList(getOption(args, ['references', 'reference'], ''));

  tx.moveCall({
    target: moveTarget(config, 'publish_data_item'),
    arguments: [
      tx.object(config.dataItemChainId),
      tx.object(containerId),
      tx.object(dataTypeId),
      tx.pure.string(String(getOption(args, ['external-id'], '')).trim()),
      tx.pure.option('vector<address>', recipients.length > 0 ? recipients : null),
      tx.pure.string(name),
      tx.pure.string(description),
      tx.pure.string(content),
      tx.pure.u128(parseU128(getOption(args, ['external-index'], '0'), '--external-index')),
      tx.pure.option('vector<address>', references.length > 0 ? references : null),
      tx.object(config.clockId),
    ],
  });
}

function buildPublishDataItemVerificationTx(tx, args, config) {
  const containerId = requireObjectId(
    getOption(args, ['container-id', 'container'], ''),
    '--container-id'
  );
  const dataItemId = requireObjectId(
    getOption(args, ['data-item-id', 'data-item'], ''),
    '--data-item-id'
  );
  const name = requireNonEmpty(getOption(args, ['name'], ''), '--name');
  const description = requireNonEmpty(getOption(args, ['description'], ''), '--description');
  const content = requireNonEmpty(getOption(args, ['content'], ''), '--content');
  const recipients = parseAddressList(getOption(args, ['recipients'], ''));
  const references = parseAddressList(getOption(args, ['references', 'reference'], ''));
  const verified = getBoolOption(args, ['verified'], false);

  tx.moveCall({
    target: moveTarget(config, 'publish_data_item_verification'),
    arguments: [
      tx.object(config.updateChainId),
      tx.object(config.dataItemVerificationChainId),
      tx.object(containerId),
      tx.object(dataItemId),
      tx.pure.string(String(getOption(args, ['external-id'], '')).trim()),
      tx.pure.option('vector<address>', recipients.length > 0 ? recipients : null),
      tx.pure.string(name),
      tx.pure.string(description),
      tx.pure.string(content),
      tx.pure.u128(parseU128(getOption(args, ['external-index'], '0'), '--external-index')),
      tx.pure.option('vector<address>', references.length > 0 ? references : null),
      tx.pure.bool(verified),
      tx.object(config.clockId),
    ],
  });
}

function buildAttachChildTx(tx, args, config) {
  const parentId = requireObjectId(getOption(args, ['parent-id', 'parent'], ''), '--parent-id');
  const childId = requireObjectId(getOption(args, ['child-id', 'child'], ''), '--child-id');
  const name = requireNonEmpty(getOption(args, ['name'], ''), '--name');

  tx.moveCall({
    target: moveTarget(config, 'attach_container_child'),
    arguments: [
      tx.object(config.updateChainId),
      tx.object(parentId),
      tx.object(childId),
      tx.pure.string(String(getOption(args, ['external-id'], '')).trim()),
      tx.pure.string(name),
      tx.pure.string(String(getOption(args, ['description'], '')).trim()),
      tx.pure.string(String(getOption(args, ['content'], '')).trim()),
      tx.pure.u128(parseU128(getOption(args, ['external-index'], '0'), '--external-index')),
      tx.object(config.clockId),
    ],
  });
}

function buildUpdateChildLinkTx(tx, args, config) {
  const linkId = requireObjectId(
    getOption(args, ['link-id', 'child-link-id', 'container-child-link-id', 'link'], ''),
    '--link-id'
  );
  const parentId = requireObjectId(getOption(args, ['parent-id', 'parent'], ''), '--parent-id');
  const childId = requireObjectId(getOption(args, ['child-id', 'child'], ''), '--child-id');

  tx.moveCall({
    target: moveTarget(config, 'update_container_child_link'),
    arguments: [
      tx.object(config.updateChainId),
      tx.object(linkId),
      tx.object(parentId),
      tx.object(childId),
      tx.pure.string(String(getOption(args, ['external-id'], '')).trim()),
      tx.pure.string(String(getOption(args, ['name'], '')).trim()),
      tx.pure.string(String(getOption(args, ['description'], '')).trim()),
      tx.pure.string(String(getOption(args, ['content'], '')).trim()),
      tx.pure.u128(parseU128(getOption(args, ['external-index'], '0'), '--external-index')),
      tx.object(config.clockId),
    ],
  });
}

function buildAddOwnerTx(tx, args, config) {
  const containerId = requireObjectId(
    getOption(args, ['container-id', 'container'], ''),
    '--container-id'
  );
  const owner = requireObjectId(getOption(args, ['owner'], ''), '--owner');

  tx.moveCall({
    target: moveTarget(config, 'add_owner'),
    arguments: [
      tx.object(config.updateChainId),
      tx.object(containerId),
      tx.pure.address(owner),
      tx.pure.string(String(getOption(args, ['role'], '')).trim()),
      tx.object(config.clockId),
    ],
  });
}

function buildRemoveOwnerTx(tx, args, config) {
  const containerId = requireObjectId(
    getOption(args, ['container-id', 'container'], ''),
    '--container-id'
  );
  const owner = requireObjectId(getOption(args, ['owner'], ''), '--owner');

  tx.moveCall({
    target: moveTarget(config, 'remove_owner'),
    arguments: [
      tx.object(config.updateChainId),
      tx.object(containerId),
      tx.pure.address(owner),
      tx.object(config.clockId),
    ],
  });
}

function buildRecountOwnersActiveTx(tx, args, config) {
  const containerId = requireObjectId(
    getOption(args, ['container-id', 'container'], ''),
    '--container-id'
  );

  tx.moveCall({
    target: moveTarget(config, 'update_container_owners_active_count'),
    arguments: [
      tx.object(config.updateChainId),
      tx.object(containerId),
    ],
  });
}

async function executeWriteCommand(command, args, logger) {
  loadInputFileData(args, logger);

  const config = resolveMoveConfig(args);
  const tx = new Transaction();

  switch (command) {
    case 'create-container':
      buildCreateContainerTx(tx, args, config);
      break;
    case 'update-container':
      buildUpdateContainerTx(tx, args, config);
      break;
    case 'create-data-type':
      buildCreateDataTypeTx(tx, args, config);
      break;
    case 'update-data-type':
      buildUpdateDataTypeTx(tx, args, config);
      break;
    case 'publish-data-item':
      buildPublishDataItemTx(tx, args, config);
      break;
    case 'publish-data-item-verification':
      buildPublishDataItemVerificationTx(tx, args, config);
      break;
    case 'attach-child':
      buildAttachChildTx(tx, args, config);
      break;
    case 'update-child-link':
      buildUpdateChildLinkTx(tx, args, config);
      break;
    case 'add-owner':
      buildAddOwnerTx(tx, args, config);
      break;
    case 'remove-owner':
      buildRemoveOwnerTx(tx, args, config);
      break;
    case 'recount-owners-active':
      buildRecountOwnersActiveTx(tx, args, config);
      break;
    default:
      throw new Error(`Unsupported write command: ${command}`);
  }

  const signer = resolveSigner(args, logger);
  const sender = signer.toIotaAddress();
  const client = createClient(args.network);

  tx.setSender(sender);
  applyGasBudget(tx, args);

  logger.info('Submitting move transaction', {
    command,
    sender,
    network: args.network,
  });

  const response = await client.signAndExecuteTransaction({
    transaction: tx,
    signer,
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
      showBalanceChanges: true,
    },
  });

  return {
    command,
    sender,
    digest: response.digest,
    effects: response.effects ?? null,
    objectChanges: response.objectChanges ?? null,
    balanceChanges: response.balanceChanges ?? null,
    events: response.events ?? null,
  };
}

export async function runCommand(command, args, logger) {
  loadEnvFiles(args, logger);
  args.network = resolveNetwork(args);
  logger.info('Running command', { command, network: args.network });

  if (WRITE_COMMANDS.has(command)) {
    return executeWriteCommand(command, args, logger);
  }

  const client = createClient(args.network);

  switch (command) {
    case 'object':
      return fetchObject(client, args.id, {
        showOwner: true,
        showPreviousTransaction: true,
      });

    case 'container':
      return fetchObject(client, args.id);

    case 'container-links':
      return walkLinkedList({
        client,
        rootObjectId: args.id,
        startId: args.startId,
        count: args.count,
        defaultHeadField: 'last_container_child_link_id',
        prevField: 'prev_id',
        logger,
      });

    case 'container-types':
      return walkLinkedList({
        client,
        rootObjectId: args.id,
        startId: args.startId,
        count: args.count,
        defaultHeadField: 'last_data_type_id',
        prevField: 'prev_id',
        logger,
      });

    case 'data-type-items':
      return walkLinkedList({
        client,
        rootObjectId: args.id,
        startId: args.startId,
        count: args.count,
        defaultHeadField: 'last_data_item_id',
        prevField: 'prev_data_type_item_id',
        logger,
      });

    case 'data-item-verifications':
      return getDataItemVerifications(client, args.id, args.startId, args.count, logger);

    case 'container-data-item-verifications': {
      const verifications = await walkLinkedList({
        client,
        rootObjectId: args.id,
        startId: args.startId,
        count: args.count,
        defaultHeadField: 'last_data_item_verification_id',
        prevField: 'prev_id',
        logger,
      });
      return groupByDataItemId(verifications);
    }

    default:
      throw new Error(`Unsupported command: ${command}`);
  }
}
