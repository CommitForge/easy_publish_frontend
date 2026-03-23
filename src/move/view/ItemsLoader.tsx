// File: ItemsLoader.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCurrentAccount } from '@iota/dapp-kit';
import ItemsTable from './ItemsTable';
import type { Item } from '../Types';
import { useSelection } from '../../context/SelectionContext';
import { API_BASE, APP_INSTANCE_DOMAIN } from '../../Config.ts'; // <- domain

interface ItemsLoaderProps {
  type: 'container' | 'data_type' | 'data_item';
  containerId?: string;
  dataTypeId?: string;
  fieldsToShow?: string[];
  pageSize?: number;
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

  const effectiveInclude =
    include ??
    (type === 'container'
      ? 'DATA_TYPE'
      : type === 'data_type'
      ? 'DATA_TYPE'
      : 'DATA_ITEM');

  const effectiveContainerId =
    type === 'container'
      ? containerId
      : containerId ?? selectedContainerId ?? undefined;

  const effectiveDataTypeId = dataTypeId ?? selectedDataTypeId ?? undefined;

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLoad = Boolean(
    account?.address &&
      (type === 'container' ||
        (type === 'data_type' && effectiveContainerId) ||
        (type === 'data_item' && effectiveContainerId))
  );

  /** -------- Tree → UI slice -------- */
  const extractItems = useCallback(
    (tree: any): Item[] => {
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
        (containerNode.dataTypes ?? []).forEach((dt: any) => {
          const dtId = dt.dataType.id;
          if (effectiveDataTypeId && dtId !== effectiveDataTypeId) return;

          const dataTypeName = dt.dataType.name;

          (dt.dataItems ?? []).forEach((di: any) => {
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
                verified:
                  di.dataItem.verified == null
                    ? ''
                    : di.dataItem.verified
                    ? 'true'
                    : 'false',
                creatorAddr: di.dataItem.creator?.creatorAddr ?? '',
                externalIndex: di.dataItem.externalIndex ?? '',
              },
            });
          });
        });
        return rows;
      }

      return [];
    },
    [type, effectiveContainerId, effectiveDataTypeId]
  );

  /** -------- Fetch -------- */
  const loadItems = useCallback(async () => {
    if (!canLoad) {
      setItems([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        userAddress: account!.address,
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (type !== 'container' && effectiveContainerId) {
        params.set('containerId', effectiveContainerId);
      }
      if (effectiveDataTypeId) params.set('dataTypeId', effectiveDataTypeId);
      params.set('include', effectiveInclude);

      // Pass domain to backend
      params.set('domain', APP_INSTANCE_DOMAIN ?? '');

      const res = await fetch(`${API_BASE}api/items?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const tree = await res.json();
      const extracted = extractItems(tree);

      setItems(extracted);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load');
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
    extractItems,
  ]);

  const fetchDeps = useMemo(() => {
    switch (type) {
      case 'container':
        return [account?.address, page];
      case 'data_type':
        return [account?.address, effectiveContainerId, page];
      case 'data_item':
        return [account?.address, effectiveContainerId, effectiveDataTypeId, page];
      default:
        return [];
    }
  }, [type, account?.address, effectiveContainerId, effectiveDataTypeId, page]);

  useEffect(() => {
    loadItems();
  }, fetchDeps);

  useEffect(() => {
    if (type === 'data_type') setDataTypePage(0);
    if (type === 'data_item') setDataItemPage(0);
  }, [effectiveContainerId]);

  useEffect(() => {
    if (type === 'data_item') setDataItemPage(0);
  }, [effectiveDataTypeId]);

  const handleSelect = (itemId: string) => {
    if (type === 'container') {
      setSelectedContainerId(prev => (prev === itemId ? null : itemId));
      setSelectedDataTypeId(null);
      setSelectedDataItemId(null);
      setDataTypePage(0);
      setDataItemPage(0);
    }

    if (type === 'data_type') {
      setSelectedDataTypeId(prev => (prev === itemId ? null : itemId));
      setSelectedDataItemId(null);
      setDataItemPage(0);
    }

    if (type === 'data_item') {
      setSelectedDataItemId(prev => (prev === itemId ? null : itemId));

      const selectedItem = items.find(i => i.object_id === itemId);
      if (selectedItem && selectedItem.fields.dataTypeId) {
        setSelectedDataTypeId(selectedItem.fields.dataTypeId);
      }
    }
  };

  const selectedId =
    type === 'container'
      ? selectedContainerId
      : type === 'data_type'
      ? selectedDataTypeId
      : selectedDataItemId;

  // ---- Pass domain to ItemsTable for proper explorer URL ----
const generateExplorerUrl = (objectId: string) =>
  `${APP_INSTANCE_DOMAIN ?? '-'} /object/${objectId}`;

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
        fieldsToShow={
          fieldsToShow ??
          (type === 'data_item'
            ? [
                'dataType',
                'name',
                'description',
                'content',
                'verified',
                'creatorAddr',
                'externalId',
                'externalIndex',
              ]
            : ['name', 'description', 'content', 'verified', 'creatorAddr'])
        }
        label={
          type === 'container'
            ? 'Container'
            : type === 'data_type'
            ? 'Data Type'
            : 'Item'
        }
        resetKey={
          type === 'container'
            ? 'containers'
            : type === 'data_item'
            ? `${effectiveContainerId ?? 'none'}-${effectiveDataTypeId ?? 'all'}`
            : effectiveContainerId ?? 'none'
        }
        explorerUrl={generateExplorerUrl} // <- pass function to generate per-row URLs
      />

      {!loading && items.length === 0 && <p>No items found.</p>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}