import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useCurrentAccount } from '@iota/dapp-kit';
import ItemsTable from './ItemsTable';
import type { Item } from '../types';
import { useSelection } from '../../context/SelectionContext';
import { API_BASE } from '../../Config.ts';
import DataItemFilterBar, {
  DEFAULT_DATA_ITEM_FILTER_STATE,
  type DataItemFilterState,
} from './table/DataItemFilterBar.tsx';
import DataItemVerificationFilterBar, {
  DEFAULT_DATA_ITEM_VERIFICATION_FILTER_STATE,
  type DataItemVerificationFilterState,
} from './table/DataItemVerificationFilterBar.tsx';
import EntityFilterBar, {
  DEFAULT_ENTITY_FILTER_STATE,
  filterAndSortEntityItems,
  type EntityFilterState,
} from './table/EntityFilterBar.tsx';
import {
  extractItemsFromTree,
  filterSupersededRevisionItems,
} from '../../utils/dataTransform';
import {
  DEFAULT_FIELDS_BY_TYPE,
  DEFAULT_INCLUDE_BY_TYPE,
  ITEM_LABEL_BY_TYPE,
  buildItemsQueryParams,
  canLoadItems,
  getResetKey,
  getSelectedIdByType,
  resolveEffectiveContainerId,
  resolveEffectiveDataTypeId,
  type ReceivedContainerScope,
  type ReceivedRecipientScope,
  type ItemType,
} from '../../utils/itemLoaderConfig';

interface ItemsLoaderProps {
  type: ItemType;
  containerId?: string;
  dataTypeId?: string;
  dataItemId?: string;
  fieldsToShow?: string[];
  pageSize?: number;
  include?: string;
  enableEntityFilter?: boolean;
}

export function ItemsLoader({
  type,
  containerId,
  dataTypeId,
  dataItemId,
  fieldsToShow,
  pageSize = 20,
  include,
  enableEntityFilter = false,
}: ItemsLoaderProps) {
  const account = useCurrentAccount();
  const {
    selectedContainerId,
    setSelectedContainerId,
    selectedDataTypeId,
    setSelectedDataTypeId,
    selectedDataItemId,
    setSelectedDataItemId,
    selectedDataItemVerificationId,
    setSelectedDataItemVerificationId,
    verificationBrowseDataItemId,
    containerPage,
    setContainerPage,
    dataTypePage,
    setDataTypePage,
    dataItemPage,
    setDataItemPage,
    receivedDataItemPage,
    setReceivedDataItemPage,
    dataItemVerificationPage,
    setDataItemVerificationPage,
    receivedDataItemVerificationPage,
    setReceivedDataItemVerificationPage,
  } = useSelection();

  const [items, setItems] = useState<Item[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestRevisionOnly, setLatestRevisionOnly] = useState(false);
  const [dataItemFilterDraftState, setDataItemFilterDraftState] =
    useState<DataItemFilterState>(DEFAULT_DATA_ITEM_FILTER_STATE);
  const [dataItemFilterAppliedState, setDataItemFilterAppliedState] =
    useState<DataItemFilterState>(DEFAULT_DATA_ITEM_FILTER_STATE);
  const [entityFilterDraftState, setEntityFilterDraftState] =
    useState<EntityFilterState>(DEFAULT_ENTITY_FILTER_STATE);
  const [entityFilterAppliedState, setEntityFilterAppliedState] =
    useState<EntityFilterState>(DEFAULT_ENTITY_FILTER_STATE);
  const [receivedRecipientScope, setReceivedRecipientScope] =
    useState<ReceivedRecipientScope>('mine');
  const [receivedContainerScope, setReceivedContainerScope] =
    useState<ReceivedContainerScope>('accessible');
  const [hideRespondedReceivedItems, setHideRespondedReceivedItems] =
    useState(true);
  const [dataItemVerificationFilterState, setDataItemVerificationFilterState] =
    useState<DataItemVerificationFilterState>(
      DEFAULT_DATA_ITEM_VERIFICATION_FILTER_STATE
    );
  const [dataItemTotalCount, setDataItemTotalCount] = useState<number | null>(null);
  const [availableDataTypesFromMeta, setAvailableDataTypesFromMeta] = useState<string[]>([]);
  const requestSequenceRef = useRef(0);

  const page =
    type === 'container'
      ? containerPage
      : type === 'data_type'
      ? dataTypePage
      : type === 'data_item'
      ? dataItemPage
      : type === 'received_data_item'
      ? receivedDataItemPage
      : type === 'data_item_verification'
      ? dataItemVerificationPage
      : receivedDataItemVerificationPage;

  const setPage =
    type === 'container'
      ? setContainerPage
      : type === 'data_type'
      ? setDataTypePage
      : type === 'data_item'
      ? setDataItemPage
      : type === 'received_data_item'
      ? setReceivedDataItemPage
      : type === 'data_item_verification'
      ? setDataItemVerificationPage
      : setReceivedDataItemVerificationPage;

  const effectiveInclude = include ?? DEFAULT_INCLUDE_BY_TYPE[type];
  const effectiveContainerId = resolveEffectiveContainerId(
    type,
    containerId,
    selectedContainerId
  );
  const effectiveDataTypeId = resolveEffectiveDataTypeId(
    type,
    dataTypeId,
    selectedDataTypeId
  );
  const canLoad = canLoadItems(type, account?.address, effectiveContainerId);

  useEffect(() => {
    if (
      type !== 'data_item_verification' &&
      type !== 'received_data_item_verification'
    ) {
      return;
    }
    const externalDataItemId =
      dataItemId ?? verificationBrowseDataItemId ?? '';
    if (!externalDataItemId) return;
    setDataItemVerificationFilterState((prev) =>
      prev.dataItemId === externalDataItemId
        ? prev
        : { ...prev, dataItemId: externalDataItemId }
    );
  }, [dataItemId, type, verificationBrowseDataItemId]);

  const effectiveDataItemId = useMemo(() => {
    if (
      type !== 'data_item_verification' &&
      type !== 'received_data_item_verification'
    ) {
      return undefined;
    }
    const trimmed = dataItemVerificationFilterState.dataItemId.trim();
    return trimmed || undefined;
  }, [dataItemVerificationFilterState.dataItemId, type]);

  const loadItems = useCallback(async () => {
    const requestSequence = ++requestSequenceRef.current;

    if (!canLoad || !account?.address) {
      if (requestSequence !== requestSequenceRef.current) return;
      setItems([]);
      setHasNextPage(false);
      setTotalPages(null);
      setDataItemTotalCount(null);
      setAvailableDataTypesFromMeta([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = buildItemsQueryParams({
        userAddress: account.address,
        page,
        pageSize,
        type,
        include: effectiveInclude,
        effectiveContainerId,
        effectiveDataTypeId,
        effectiveDataItemId,
        dataItemFilters:
          type === 'data_item' || type === 'received_data_item'
            ? dataItemFilterAppliedState
            : undefined,
        dataItemVerificationFilters:
          type === 'data_item_verification' ||
          type === 'received_data_item_verification'
            ? {
                verified: dataItemVerificationFilterState.verified,
              }
            : undefined,
        receivedRecipientScope:
          type === 'received_data_item' ||
          type === 'received_data_item_verification'
            ? receivedRecipientScope
            : undefined,
        receivedContainerScope:
          type === 'received_data_item' ||
          type === 'received_data_item_verification'
            ? receivedContainerScope
            : undefined,
      });

      const res = await fetch(`${API_BASE}api/items?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const tree = await res.json();
      const meta = tree?.meta;
      const nextFromMeta =
        typeof meta?.hasNext === 'boolean' ? meta.hasNext : null;
      const totalPagesFromMeta =
        typeof meta?.totalPages === 'number' ? meta.totalPages : null;
      const totalDataItemsFromMeta =
        typeof meta?.totalDataItems === 'number' ? meta.totalDataItems : null;
      const availableDataTypesFromResponse = Array.isArray(meta?.availableDataTypes)
        ? meta.availableDataTypes
            .filter((entry: unknown): entry is string => typeof entry === 'string')
            .map((entry: string) => entry.trim())
            .filter(Boolean)
        : [];

      const extracted = extractItemsFromTree(
        tree,
        type,
        effectiveContainerId,
        effectiveDataTypeId,
        effectiveDataItemId
      );

      if (requestSequence !== requestSequenceRef.current) return;
      setHasNextPage(nextFromMeta ?? extracted.length >= pageSize);
      setTotalPages(totalPagesFromMeta);
      setDataItemTotalCount(
        type === 'data_item' || type === 'received_data_item'
          ? totalDataItemsFromMeta
          : null
      );
      setAvailableDataTypesFromMeta(
        type === 'data_item' || type === 'received_data_item'
          ? availableDataTypesFromResponse
          : []
      );
      setItems(extracted);
    } catch (err: unknown) {
      if (requestSequence !== requestSequenceRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to load';
      setError(message);
      setItems([]);
      setHasNextPage(false);
      setTotalPages(null);
      setDataItemTotalCount(null);
      setAvailableDataTypesFromMeta([]);
    } finally {
      if (requestSequence === requestSequenceRef.current) {
        setLoading(false);
      }
    }
  }, [
    canLoad,
    account?.address,
    page,
    pageSize,
    type,
    effectiveInclude,
    effectiveContainerId,
    effectiveDataTypeId,
    effectiveDataItemId,
    dataItemFilterAppliedState,
    dataItemVerificationFilterState.verified,
    receivedRecipientScope,
    receivedContainerScope,
  ]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (type === 'data_type') setDataTypePage(0);
    if (type === 'data_item') setDataItemPage(0);
    if (type === 'received_data_item') setReceivedDataItemPage(0);
    if (type === 'data_item_verification') setDataItemVerificationPage(0);
    if (type === 'received_data_item_verification') {
      setReceivedDataItemVerificationPage(0);
    }
  }, [
    effectiveContainerId,
    type,
    setDataTypePage,
    setDataItemPage,
    setReceivedDataItemPage,
    setDataItemVerificationPage,
    setReceivedDataItemVerificationPage,
  ]);

  useEffect(() => {
    if (type === 'data_item') setDataItemPage(0);
    if (type === 'received_data_item') setReceivedDataItemPage(0);
    if (type === 'data_item_verification') setDataItemVerificationPage(0);
    if (type === 'received_data_item_verification') {
      setReceivedDataItemVerificationPage(0);
    }
  }, [
    effectiveDataTypeId,
    type,
    setDataItemPage,
    setReceivedDataItemPage,
    setDataItemVerificationPage,
    setReceivedDataItemVerificationPage,
  ]);

  useEffect(() => {
    if (type === 'data_item_verification') {
      setDataItemVerificationPage(0);
      return;
    }
    if (type === 'received_data_item_verification') {
      setReceivedDataItemVerificationPage(0);
    }
  }, [
    effectiveDataItemId,
    type,
    setDataItemVerificationPage,
    setReceivedDataItemVerificationPage,
  ]);

  useEffect(() => {
    if (type !== 'data_item' && type !== 'received_data_item') return;
    setDataItemFilterDraftState(DEFAULT_DATA_ITEM_FILTER_STATE);
    setDataItemFilterAppliedState(DEFAULT_DATA_ITEM_FILTER_STATE);
  }, [type, effectiveContainerId, effectiveDataTypeId]);

  useEffect(() => {
    if (type !== 'container' && type !== 'data_type') return;
    setEntityFilterDraftState(DEFAULT_ENTITY_FILTER_STATE);
    setEntityFilterAppliedState(DEFAULT_ENTITY_FILTER_STATE);
  }, [type, effectiveContainerId]);

  useEffect(() => {
    if (
      type !== 'data_item_verification' &&
      type !== 'received_data_item_verification'
    ) {
      return;
    }
    setDataItemVerificationFilterState((prev) => ({
      ...DEFAULT_DATA_ITEM_VERIFICATION_FILTER_STATE,
      dataItemId: prev.dataItemId,
    }));
  }, [type, effectiveContainerId, effectiveDataTypeId]);

  useEffect(() => {
    if (type === 'received_data_item') {
      setReceivedDataItemPage(0);
      return;
    }
    if (type === 'received_data_item_verification') {
      setReceivedDataItemVerificationPage(0);
    }
  }, [
    receivedRecipientScope,
    receivedContainerScope,
    type,
    setReceivedDataItemPage,
    setReceivedDataItemVerificationPage,
  ]);

  // Keep the data-type sidebar stable when switching containers:
  // clear old rows immediately so stale rows do not flash.
  useEffect(() => {
    if (type !== 'data_type') return;
    setItems([]);
    setHasNextPage(false);
    setTotalPages(null);
    setDataItemTotalCount(null);
    setAvailableDataTypesFromMeta([]);
    setError(null);
  }, [type, effectiveContainerId]);

  const handleSelect = (itemId: string) => {
    switch (type) {
      case 'container':
        setSelectedContainerId((prev) => (prev === itemId ? null : itemId));
        setSelectedDataTypeId(null);
        setSelectedDataItemId(null);
        setSelectedDataItemVerificationId(null);
        setDataTypePage(0);
        setDataItemPage(0);
        setReceivedDataItemPage(0);
        setDataItemVerificationPage(0);
        setReceivedDataItemVerificationPage(0);
        break;

      case 'data_type':
        setSelectedDataTypeId((prev) => (prev === itemId ? null : itemId));
        setSelectedDataItemId(null);
        setSelectedDataItemVerificationId(null);
        setDataItemPage(0);
        setReceivedDataItemPage(0);
        setDataItemVerificationPage(0);
        setReceivedDataItemVerificationPage(0);
        break;

      case 'data_item':
      case 'received_data_item': {
        setSelectedDataItemId((prev) => (prev === itemId ? null : itemId));
        setSelectedDataItemVerificationId(null);
        const selectedItem = items.find((candidate) => candidate.object_id === itemId);
        const selectedTypeId = selectedItem?.fields.dataTypeId;
        const selectedParentContainerId = selectedItem?.fields.containerId;
        if (typeof selectedTypeId === 'string' && selectedTypeId) {
          setSelectedDataTypeId(selectedTypeId);
        }
        if (
          typeof selectedParentContainerId === 'string' &&
          selectedParentContainerId
        ) {
          setSelectedContainerId(selectedParentContainerId);
        }
        break;
      }

      case 'data_item_verification':
      case 'received_data_item_verification': {
        setSelectedDataItemVerificationId((prev) =>
          prev === itemId ? null : itemId
        );
        const selectedVerification = items.find(
          (candidate) => candidate.object_id === itemId
        );
        const linkedDataItemId = selectedVerification?.fields.dataItemId;
        const linkedDataTypeId = selectedVerification?.fields.dataTypeId;
        const linkedContainerId = selectedVerification?.fields.containerId;

        if (typeof linkedDataItemId === 'string') {
          setSelectedDataItemId((prev) =>
            prev === linkedDataItemId ? null : linkedDataItemId
          );
        }
        if (typeof linkedDataTypeId === 'string' && linkedDataTypeId) {
          setSelectedDataTypeId(linkedDataTypeId);
        }
        if (typeof linkedContainerId === 'string' && linkedContainerId) {
          setSelectedContainerId(linkedContainerId);
        }
        break;
      }
    }
  };

  const selectedId = getSelectedIdByType(type, {
    selectedContainerId,
    selectedDataTypeId,
    selectedDataItemId,
    selectedDataItemVerificationId,
  });

  const effectiveFields = fieldsToShow ?? DEFAULT_FIELDS_BY_TYPE[type];
  const baseVisibleItems = useMemo(
    () =>
      (type === 'data_item' || type === 'received_data_item') &&
      latestRevisionOnly
        ? filterSupersededRevisionItems(items)
        : items,
    [items, latestRevisionOnly, type]
  );

  const availableDataTypes = useMemo(() => {
    if (
      type === 'data_item' ||
      type === 'received_data_item'
    ) {
      if (availableDataTypesFromMeta.length > 0) {
        return Array.from(new Set(availableDataTypesFromMeta)).sort(
          (left, right) =>
            left.localeCompare(right, undefined, {
              sensitivity: 'base',
              numeric: true,
            })
        );
      }
    }

    if (
      type === 'data_item' ||
      type === 'received_data_item' ||
      type === 'data_item_verification' ||
      type === 'received_data_item_verification'
    ) {
      return Array.from(
        new Set(
          baseVisibleItems
            .map((item) => {
              const dataTypeName = item.fields?.dataType;
              return typeof dataTypeName === 'string' ? dataTypeName : '';
            })
            .filter(Boolean)
        )
      ).sort((left, right) =>
        left.localeCompare(right, undefined, {
          sensitivity: 'base',
          numeric: true,
        })
      );
    }

    return [];
  }, [availableDataTypesFromMeta, baseVisibleItems, type]);

  useEffect(() => {
    if (type !== 'data_item' && type !== 'received_data_item') return;
    setDataItemFilterDraftState((prev) =>
      prev.dataType === 'all' || availableDataTypes.includes(prev.dataType)
        ? prev
        : { ...prev, dataType: 'all' }
    );
    setDataItemFilterAppliedState((prev) =>
      prev.dataType === 'all' || availableDataTypes.includes(prev.dataType)
        ? prev
        : { ...prev, dataType: 'all' }
    );
  }, [availableDataTypes, type]);

  useEffect(() => {
    if (
      type !== 'data_item_verification' &&
      type !== 'received_data_item_verification'
    ) {
      return;
    }
    setDataItemVerificationFilterState((prev) =>
      prev.dataType === 'all' || availableDataTypes.includes(prev.dataType)
        ? prev
        : { ...prev, dataType: 'all' }
    );
  }, [availableDataTypes, type]);

  const receivedRowsFilteredByRecipientScope = useMemo(() => {
    if (
      type !== 'received_data_item' &&
      type !== 'received_data_item_verification'
    ) {
      return baseVisibleItems;
    }
    const accountAddress = account?.address ?? '';

    return baseVisibleItems.filter((item) =>
      matchesReceivedRecipientScope(item, receivedRecipientScope, accountAddress)
    );
  }, [account?.address, baseVisibleItems, receivedRecipientScope, type]);

  const receivedRowsFilteredByResponseState = useMemo(() => {
    if (type !== 'received_data_item') {
      return receivedRowsFilteredByRecipientScope;
    }
    if (!hideRespondedReceivedItems) {
      return receivedRowsFilteredByRecipientScope;
    }

    const normalizedAccountAddress = normalizeText(account?.address);
    if (!normalizedAccountAddress) {
      return receivedRowsFilteredByRecipientScope;
    }

    return receivedRowsFilteredByRecipientScope.filter(
      (item) => !hasVerificationByAddress(item, normalizedAccountAddress)
    );
  }, [
    account?.address,
    hideRespondedReceivedItems,
    receivedRowsFilteredByRecipientScope,
    type,
  ]);

  const verificationItemsFiltered = useMemo(() => {
    if (
      type !== 'data_item_verification' &&
      type !== 'received_data_item_verification'
    ) {
      return baseVisibleItems;
    }
    const verificationSourceItems =
      type === 'received_data_item_verification'
        ? receivedRowsFilteredByRecipientScope
        : baseVisibleItems;

    const queryTokens = normalizeText(dataItemVerificationFilterState.query)
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);
    const targetDataType = normalizeText(dataItemVerificationFilterState.dataType);
    const targetDataItemId = normalizeText(
      dataItemVerificationFilterState.dataItemId
    );

    return verificationSourceItems.filter((item) => {
      const itemVerified = normalizeVerifiedString(item.fields?.verified);
      if (
        dataItemVerificationFilterState.verified === 'verified' &&
        itemVerified !== 'true'
      ) {
        return false;
      }
      if (
        dataItemVerificationFilterState.verified === 'unverified' &&
        itemVerified !== 'false'
      ) {
        return false;
      }

      if (targetDataType && targetDataType !== 'all') {
        const itemType = normalizeText(item.fields?.dataType);
        if (itemType !== targetDataType) return false;
      }

      if (targetDataItemId) {
        const itemDataItemId = normalizeText(item.fields?.dataItemId);
        if (!itemDataItemId.includes(targetDataItemId)) return false;
      }

      if (queryTokens.length === 0) return true;

      const searchValues = [
        item.object_id,
        item.fields?.name,
        item.fields?.description,
        item.fields?.content,
        item.fields?.creatorAddr,
        item.fields?.dataType,
        item.fields?.dataItemId,
        item.fields?.dataItemName,
        item.fields?.containerName,
        (item.fields?.recipients as unknown[] | undefined)?.join(','),
      ].map((value) => normalizeText(value));

      return queryTokens.every((token) =>
        searchValues.some((value) => value.includes(token))
      );
    });
  }, [
    baseVisibleItems,
    dataItemVerificationFilterState,
    receivedRowsFilteredByRecipientScope,
    type,
  ]);

  const entityItemsFiltered = useMemo(() => {
    if (type !== 'container' && type !== 'data_type') return baseVisibleItems;
    if (!enableEntityFilter) return baseVisibleItems;
    return filterAndSortEntityItems(baseVisibleItems, entityFilterAppliedState);
  }, [
    baseVisibleItems,
    enableEntityFilter,
    entityFilterAppliedState,
    type,
  ]);

  const visibleItems =
    type === 'container' || type === 'data_type'
      ? entityItemsFiltered
      : type === 'received_data_item'
      ? receivedRowsFilteredByResponseState
      : type === 'data_item_verification' ||
        type === 'received_data_item_verification'
      ? verificationItemsFiltered
      : baseVisibleItems;

  const handleDataItemFilterChange = useCallback(
    (next: DataItemFilterState) => {
      setDataItemFilterDraftState(next);
    },
    []
  );

  const handleDataItemFilterSubmit = useCallback(() => {
    setDataItemFilterAppliedState(dataItemFilterDraftState);
    if (type === 'data_item') setDataItemPage(0);
    if (type === 'received_data_item') setReceivedDataItemPage(0);
  }, [
    dataItemFilterDraftState,
    type,
    setDataItemPage,
    setReceivedDataItemPage,
  ]);

  const handleEntityFilterChange = useCallback((next: EntityFilterState) => {
    setEntityFilterDraftState(next);
  }, []);

  const handleEntityFilterSubmit = useCallback(() => {
    setEntityFilterAppliedState(entityFilterDraftState);
    if (type === 'container') setContainerPage(0);
    if (type === 'data_type') setDataTypePage(0);
  }, [
    entityFilterDraftState,
    setContainerPage,
    setDataTypePage,
    type,
  ]);

  const dataItemVisibleCount = visibleItems.length;
  const dataItemTotalVisibleBase =
    type === 'received_data_item'
      ? baseVisibleItems.length
      : latestRevisionOnly || dataItemTotalCount == null
      ? dataItemVisibleCount
      : dataItemTotalCount;

  const filterBar =
    (type === 'container' || type === 'data_type') && enableEntityFilter ? (
      <EntityFilterBar
        state={entityFilterDraftState}
        onChange={handleEntityFilterChange}
        onSubmit={handleEntityFilterSubmit}
        applyDisabled={areEntityFiltersEqual(
          entityFilterDraftState,
          entityFilterAppliedState
        )}
        totalCount={baseVisibleItems.length}
        visibleCount={visibleItems.length}
      />
    ) : type === 'data_item' || type === 'received_data_item' ? (
      <>
        {type === 'received_data_item' ? (
          <div className="bp-data-item-filter bp-data-item-filter-condensed">
            <div className="bp-data-item-filter-primary">
              <label className="bp-data-item-filter-control">
                <span className="bp-data-item-filter-label">Recipient Scope</span>
                <select
                  value={receivedRecipientScope}
                  onChange={(event) =>
                    setReceivedRecipientScope(
                      event.target.value as ReceivedRecipientScope
                    )
                  }
                >
                  <option value="mine">Received by me</option>
                  <option value="others">Received by others</option>
                  <option value="with_recipients">Any with recipients</option>
                  <option value="all">All items</option>
                </select>
              </label>
              <label className="bp-data-item-filter-control">
                <span className="bp-data-item-filter-label">Container Scope</span>
                <select
                  value={receivedContainerScope}
                  onChange={(event) =>
                    setReceivedContainerScope(
                      event.target.value as ReceivedContainerScope
                    )
                  }
                >
                  <option value="accessible">Followed + owned containers</option>
                  <option value="all">
                    All containers (including non-followed)
                  </option>
                </select>
              </label>
              <label className="bp-data-item-filter-checkbox">
                <input
                  type="checkbox"
                  checked={hideRespondedReceivedItems}
                  onChange={(event) =>
                    setHideRespondedReceivedItems(event.target.checked)
                  }
                />
                <span>Hide items already verified by me</span>
              </label>
              <div className="bp-data-item-filter-count" aria-live="polite">
                Showing {receivedRowsFilteredByRecipientScope.length} / {baseVisibleItems.length}{' '}
                after recipient scope
              </div>
              {hideRespondedReceivedItems ? (
                <div className="bp-data-item-filter-count" aria-live="polite">
                  Showing {receivedRowsFilteredByResponseState.length} /{' '}
                  {receivedRowsFilteredByRecipientScope.length} after verification
                  response filter
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <DataItemFilterBar
          state={dataItemFilterDraftState}
          onChange={handleDataItemFilterChange}
          onSubmit={handleDataItemFilterSubmit}
          applyDisabled={areDataItemFiltersEqual(
            dataItemFilterDraftState,
            dataItemFilterAppliedState
          )}
          availableDataTypes={availableDataTypes}
          totalCount={dataItemTotalVisibleBase}
          visibleCount={dataItemVisibleCount}
        />
      </>
    ) : type === 'data_item_verification' ||
      type === 'received_data_item_verification' ? (
      <>
        {type === 'received_data_item_verification' ? (
          <div className="bp-data-item-filter bp-data-item-filter-condensed">
            <div className="bp-data-item-filter-primary">
              <label className="bp-data-item-filter-control">
                <span className="bp-data-item-filter-label">Recipient Scope</span>
                <select
                  value={receivedRecipientScope}
                  onChange={(event) =>
                    setReceivedRecipientScope(
                      event.target.value as ReceivedRecipientScope
                    )
                  }
                >
                  <option value="mine">Received by me</option>
                  <option value="others">Received by others</option>
                  <option value="with_recipients">Any with recipients</option>
                  <option value="all">All verifications</option>
                </select>
              </label>
              <label className="bp-data-item-filter-control">
                <span className="bp-data-item-filter-label">Container Scope</span>
                <select
                  value={receivedContainerScope}
                  onChange={(event) =>
                    setReceivedContainerScope(
                      event.target.value as ReceivedContainerScope
                    )
                  }
                >
                  <option value="accessible">Followed + owned containers</option>
                  <option value="all">
                    All containers (including non-followed)
                  </option>
                </select>
              </label>
              <div className="bp-data-item-filter-count" aria-live="polite">
                Showing {receivedRowsFilteredByRecipientScope.length} / {baseVisibleItems.length}{' '}
                after recipient scope
              </div>
            </div>
          </div>
        ) : null}
        <DataItemVerificationFilterBar
          state={dataItemVerificationFilterState}
          onChange={(next) => setDataItemVerificationFilterState(next)}
          availableDataTypes={availableDataTypes}
          totalCount={baseVisibleItems.length}
          visibleCount={visibleItems.length}
        />
      </>
    ) : undefined;

  const hideObjectIdInCompactSelection =
    (type === 'container' || type === 'data_type') &&
    effectiveFields.length === 1 &&
    effectiveFields[0] === 'name';

  return (
    <div className="bp-items-loader">
      {loading && items.length === 0 && <div>Loading…</div>}

      <ItemsTable
        items={visibleItems}
        page={page}
        onPageChange={setPage}
        selectedId={selectedId ?? undefined}
        onSelect={handleSelect}
        disableSelect={false}
        fieldsToShow={effectiveFields}
        label={ITEM_LABEL_BY_TYPE[type]}
        resetKey={getResetKey(
          type,
          effectiveContainerId,
          effectiveDataTypeId,
          effectiveDataItemId
        )}
        pageSize={pageSize}
        hasNextPage={hasNextPage}
        totalPages={totalPages}
        showObjectIdColumn={!hideObjectIdInCompactSelection}
        latestRevisionOnly={latestRevisionOnly}
        onToggleLatestRevisionOnly={
          type === 'data_item' || type === 'received_data_item'
            ? () => setLatestRevisionOnly((prev) => !prev)
            : undefined
        }
        enableDetailToggle={
          type === 'data_item' || type === 'received_data_item'
        }
        filterBar={filterBar}
      />

      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}

function normalizeText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value).trim().toLowerCase();
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return '';
}

function normalizeVerifiedString(value: unknown): 'true' | 'false' | '' {
  const normalized = normalizeText(value);
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return 'true';
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return 'false';
  }
  return '';
}

function hasVerificationByAddress(item: Item, normalizedAddress: string): boolean {
  if (!normalizedAddress) return false;

  const candidateCollections = [
    item.fields?.dataItemVerifications,
    item.fields?.verifications,
    item.fields?.data_item_verifications,
  ];

  for (const collection of candidateCollections) {
    if (!Array.isArray(collection)) continue;
    for (const entry of collection) {
      if (!entry || typeof entry !== 'object') continue;
      const verification = entry as Record<string, unknown>;
      const creatorCandidate =
        verification.creatorAddr ??
        verification.creator_addr ??
        (verification.creator as Record<string, unknown> | undefined)?.creatorAddr ??
        (verification.creator as Record<string, unknown> | undefined)?.creator_addr;
      if (normalizeText(creatorCandidate) === normalizedAddress) {
        return true;
      }
    }
  }

  return false;
}

function getRecipients(item: Item): string[] {
  const raw = item.fields?.recipients;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
    .filter(Boolean);
}

function matchesReceivedRecipientScope(
  item: Item,
  scope: ReceivedRecipientScope,
  accountAddress: string
): boolean {
  if (scope === 'all') return true;

  const recipients = getRecipients(item);
  const hasRecipients = recipients.length > 0;
  if (!hasRecipients) return false;

  if (scope === 'with_recipients') return true;

  const normalizedAccountAddress = accountAddress.trim().toLowerCase();
  const isMine =
    normalizedAccountAddress.length > 0 &&
    recipients.includes(normalizedAccountAddress);

  if (scope === 'mine') return isMine;
  if (scope === 'others') return !isMine;
  return true;
}

function areDataItemFiltersEqual(
  left: DataItemFilterState,
  right: DataItemFilterState
): boolean {
  return (
    left.query === right.query &&
    left.sortBy === right.sortBy &&
    left.verified === right.verified &&
    left.revisions === right.revisions &&
    left.verifications === right.verifications &&
    left.dataType === right.dataType &&
    left.searchFields.length === right.searchFields.length &&
    left.searchFields.every((entry, index) => entry === right.searchFields[index])
  );
}

function areEntityFiltersEqual(
  left: EntityFilterState,
  right: EntityFilterState
): boolean {
  return (
    left.query === right.query &&
    left.sortBy === right.sortBy &&
    left.verified === right.verified &&
    left.searchFields.length === right.searchFields.length &&
    left.searchFields.every((entry, index) => entry === right.searchFields[index])
  );
}
