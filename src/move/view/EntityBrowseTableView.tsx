import { useCurrentAccount } from '@iota/dapp-kit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE, APP_INSTANCE_DOMAIN, t } from '../../Config.ts';
import type { Item } from '../types';
import ItemsTable from './ItemsTable.tsx';
import EntityFilterBar, {
  type EntityFilterState,
  type EntitySearchField,
  type EntitySortOption,
} from './table/EntityFilterBar.tsx';

type EntitySearchFieldOption = {
  value: EntitySearchField;
  label: string;
};

type EntitySortConfig = {
  value: EntitySortOption;
  label: string;
  apiSortBy: string;
  apiSortDirection: 'asc' | 'desc';
};

type EntityBrowseTableViewProps = {
  endpointPath: string;
  fieldsToShow: string[];
  tableLabel: string;
  pageSize?: number;
  selectedId?: string | null;
  onSelectItem?: (item: Item) => void;
  filterDefaultState: EntityFilterState;
  filterSearchFieldOptions: EntitySearchFieldOption[];
  filterSortOptions: EntitySortConfig[];
  filterSearchPlaceholder: string;
  filterSearchAriaLabel: string;
  filterRegionLabel: string;
  showVerifiedFilter?: boolean;
  extraQueryParams?: Record<string, string | undefined>;
  extraFilterBar?: React.ReactNode;
};

export function EntityBrowseTableView({
  endpointPath,
  fieldsToShow,
  tableLabel,
  pageSize = 20,
  selectedId,
  onSelectItem,
  filterDefaultState,
  filterSearchFieldOptions,
  filterSortOptions,
  filterSearchPlaceholder,
  filterSearchAriaLabel,
  filterRegionLabel,
  showVerifiedFilter = false,
  extraQueryParams,
  extraFilterBar,
}: EntityBrowseTableViewProps) {
  const account = useCurrentAccount();
  const requestSequenceRef = useRef(0);
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [filterDraftState, setFilterDraftState] =
    useState<EntityFilterState>(filterDefaultState);
  const [filterAppliedState, setFilterAppliedState] =
    useState<EntityFilterState>(filterDefaultState);

  useEffect(() => {
    setFilterDraftState(filterDefaultState);
    setFilterAppliedState(filterDefaultState);
  }, [filterDefaultState]);

  const normalizedExtraParams = useMemo(() => {
    const entries = Object.entries(extraQueryParams ?? {})
      .map(([key, value]) => [key, value?.trim() || ''] as const)
      .filter(([, value]) => Boolean(value))
      .sort(([left], [right]) => left.localeCompare(right));

    return entries;
  }, [extraQueryParams]);

  const normalizedExtraParamsKey = useMemo(
    () =>
      normalizedExtraParams
        .map(([key, value]) => `${key}:${value}`)
        .join('|'),
    [normalizedExtraParams]
  );

  const sortOptionMap = useMemo(
    () =>
      new Map<EntitySortOption, EntitySortConfig>(
        filterSortOptions.map((option) => [option.value, option])
      ),
    [filterSortOptions]
  );

  const loadItems = useCallback(async () => {
    const requestSequence = ++requestSequenceRef.current;

    if (!account?.address) {
      if (requestSequence !== requestSequenceRef.current) return;
      setItems([]);
      setTotalPages(null);
      setHasNextPage(false);
      setTotalCount(null);
      setError(undefined);
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const params = new URLSearchParams({
        userAddress: account.address,
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      const normalizedDomain = APP_INSTANCE_DOMAIN?.trim();
      if (normalizedDomain) {
        params.set('domain', normalizedDomain);
      }

      const query = filterAppliedState.query.trim();
      if (query) {
        params.set('query', query);
      }

      const searchFields = filterAppliedState.searchFields
        .map((field) => field.trim())
        .filter(Boolean);
      if (searchFields.length > 0) {
        params.set('searchFields', searchFields.join(','));
      }

      const sortConfig =
        sortOptionMap.get(filterAppliedState.sortBy) ?? filterSortOptions[0];
      if (sortConfig) {
        params.set('sortBy', sortConfig.apiSortBy);
        params.set('sortDirection', sortConfig.apiSortDirection);
      }

      for (const [key, value] of normalizedExtraParams) {
        if (value) {
          params.set(key, value);
        }
      }

      const response = await fetch(`${API_BASE}${endpointPath}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      const parsedItems = parseBrowseItems(payload);
      const parsedTotalPages = parseNumber(
        payload?.totalPages ?? payload?.meta?.totalPages
      );
      const parsedTotalCount = parseNumber(
        payload?.totalElements ?? payload?.meta?.totalElements
      );
      const parsedHasNext = parseBoolean(
        payload?.hasNext ?? payload?.meta?.hasNext
      );

      if (requestSequence !== requestSequenceRef.current) return;
      setItems(parsedItems);
      setTotalPages(parsedTotalPages);
      setTotalCount(parsedTotalCount);
      setHasNextPage(
        parsedHasNext ??
          (parsedTotalPages != null ? page + 1 < parsedTotalPages : false)
      );
    } catch (loadError: unknown) {
      if (requestSequence !== requestSequenceRef.current) return;
      const message =
        loadError instanceof Error ? loadError.message : t('messages.failedToLoad');
      setItems([]);
      setTotalPages(null);
      setTotalCount(null);
      setHasNextPage(false);
      setError(message);
    } finally {
      if (requestSequence === requestSequenceRef.current) {
        setLoading(false);
      }
    }
  }, [
    account?.address,
    endpointPath,
    filterAppliedState,
    filterSortOptions,
    normalizedExtraParams,
    page,
    pageSize,
    sortOptionMap,
  ]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    setPage(0);
  }, [filterAppliedState, normalizedExtraParamsKey]);

  const filterBar = (
    <>
      {extraFilterBar}
      <EntityFilterBar
        state={filterDraftState}
        onChange={setFilterDraftState}
        onSubmit={() => {
          setFilterAppliedState(filterDraftState);
          setPage(0);
        }}
        applyDisabled={areEntityFiltersEqual(filterDraftState, filterAppliedState)}
        totalCount={totalCount ?? items.length}
        visibleCount={items.length}
        defaultState={filterDefaultState}
        searchFieldOptions={filterSearchFieldOptions}
        sortOptions={filterSortOptions.map(({ value, label }) => ({
          value,
          label,
        }))}
        searchPlaceholder={filterSearchPlaceholder}
        searchAriaLabel={filterSearchAriaLabel}
        regionLabel={filterRegionLabel}
        showVerifiedFilter={showVerifiedFilter}
      />
    </>
  );

  return (
    <div className="bp-items-loader">
      {loading && items.length === 0 ? <div>{t('actions.loading')}</div> : null}

      <ItemsTable
        items={items}
        error={error}
        fieldsToShow={fieldsToShow}
        selectedId={selectedId ?? undefined}
        onSelect={(itemId) => {
          const selectedItem = items.find((item) => item.object_id === itemId);
          if (!selectedItem) return;
          onSelectItem?.(selectedItem);
        }}
        page={page}
        onPageChange={setPage}
        resetKey={`entity-browse:${endpointPath}:${page}:${normalizedExtraParamsKey}`}
        label={tableLabel}
        pageSize={pageSize}
        hasNextPage={hasNextPage}
        totalPages={totalPages}
        filterBar={filterBar}
      />
    </div>
  );
}

function parseBrowseItems(payload: unknown): Item[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const data = payload as Record<string, unknown>;
  const rowsCandidate = Array.isArray(data.content)
    ? data.content
    : Array.isArray(data.items)
    ? data.items
    : [];

  return rowsCandidate
    .map(normalizeBrowseRow)
    .filter((item): item is Item => item != null);
}

function normalizeBrowseRow(row: unknown): Item | null {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const candidate = row as Record<string, unknown>;
  const rawFields = candidate.fields;
  if (rawFields && typeof rawFields === 'object' && !Array.isArray(rawFields)) {
    const objectId =
      asString(candidate.object_id) ??
      asString(candidate.objectId) ??
      asString(candidate.id) ??
      asString((rawFields as Record<string, unknown>).id);

    if (!objectId) return null;

    return {
      object_id: objectId,
      fields: rawFields as Record<string, unknown>,
    };
  }

  const flattenedFields = Object.entries(candidate).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      if (key === 'object_id' || key === 'objectId') {
        return acc;
      }
      acc[key] = value;
      return acc;
    },
    {}
  );

  const objectId =
    asString(candidate.object_id) ??
    asString(candidate.objectId) ??
    asString(candidate.id) ??
    asString(flattenedFields.id);
  if (!objectId) return null;

  return {
    object_id: objectId,
    fields: flattenedFields,
  };
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return null;
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
