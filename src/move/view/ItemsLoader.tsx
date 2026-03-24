// File: ItemsLoader.tsx
import { useState, useEffect, useCallback } from 'react';
import { useCurrentAccount } from '@iota/dapp-kit';
import ItemsTable from './ItemsTable';
import type { Item } from '../types';
import { useSelection } from '../../context/SelectionContext';
import { API_BASE } from '../../Config.ts';
import { extractItemsFromTree } from '../../utils/dataTransform';
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
  const effectiveDataTypeId = resolveEffectiveDataTypeId(dataTypeId, selectedDataTypeId);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLoad = canLoadItems(type, account?.address, effectiveContainerId);

  const loadItems = useCallback(async () => {
    if (!canLoad || !account?.address) {
      setItems([]);
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
      });

      const res = await fetch(`${API_BASE}api/items?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const tree = await res.json();
      setItems(
        extractItemsFromTree(tree, type, effectiveContainerId, effectiveDataTypeId)
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load';
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [
    canLoad,
    account?.address,
    page,
    pageSize,
    effectiveContainerId,
    effectiveDataTypeId,
    effectiveInclude,
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

  return (
    <div style={{ marginTop: 20 }}>
      {loading && <div>Loading…</div>}

      <ItemsTable
        items={items}
        page={page}
        onPageChange={setPage}
        selectedId={selectedId ?? undefined}
        onSelect={handleSelect}
        disableSelect={false}
        fieldsToShow={fieldsToShow ?? DEFAULT_FIELDS_BY_TYPE[type]}
        label={ITEM_LABEL_BY_TYPE[type]}
        resetKey={getResetKey(type, effectiveContainerId, effectiveDataTypeId)}
      />

      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}
