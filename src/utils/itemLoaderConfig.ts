import { APP_INSTANCE_DOMAIN } from '../Config.ts';

export type ItemType =
  | 'container'
  | 'data_type'
  | 'data_item'
  | 'received_data_item'
  | 'data_item_verification'
  | 'received_data_item_verification';

export type ReceivedRecipientScope =
  | 'mine'
  | 'others'
  | 'with_recipients'
  | 'all';

export type ReceivedContainerScope = 'accessible' | 'all';

type SelectionIds = {
  selectedContainerId: string | null;
  selectedDataTypeId: string | null;
  selectedDataItemId: string | null;
  selectedDataItemVerificationId: string | null;
};

type DataItemApiFilters = {
  query?: string;
  searchFields?: string[];
  sortBy?:
    | 'created_desc'
    | 'created_asc'
    | 'name_asc'
    | 'name_desc'
    | 'external_index_desc'
    | 'external_index_asc'
    | 'external_id_asc'
    | 'external_id_desc';
  verified?: 'all' | 'verified' | 'unverified';
  revisions?: 'all' | 'with' | 'without';
  verifications?: 'all' | 'with' | 'without';
  dataType?: string;
};

type DataItemVerificationApiFilters = {
  verified?: 'all' | 'verified' | 'unverified';
};

type BuildItemsQueryParamsInput = {
  userAddress: string;
  page: number;
  pageSize: number;
  type: ItemType;
  include: string;
  effectiveContainerId?: string;
  effectiveDataTypeId?: string;
  effectiveDataItemId?: string;
  dataItemFilters?: DataItemApiFilters;
  dataItemVerificationFilters?: DataItemVerificationApiFilters;
  receivedRecipientScope?: ReceivedRecipientScope;
  receivedContainerScope?: ReceivedContainerScope;
};

export const DEFAULT_INCLUDE_BY_TYPE: Record<ItemType, string> = {
  container: 'CONTAINER',
  data_type: 'CONTAINER,DATA_TYPE',
  data_item: 'CONTAINER,DATA_TYPE,DATA_ITEM,DATA_ITEM_VERIFICATION',
  received_data_item: 'CONTAINER,DATA_TYPE,DATA_ITEM,DATA_ITEM_VERIFICATION',
  data_item_verification: 'CONTAINER,DATA_TYPE,DATA_ITEM,DATA_ITEM_VERIFICATION',
  received_data_item_verification:
    'CONTAINER,DATA_TYPE,DATA_ITEM,DATA_ITEM_VERIFICATION',
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
  received_data_item: [
    'containerName',
    'dataType',
    'name',
    'description',
    'verified',
    'creatorAddr',
    'externalId',
    'externalIndex',
  ],
  data_item_verification: [
    'containerName',
    'dataType',
    'dataItemName',
    'name',
    'description',
    'verified',
    'creatorAddr',
    'externalId',
    'externalIndex',
  ],
  received_data_item_verification: [
    'containerName',
    'dataType',
    'dataItemName',
    'name',
    'description',
    'verified',
    'creatorAddr',
    'recipientCount',
    'externalId',
    'externalIndex',
  ],
};

export const ITEM_LABEL_BY_TYPE: Record<ItemType, string> = {
  container: 'Container',
  data_type: 'Data Type',
  data_item: 'Item',
  received_data_item: 'Received Item',
  data_item_verification: 'Item Verification',
  received_data_item_verification: 'Received Item Verification',
};

export function resolveEffectiveContainerId(
  type: ItemType,
  containerId?: string,
  selectedContainerId?: string | null
): string | undefined {
  if (type === 'container') return containerId;
  if (
    type === 'data_type' ||
    type === 'data_item' ||
    type === 'data_item_verification' ||
    type === 'received_data_item' ||
    type === 'received_data_item_verification'
  ) {
    return containerId ?? selectedContainerId ?? undefined;
  }
  return containerId;
}

export function resolveEffectiveDataTypeId(
  type: ItemType,
  dataTypeId?: string,
  selectedDataTypeId?: string | null
): string | undefined {
  if (
    type === 'data_item' ||
    type === 'received_data_item' ||
    type === 'data_item_verification' ||
    type === 'received_data_item_verification'
  ) {
    return dataTypeId ?? selectedDataTypeId ?? undefined;
  }
  return dataTypeId;
}

export function canLoadItems(
  type: ItemType,
  userAddress?: string,
  effectiveContainerId?: string
): boolean {
  if (!userAddress) return false;
  if (type === 'container') return true;
  if (
    type === 'data_type' ||
    type === 'data_item' ||
    type === 'data_item_verification'
  ) {
    return Boolean(effectiveContainerId);
  }
  return true;
}

export function buildItemsQueryParams({
  userAddress,
  page,
  pageSize,
  type,
  include,
  effectiveContainerId,
  effectiveDataTypeId,
  effectiveDataItemId,
  dataItemFilters,
  dataItemVerificationFilters,
  receivedRecipientScope,
  receivedContainerScope,
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

  if (
    (type === 'data_item' ||
      type === 'received_data_item' ||
      type === 'data_item_verification' ||
      type === 'received_data_item_verification') &&
    effectiveDataTypeId
  ) {
    params.set('dataTypeId', effectiveDataTypeId);
  }

  if (
    (type === 'data_item_verification' ||
      type === 'received_data_item_verification') &&
    effectiveDataItemId
  ) {
    params.set('dataItemId', effectiveDataItemId);
  }

  if ((type === 'data_item' || type === 'received_data_item') && dataItemFilters) {
    const trimmedQuery = dataItemFilters.query?.trim();
    if (trimmedQuery) {
      params.set('dataItemQuery', trimmedQuery);
    }

    const searchFields = (dataItemFilters.searchFields ?? [])
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (searchFields.length > 0) {
      params.set('dataItemSearchFields', searchFields.join(','));
    }

    if (dataItemFilters.verified === 'verified') {
      params.set('dataItemVerified', 'true');
    } else if (dataItemFilters.verified === 'unverified') {
      params.set('dataItemVerified', 'false');
    }

    if (dataItemFilters.revisions === 'with') {
      params.set('dataItemHasRevisions', 'true');
    } else if (dataItemFilters.revisions === 'without') {
      params.set('dataItemHasRevisions', 'false');
    }

    if (dataItemFilters.verifications === 'with') {
      params.set('dataItemHasVerifications', 'true');
    } else if (dataItemFilters.verifications === 'without') {
      params.set('dataItemHasVerifications', 'false');
    }

    const trimmedDataType = dataItemFilters.dataType?.trim();
    if (trimmedDataType && trimmedDataType !== 'all') {
      params.set('dataItemDataType', trimmedDataType);
    }

    const sortBy = dataItemFilters.sortBy ?? 'created_desc';
    switch (sortBy) {
      case 'created_desc':
        params.set('dataItemSortBy', 'created');
        params.set('dataItemSortDirection', 'desc');
        break;
      case 'created_asc':
        params.set('dataItemSortBy', 'created');
        params.set('dataItemSortDirection', 'asc');
        break;
      case 'name_asc':
        params.set('dataItemSortBy', 'name');
        params.set('dataItemSortDirection', 'asc');
        break;
      case 'name_desc':
        params.set('dataItemSortBy', 'name');
        params.set('dataItemSortDirection', 'desc');
        break;
      case 'external_index_asc':
        params.set('dataItemSortBy', 'external_index');
        params.set('dataItemSortDirection', 'asc');
        break;
      case 'external_index_desc':
        params.set('dataItemSortBy', 'external_index');
        params.set('dataItemSortDirection', 'desc');
        break;
      case 'external_id_asc':
        params.set('dataItemSortBy', 'external_id');
        params.set('dataItemSortDirection', 'asc');
        break;
      case 'external_id_desc':
        params.set('dataItemSortBy', 'external_id');
        params.set('dataItemSortDirection', 'desc');
        break;
      default:
        params.set('dataItemSortBy', 'created');
        params.set('dataItemSortDirection', 'desc');
        break;
    }
  }

  if (
    (type === 'data_item_verification' ||
      type === 'received_data_item_verification') &&
    dataItemVerificationFilters
  ) {
    if (dataItemVerificationFilters.verified === 'verified') {
      params.set('dataItemVerificationVerified', 'true');
    } else if (dataItemVerificationFilters.verified === 'unverified') {
      params.set('dataItemVerificationVerified', 'false');
    }
  }

  if (type === 'received_data_item' || type === 'received_data_item_verification') {
    const scope = receivedRecipientScope ?? 'mine';
    if (type === 'received_data_item') {
      params.set('dataItemRecipientScope', scope);
    } else {
      params.set('dataItemVerificationRecipientScope', scope);
    }
    params.set('recipientAddress', userAddress);
    params.set('containerScope', receivedContainerScope ?? 'accessible');
  }

  return params;
}

export function getSelectedIdByType(type: ItemType, ids: SelectionIds): string | null {
  if (type === 'container') return ids.selectedContainerId;
  if (type === 'data_type') return ids.selectedDataTypeId;
  if (
    type === 'data_item_verification' ||
    type === 'received_data_item_verification'
  ) {
    return ids.selectedDataItemVerificationId;
  }
  return ids.selectedDataItemId;
}

export function getResetKey(
  type: ItemType,
  effectiveContainerId?: string,
  effectiveDataTypeId?: string,
  effectiveDataItemId?: string
): string {
  if (type === 'container') return 'containers';
  if (type === 'data_item') {
    return `${effectiveContainerId ?? 'none'}-${effectiveDataTypeId ?? 'all'}`;
  }
  if (type === 'received_data_item') {
    return `${effectiveContainerId ?? 'all'}-${effectiveDataTypeId ?? 'all'}-received`;
  }
  if (type === 'data_item_verification') {
    return `${effectiveContainerId ?? 'all'}-${effectiveDataTypeId ?? 'all'}-${effectiveDataItemId ?? 'all'}-verification`;
  }
  if (type === 'received_data_item_verification') {
    return `${effectiveContainerId ?? 'all'}-${effectiveDataTypeId ?? 'all'}-${effectiveDataItemId ?? 'all'}-received-verification`;
  }
  return effectiveContainerId ?? 'none';
}
