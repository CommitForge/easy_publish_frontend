// File: ItemsLoader.tsx
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
  type ItemType,
} from '../../utils/itemLoaderConfig';

interface ItemsLoaderProps {
  /** Type of items to load: container, data_type, or data_item */
  type: ItemType;
  /** Optional container ID to filter by */
  containerId?: string;
  /** Optional data type ID to filter by */
  dataTypeId?: string;
  /** Fields to display in the table */
  fieldsToShow?: string[];
  /** Number of items per page */
  pageSize?: number;
  /** Include parameter for API call */
  include?: string;
}

export function ItemsLoader({
  type,
  containerId,
  dataTypeId,
  fieldsToShow,
  pageSize = 20,
  include,
}: ItemsLoaderProps) {
  const account = useCurrentAccount();
  const {
    selectedContainerId,
    setSelectedContainerId,
    selectedDataTypeId,
    setSelectedDataTypeId,
    selectedDataItemId,
    setSelectedDataItemId,
    containerPage,
    setContainerPage,
    dataTypePage,
    setDataTypePage,
    dataItemPage,
    setDataItemPage,
  } = useSelection();

  const page =
    type === 'container'
      ? containerPage
      : type === 'data_type'
      ? dataTypePage
      : dataItemPage;

  const setPage =
    type === 'container'
      ? setContainerPage
      : type === 'data_type'
      ? setDataTypePage
      : setDataItemPage;

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
  const [dataItemTotalCount, setDataItemTotalCount] = useState<number | null>(null);
  const [availableDataTypesFromMeta, setAvailableDataTypesFromMeta] = useState<string[]>([]);
  const requestSequenceRef = useRef(0);

  const canLoad = canLoadItems(type, account?.address, effectiveContainerId);

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
        dataItemFilters: type === 'data_item' ? dataItemFilterAppliedState : undefined,
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
        effectiveDataTypeId
      );
      if (requestSequence !== requestSequenceRef.current) return;
      setHasNextPage(nextFromMeta ?? extracted.length >= pageSize);
      setTotalPages(totalPagesFromMeta);
      setDataItemTotalCount(type === 'data_item' ? totalDataItemsFromMeta : null);
      setAvailableDataTypesFromMeta(
        type === 'data_item' ? availableDataTypesFromResponse : []
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
    effectiveContainerId,
    effectiveDataTypeId,
    effectiveInclude,
    dataItemFilterAppliedState,
    type,
  ]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (type === 'data_type') setDataTypePage(0);
    if (type === 'data_item') setDataItemPage(0);
  }, [effectiveContainerId, type, setDataTypePage, setDataItemPage]);

  useEffect(() => {
    if (type === 'data_item') setDataItemPage(0);
  }, [effectiveDataTypeId, type, setDataItemPage]);

  useEffect(() => {
    if (type !== 'data_item') return;
    setDataItemFilterDraftState(DEFAULT_DATA_ITEM_FILTER_STATE);
    setDataItemFilterAppliedState(DEFAULT_DATA_ITEM_FILTER_STATE);
  }, [type, effectiveContainerId, effectiveDataTypeId]);

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
        setDataTypePage(0);
        setDataItemPage(0);
        break;

      case 'data_type':
        setSelectedDataTypeId((prev) => (prev === itemId ? null : itemId));
        setSelectedDataItemId(null);
        setDataItemPage(0);
        break;

      case 'data_item': {
        setSelectedDataItemId((prev) => (prev === itemId ? null : itemId));
        const selectedItem = items.find((candidate) => candidate.object_id === itemId);
        const selectedTypeId = selectedItem?.fields.dataTypeId;
        if (typeof selectedTypeId === 'string' && selectedTypeId) {
          setSelectedDataTypeId(selectedTypeId);
        }
        break;
      }
    }
  };

  const selectedId = getSelectedIdByType(type, {
    selectedContainerId,
    selectedDataTypeId,
    selectedDataItemId,
  });

  const effectiveFields = fieldsToShow ?? DEFAULT_FIELDS_BY_TYPE[type];
  const baseVisibleItems = useMemo(
    () =>
      type === 'data_item' && latestRevisionOnly
        ? filterSupersededRevisionItems(items)
        : items,
    [items, latestRevisionOnly, type]
  );

  const availableDataTypes = useMemo(() => {
    if (type !== 'data_item') return [];

    if (availableDataTypesFromMeta.length > 0) {
      return Array.from(new Set(availableDataTypesFromMeta)).sort((left, right) =>
        left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true })
      );
    }

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
      left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true })
    );
  }, [availableDataTypesFromMeta, baseVisibleItems, type]);

  useEffect(() => {
    if (type !== 'data_item') return;
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

  const visibleItems = baseVisibleItems;

  const handleDataItemFilterChange = useCallback(
    (next: DataItemFilterState) => {
      setDataItemFilterDraftState(next);
    },
    []
  );

  const handleDataItemFilterSubmit = useCallback(() => {
    setDataItemFilterAppliedState(dataItemFilterDraftState);
    setDataItemPage(0);
  }, [dataItemFilterDraftState, setDataItemPage]);

  const dataItemVisibleCount = visibleItems.length;
  const dataItemTotalVisibleBase =
    latestRevisionOnly || dataItemTotalCount == null
      ? dataItemVisibleCount
      : dataItemTotalCount;

  const filterBar =
    type === 'data_item' ? (
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
        resetKey={getResetKey(type, effectiveContainerId, effectiveDataTypeId)}
        pageSize={pageSize}
        hasNextPage={hasNextPage}
        totalPages={totalPages}
        showObjectIdColumn={!hideObjectIdInCompactSelection}
        latestRevisionOnly={latestRevisionOnly}
        onToggleLatestRevisionOnly={
          type === 'data_item'
            ? () => setLatestRevisionOnly((prev) => !prev)
            : undefined
        }
        enableDetailToggle={type === 'data_item'}
        filterBar={filterBar}
      />

      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
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
