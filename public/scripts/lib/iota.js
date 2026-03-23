import { IotaClient, getFullnodeUrl } from '@iota/iota-sdk/client';

export function createClient(network = 'mainnet') {
  return new IotaClient({ url: getFullnodeUrl(network) });
}

export function flattenStructFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(flattenStructFields);
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && 'fields' in value) {
      result[key] = flattenStructFields(value.fields);
    } else {
      result[key] = flattenStructFields(value);
    }
  }
  return result;
}

export function extractObjectId(value) {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const id = extractObjectId(item);
      if (id) return id;
    }
    return null;
  }

  if (typeof value !== 'object') return null;

  if (typeof value.id === 'string') return value.id;
  if (typeof value.bytes === 'string') return value.bytes;
  if (typeof value.object_id === 'string') return value.object_id;

  if (Array.isArray(value.vec)) {
    if (value.vec.length === 0) return null;
    return extractObjectId(value.vec[0]);
  }

  if ('some' in value) {
    return extractObjectId(value.some);
  }

  if ('value' in value) {
    return extractObjectId(value.value);
  }

  if ('fields' in value) {
    return extractObjectId(value.fields);
  }

  return null;
}

export async function fetchObject(client, objectId, options = {}) {
  if (!objectId) throw new Error('objectId is required');

  const res = await client.getObject({
    id: objectId,
    options: {
      showType: true,
      showContent: true,
      showOwner: Boolean(options.showOwner),
      showPreviousTransaction: Boolean(options.showPreviousTransaction),
    },
  });

  if (!res?.data) {
    throw new Error(`Object ${objectId} not found`);
  }

  return {
    object_id: objectId,
    object_type: res.data.type ?? null,
    owner: options.showOwner ? (res.data.owner ?? null) : undefined,
    previous_transaction: options.showPreviousTransaction ? (res.data.previousTransaction ?? null) : undefined,
    fields: res.data.content?.fields ? flattenStructFields(res.data.content.fields) : null,
  };
}

export async function walkLinkedList({
  client,
  rootObjectId,
  startId,
  count,
  defaultHeadField,
  prevField,
  fetchRootOptions,
  itemFetchOptions,
  logger,
}) {
  if (!rootObjectId) throw new Error('rootObjectId is required');
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error('count must be a positive integer');
  }

  let currentId = startId && startId !== 'null' ? startId : null;

  if (!currentId) {
    logger?.debug?.('Resolving head from root object', { rootObjectId, defaultHeadField });
    const root = await fetchObject(client, rootObjectId, fetchRootOptions);
    currentId = extractObjectId(root.fields?.[defaultHeadField]);
  }

  if (!currentId) {
    logger?.info?.('No linked-list head found', { rootObjectId, defaultHeadField });
    return [];
  }

  const results = [];
  while (currentId && results.length < count) {
    logger?.debug?.('Fetching linked-list item', { currentId, index: results.length });
    const item = await fetchObject(client, currentId, itemFetchOptions);
    results.push(item);
    currentId = extractObjectId(item.fields?.[prevField]);
  }

  logger?.info?.('Linked-list fetch complete', {
    rootObjectId,
    returned: results.length,
    requested: count,
  });

  return results;
}

export function groupByField(items, fieldName, fallback = 'unknown') {
  const grouped = {};
  for (const item of items) {
    const key = item.fields?.[fieldName] ?? fallback;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }
  return grouped;
}
