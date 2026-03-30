import { APP_INSTANCE_DOMAIN } from '../Config.ts';

export type ItemType = 'container' | 'data_type' | 'data_item';

type SelectionIds = {
  selectedContainerId: string | null;
  selectedDataTypeId: string | null;
  selectedDataItemId: string | null;
};

type BuildItemsQueryParamsInput = {
  userAddress: string;
  page: number;
  pageSize: number;
  type: ItemType;
  include: string;
  effectiveContainerId?: string;
  effectiveDataTypeId?: string;
};

export const DEFAULT_INCLUDE_BY_TYPE: Record<ItemType, string> = {
  container: 'CONTAINER',
  data_type: 'CONTAINER,DATA_TYPE',
  data_item: 'CONTAINER,DATA_TYPE,DATA_ITEM,DATA_ITEM_VERIFICATION',
};

export const DEFAULT_FIELDS_BY_TYPE: Record<ItemType, string[]> = {
  container: ['name', 'description', 'content', 'verified', 'creatorAddr'],
  data_type: ['name', 'description', 'content', 'verified', 'creatorAddr'],
  data_item: [
    'dataType',
    'name',
    'description',
    'content',
    'verified',
    'creatorAddr',
    'externalId',
    'externalIndex',
  ],
};

export const ITEM_LABEL_BY_TYPE: Record<ItemType, string> = {
  container: 'Container',
  data_type: 'Data Type',
  data_item: 'Item',
};

export function resolveEffectiveContainerId(
  type: ItemType,
  containerId?: string,
  selectedContainerId?: string | null
): string | undefined {
  if (type === 'container') return containerId;
  return containerId ?? selectedContainerId ?? undefined;
}

export function resolveEffectiveDataTypeId(
  dataTypeId?: string,
  selectedDataTypeId?: string | null
): string | undefined {
  return dataTypeId ?? selectedDataTypeId ?? undefined;
}

export function canLoadItems(
  type: ItemType,
  userAddress?: string,
  effectiveContainerId?: string
): boolean {
  if (!userAddress) return false;
  if (type === 'container') return true;
  return Boolean(effectiveContainerId);
}

export function buildItemsQueryParams({
  userAddress,
  page,
  pageSize,
  type,
  include,
  effectiveContainerId,
  effectiveDataTypeId,
}: BuildItemsQueryParamsInput): URLSearchParams {
  const params = new URLSearchParams({
    userAddress,
    page: page.toString(),
    pageSize: pageSize.toString(),
    include,
    domain: APP_INSTANCE_DOMAIN ?? '',
  });

  if (type !== 'container' && effectiveContainerId) {
    params.set('containerId', effectiveContainerId);
  }

  if (effectiveDataTypeId) {
    params.set('dataTypeId', effectiveDataTypeId);
  }

  return params;
}

export function getSelectedIdByType(type: ItemType, ids: SelectionIds): string | null {
  if (type === 'container') return ids.selectedContainerId;
  if (type === 'data_type') return ids.selectedDataTypeId;
  return ids.selectedDataItemId;
}

export function getResetKey(
  type: ItemType,
  effectiveContainerId?: string,
  effectiveDataTypeId?: string
): string {
  if (type === 'container') return 'containers';
  if (type === 'data_item') {
    return `${effectiveContainerId ?? 'none'}-${effectiveDataTypeId ?? 'all'}`;
  }
  return effectiveContainerId ?? 'none';
}
