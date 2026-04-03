import type { Item, ItemRevision } from '../move/types';

const OBJECT_ID_REGEX = /^0x[a-fA-F0-9]{64}$/;

function uniq(values: string[]): string[] {
  return Array.from(new Set(values));
}

function toObjectIdList(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => OBJECT_ID_REGEX.test(part));
  }

  if (Array.isArray(value)) {
    return uniq(value.flatMap((entry) => toObjectIdList(entry)));
  }

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return uniq(
      [
        obj.id,
        obj.object_id,
        obj.dataItemId,
        obj.data_item_id,
        obj.address,
        obj.value,
      ].flatMap((entry) => toObjectIdList(entry))
    );
  }

  return [];
}

function parseContentObject(content: unknown): Record<string, unknown> | null {
  if (!content) return null;

  if (typeof content === 'object') {
    return content as Record<string, unknown>;
  }

  if (typeof content !== 'string') return null;

  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function toVerifiedString(value: unknown): string {
  if (value == null) return '';
  return value ? 'true' : 'false';
}

function normalizeEpochToMs(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value > 1e17) return Math.round(value / 1e6); // nanoseconds
  if (value > 1e14) return Math.round(value / 1e3); // microseconds
  if (value < 1e12) return Math.round(value * 1000); // seconds
  return Math.round(value); // milliseconds
}

function toTimestampMs(value: unknown): number | null {
  if (typeof value === 'number') return normalizeEpochToMs(value);
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return normalizeEpochToMs(Number(trimmed));
  }

  const parsedDate = Date.parse(trimmed);
  if (Number.isNaN(parsedDate)) return null;
  return parsedDate;
}

type CreatedOnChain = {
  createdOnChain: string;
  createdOnChainMs: number | null;
};

function normalizeCreatedOnChain(dataItemNode: any, itemWrapper?: any): CreatedOnChain {
  const candidates: unknown[] = [
    dataItemNode?.createdOnChain,
    dataItemNode?.created_on_chain,
    dataItemNode?.createdOnChainMs,
    dataItemNode?.created_on_chain_ms,
    dataItemNode?.createdAt,
    dataItemNode?.created_at,
    dataItemNode?.createdTimestamp,
    dataItemNode?.created_timestamp,
    dataItemNode?.createdTime,
    dataItemNode?.created_time,
    dataItemNode?.timestamp,
    itemWrapper?.createdOnChain,
    itemWrapper?.created_on_chain,
    itemWrapper?.createdOnChainMs,
    itemWrapper?.created_on_chain_ms,
    itemWrapper?.createdAt,
    itemWrapper?.created_at,
    itemWrapper?.createdTimestamp,
    itemWrapper?.created_timestamp,
    itemWrapper?.createdTime,
    itemWrapper?.created_time,
    itemWrapper?.timestamp,
  ];

  for (const candidate of candidates) {
    const timestampMs = toTimestampMs(candidate);
    if (timestampMs != null) {
      return {
        createdOnChain:
          typeof candidate === 'string'
            ? candidate
            : new Date(timestampMs).toISOString(),
        createdOnChainMs: timestampMs,
      };
    }
  }

  return { createdOnChain: '', createdOnChainMs: null };
}

function normalizeDataItemVerification(verificationNode: any) {
  const raw =
    verificationNode?.dataItemVerification ??
    verificationNode?.verification ??
    verificationNode ??
    {};

  return {
    id: raw.id ?? raw.object_id ?? '',
    containerId: raw.containerId ?? raw.container_id ?? '',
    dataItemId: raw.dataItemId ?? raw.data_item_id ?? '',
    name: raw.name ?? '',
    description: raw.description ?? '',
    content: raw.content ?? '',
    verified: toVerifiedString(raw.verified),
    creatorAddr: raw.creator?.creatorAddr ?? '',
    externalId: raw.externalId ?? raw.external_id ?? '',
    externalIndex: raw.externalIndex ?? raw.external_index ?? '',
  };
}

function normalizeReferenceIds(rawDataItem: any): string[] {
  return uniq(
    [
      rawDataItem?.reference,
      rawDataItem?.references,
      rawDataItem?.referenceIds,
      rawDataItem?.reference_ids,
      rawDataItem?.refs,
    ].flatMap((entry) => toObjectIdList(entry))
  );
}

function extractRevisionSetting(content: unknown): {
  enabled: boolean;
  explicitPreviousIds: string[];
} {
  const contentObj = parseContentObject(content);
  const revisions = (contentObj?.easy_publish as any)?.revisions;

  if (revisions == null) {
    return { enabled: false, explicitPreviousIds: [] };
  }

  if (typeof revisions === 'boolean') {
    return { enabled: revisions, explicitPreviousIds: [] };
  }

  if (typeof revisions === 'string' || Array.isArray(revisions)) {
    return {
      enabled: true,
      explicitPreviousIds: uniq(toObjectIdList(revisions)),
    };
  }

  if (typeof revisions === 'object') {
    const raw = revisions as Record<string, unknown>;
    const explicitPreviousIds = uniq(
      [
        raw.replaces,
        raw.replaced,
        raw.previous,
        raw.previousIds,
        raw.previous_ids,
        raw.previousDataItemIds,
        raw.previous_data_item_ids,
        raw.of,
        raw.items,
      ].flatMap((entry) => toObjectIdList(entry))
    );

    // Keep semantics parallel with publish.targets[*].enabled:
    // object form is opt-in and requires explicit enabled=true.
    const enabled =
      typeof raw.enabled === 'boolean' ? raw.enabled : false;

    return { enabled, explicitPreviousIds };
  }

  return { enabled: false, explicitPreviousIds: [] };
}

function buildItemRevisions(
  content: unknown,
  sameContainerDataItemIds?: ReadonlySet<string>
): ItemRevision[] {
  const revisionSetting = extractRevisionSetting(content);
  if (!revisionSetting.enabled) return [];

  const sameContainerFilteredIds = uniq(revisionSetting.explicitPreviousIds).filter(
    (previousDataItemId) =>
      !sameContainerDataItemIds || sameContainerDataItemIds.has(previousDataItemId)
  );

  return sameContainerFilteredIds.map((previousDataItemId) => ({
    previousDataItemId,
    source: 'revision_setting',
  }));
}

/**
 * Extracts flattened UI records from the nested backend tree structure.
 * Handles different item types (container, data_type, data_item) with type-specific logic.
 *
 * @param tree - The nested tree structure from the API
 * @param type - The type of items to extract
 * @param effectiveContainerId - The selected container ID (for data_type and data_item)
 * @param effectiveDataTypeId - The selected data type ID (for data_item)
 * @returns Array of flattened Item objects for UI display
 */
export function extractItemsFromTree(
  tree: any,
  type: 'container' | 'data_type' | 'data_item',
  effectiveContainerId?: string,
  effectiveDataTypeId?: string
): Item[] {
  if (!tree?.containers) return [];

  if (type === 'container') {
    return tree.containers.map((c: any) => ({
      object_id: c.container.id,
      fields: {
        name: c.container.name,
        description: c.container.description,
        content: c.container.content,
        creatorAddr: c.container.creator?.creatorAddr ?? '',
      },
    }));
  }

  // Find the container node for data_type and data_item
  const containerNode = tree.containers.find(
    (c: any) => c.container.id === effectiveContainerId
  );
  if (!containerNode) return [];

  if (type === 'data_type') {
    return (containerNode.dataTypes ?? []).map((dt: any) => ({
      object_id: dt.dataType.id,
      fields: {
        name: dt.dataType.name,
        description: dt.dataType.description,
        content: dt.dataType.content,
        externalId: dt.dataType.externalId,
        creatorAddr: dt.dataType.creator?.creatorAddr ?? '',
      },
    }));
  }

  if (type === 'data_item') {
    const rows: Item[] = [];
    const sameContainerDataItemIds = new Set<string>();

    (containerNode.dataTypes ?? []).forEach((dt: any) => {
      (dt.dataItems ?? []).forEach((di: any) => {
        const dataItemId = di?.dataItem?.id;
        if (typeof dataItemId === 'string' && OBJECT_ID_REGEX.test(dataItemId)) {
          sameContainerDataItemIds.add(dataItemId);
        }
      });
    });

    (containerNode.dataTypes ?? []).forEach((dt: any) => {
      const dtId = dt.dataType.id;
      // Filter by dataTypeId if specified
      if (effectiveDataTypeId && dtId !== effectiveDataTypeId) return;

      const dataTypeName = dt.dataType.name;

      (dt.dataItems ?? []).forEach((di: any) => {
        const referenceIds = normalizeReferenceIds(di.dataItem);
        const revisions = buildItemRevisions(
          di.dataItem.content,
          sameContainerDataItemIds
        );
        const { createdOnChain, createdOnChainMs } = normalizeCreatedOnChain(
          di.dataItem,
          di
        );

        rows.push({
          object_id: di.dataItem.id,
          fields: {
            dataType: dataTypeName,
            name: di.dataItem.name,
            description: di.dataItem.description,
            content: di.dataItem.content,
            externalId: di.dataItem.externalId,
            containerId: di.dataItem.containerId,
            dataTypeId: di.dataItem.dataTypeId,
            verified: toVerifiedString(di.dataItem.verified),
            creatorAddr: di.dataItem.creator?.creatorAddr ?? '',
            externalIndex: di.dataItem.externalIndex ?? '',
            createdOnChain,
            createdOnChainMs,
            referenceIds,
            revisions,
            dataItemVerifications: Array.isArray(di.dataItemVerifications)
              ? di.dataItemVerifications.map(normalizeDataItemVerification)
              : Array.isArray(di.verifications)
              ? di.verifications.map(normalizeDataItemVerification)
              : Array.isArray(di.data_item_verifications)
              ? di.data_item_verifications.map(normalizeDataItemVerification)
              : [],
          },
        });
      });
    });
    return rows;
  }

  return [];
}

/**
 * Filters out superseded rows (older revisions) for friendly views like Cars mode.
 * Generic mode can still render all rows by skipping this filter.
 */
export function filterSupersededRevisionItems(items: Item[]): Item[] {
  const supersededIds = new Set<string>();

  items.forEach((item) => {
    const revisions = item.fields?.revisions;
    if (!Array.isArray(revisions)) return;

    revisions.forEach((entry: unknown) => {
      const previousId =
        typeof entry === 'string'
          ? entry
          : (entry as Record<string, unknown>)?.previousDataItemId;

      if (
        typeof previousId === 'string' &&
        OBJECT_ID_REGEX.test(previousId) &&
        previousId !== item.object_id
      ) {
        supersededIds.add(previousId);
      }
    });
  });

  return items.filter((item) => !supersededIds.has(item.object_id));
}
