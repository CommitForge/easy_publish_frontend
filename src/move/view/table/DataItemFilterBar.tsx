import type { Item } from '../../types';

export type DataItemSearchField =
  | 'name'
  | 'description'
  | 'content'
  | 'externalId'
  | 'externalIndex'
  | 'objectId'
  | 'dataType'
  | 'creatorAddr';

export type DataItemSortOption =
  | 'created_desc'
  | 'created_asc'
  | 'name_asc'
  | 'name_desc'
  | 'external_index_desc'
  | 'external_index_asc'
  | 'external_id_asc'
  | 'external_id_desc';

export type DataItemVerifiedFilter = 'all' | 'verified' | 'unverified';
export type DataItemPresenceFilter = 'all' | 'with' | 'without';

export type DataItemFilterState = {
  query: string;
  searchFields: DataItemSearchField[];
  sortBy: DataItemSortOption;
  verified: DataItemVerifiedFilter;
  revisions: DataItemPresenceFilter;
  verifications: DataItemPresenceFilter;
  dataType: string;
};

type DataItemFilterBarProps = {
  state: DataItemFilterState;
  onChange: (next: DataItemFilterState) => void;
  onSubmit?: () => void;
  applyDisabled?: boolean;
  availableDataTypes: string[];
  totalCount: number;
  visibleCount: number;
};

type SortDirection = 'asc' | 'desc';

const SEARCH_FIELD_OPTIONS: Array<{ value: DataItemSearchField; label: string }> = [
  { value: 'name', label: 'Name' },
  { value: 'description', label: 'Description' },
  { value: 'content', label: 'Content' },
  { value: 'externalId', label: 'External ID' },
  { value: 'externalIndex', label: 'External Index' },
  { value: 'objectId', label: 'Object ID' },
  { value: 'dataType', label: 'Data Type' },
  { value: 'creatorAddr', label: 'Creator' },
];

const SORT_OPTIONS: Array<{ value: DataItemSortOption; label: string }> = [
  { value: 'created_desc', label: 'Created on-chain: latest first' },
  { value: 'created_asc', label: 'Created on-chain: oldest first' },
  { value: 'name_asc', label: 'Name: A to Z' },
  { value: 'name_desc', label: 'Name: Z to A' },
  { value: 'external_index_desc', label: 'External index: high to low' },
  { value: 'external_index_asc', label: 'External index: low to high' },
  { value: 'external_id_asc', label: 'External ID: A to Z' },
  { value: 'external_id_desc', label: 'External ID: Z to A' },
];

export const DEFAULT_DATA_ITEM_FILTER_STATE: DataItemFilterState = {
  query: '',
  searchFields: ['name', 'description', 'externalId', 'externalIndex'],
  sortBy: 'created_desc',
  verified: 'all',
  revisions: 'all',
  verifications: 'all',
  dataType: 'all',
};

function normalizeText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value).trim().toLowerCase();
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return '';
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

function resolveCreatedOnChainMs(item: Item): number | null {
  const fields = item.fields ?? {};
  const candidates: unknown[] = [
    fields.createdOnChainMs,
    fields.createdOnChain,
    fields.createdAt,
    fields.created_at,
    fields.createdTimestamp,
    fields.created_timestamp,
    fields.timestamp,
  ];

  for (const candidate of candidates) {
    const parsed = toTimestampMs(candidate);
    if (parsed != null) return parsed;
  }
  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function resolveVerified(item: Item): boolean {
  const raw = item.fields?.verified;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') {
    return raw.trim().toLowerCase() === 'true';
  }
  return false;
}

function compareText(a: unknown, b: unknown, direction: SortDirection): number {
  const left = normalizeText(a);
  const right = normalizeText(b);
  const result = left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
  return direction === 'asc' ? result : -result;
}

function compareNullableNumbers(a: number | null, b: number | null, direction: SortDirection): number {
  const leftMissing = a == null;
  const rightMissing = b == null;

  if (leftMissing && rightMissing) return 0;
  if (leftMissing) return 1;
  if (rightMissing) return -1;

  const result = a - b;
  return direction === 'asc' ? result : -result;
}

function resolveSearchFieldValue(item: Item, field: DataItemSearchField): string {
  const fields = item.fields ?? {};

  switch (field) {
    case 'name':
      return normalizeText(fields.name);
    case 'description':
      return normalizeText(fields.description);
    case 'content':
      return normalizeText(fields.content);
    case 'externalId':
      return normalizeText(fields.externalId);
    case 'externalIndex':
      return normalizeText(fields.externalIndex);
    case 'objectId':
      return normalizeText(item.object_id);
    case 'dataType':
      return normalizeText(fields.dataType);
    case 'creatorAddr':
      return normalizeText(fields.creatorAddr);
    default:
      return '';
  }
}

function matchesPresenceFilter(filter: DataItemPresenceFilter, hasValue: boolean): boolean {
  if (filter === 'all') return true;
  if (filter === 'with') return hasValue;
  return !hasValue;
}

function compareDataItems(a: Item, b: Item, sortBy: DataItemSortOption): number {
  switch (sortBy) {
    case 'created_desc':
      return compareNullableNumbers(
        resolveCreatedOnChainMs(a),
        resolveCreatedOnChainMs(b),
        'desc'
      );
    case 'created_asc':
      return compareNullableNumbers(
        resolveCreatedOnChainMs(a),
        resolveCreatedOnChainMs(b),
        'asc'
      );
    case 'name_asc':
      return compareText(a.fields?.name, b.fields?.name, 'asc');
    case 'name_desc':
      return compareText(a.fields?.name, b.fields?.name, 'desc');
    case 'external_index_desc': {
      const numericCompare = compareNullableNumbers(
        toNumber(a.fields?.externalIndex),
        toNumber(b.fields?.externalIndex),
        'desc'
      );
      if (numericCompare !== 0) return numericCompare;
      return compareText(a.fields?.externalIndex, b.fields?.externalIndex, 'desc');
    }
    case 'external_index_asc': {
      const numericCompare = compareNullableNumbers(
        toNumber(a.fields?.externalIndex),
        toNumber(b.fields?.externalIndex),
        'asc'
      );
      if (numericCompare !== 0) return numericCompare;
      return compareText(a.fields?.externalIndex, b.fields?.externalIndex, 'asc');
    }
    case 'external_id_asc':
      return compareText(a.fields?.externalId, b.fields?.externalId, 'asc');
    case 'external_id_desc':
      return compareText(a.fields?.externalId, b.fields?.externalId, 'desc');
    default:
      return 0;
  }
}

export function filterAndSortDataItems(items: Item[], state: DataItemFilterState): Item[] {
  const effectiveSearchFields =
    state.searchFields.length > 0
      ? state.searchFields
      : DEFAULT_DATA_ITEM_FILTER_STATE.searchFields;

  const queryTokens = normalizeText(state.query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const targetDataType = normalizeText(state.dataType);

  const filtered = items.filter((item) => {
    if (targetDataType && targetDataType !== 'all') {
      const itemType = normalizeText(item.fields?.dataType);
      if (itemType !== targetDataType) return false;
    }

    const verified = resolveVerified(item);
    if (state.verified === 'verified' && !verified) return false;
    if (state.verified === 'unverified' && verified) return false;

    const hasRevisions =
      Array.isArray(item.fields?.revisions) && item.fields.revisions.length > 0;
    if (!matchesPresenceFilter(state.revisions, hasRevisions)) return false;

    const hasVerifications =
      Array.isArray(item.fields?.dataItemVerifications) &&
      item.fields.dataItemVerifications.length > 0;
    if (!matchesPresenceFilter(state.verifications, hasVerifications)) return false;

    if (queryTokens.length === 0) return true;

    const searchValues = effectiveSearchFields.map((field) =>
      resolveSearchFieldValue(item, field)
    );

    return queryTokens.every((token) =>
      searchValues.some((value) => value.includes(token))
    );
  });

  return filtered
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const ordered = compareDataItems(left.item, right.item, state.sortBy);
      if (ordered !== 0) return ordered;
      return left.index - right.index;
    })
    .map((entry) => entry.item);
}

function isDefaultState(state: DataItemFilterState): boolean {
  return (
    state.query === DEFAULT_DATA_ITEM_FILTER_STATE.query &&
    state.sortBy === DEFAULT_DATA_ITEM_FILTER_STATE.sortBy &&
    state.verified === DEFAULT_DATA_ITEM_FILTER_STATE.verified &&
    state.revisions === DEFAULT_DATA_ITEM_FILTER_STATE.revisions &&
    state.verifications === DEFAULT_DATA_ITEM_FILTER_STATE.verifications &&
    state.dataType === DEFAULT_DATA_ITEM_FILTER_STATE.dataType &&
    state.searchFields.length === DEFAULT_DATA_ITEM_FILTER_STATE.searchFields.length &&
    state.searchFields.every(
      (field, idx) => field === DEFAULT_DATA_ITEM_FILTER_STATE.searchFields[idx]
    )
  );
}

export default function DataItemFilterBar({
  state,
  onChange,
  onSubmit,
  applyDisabled = false,
  availableDataTypes,
  totalCount,
  visibleCount,
}: DataItemFilterBarProps) {
  const updateState = (patch: Partial<DataItemFilterState>) => {
    onChange({ ...state, ...patch });
  };

  const toggleSearchField = (field: DataItemSearchField) => {
    const alreadyEnabled = state.searchFields.includes(field);
    if (alreadyEnabled && state.searchFields.length === 1) return;

    const nextFields = alreadyEnabled
      ? state.searchFields.filter((entry) => entry !== field)
      : [...state.searchFields, field];

    updateState({ searchFields: nextFields });
  };

  return (
    <div className="bp-data-item-filter" role="region" aria-label="Data item filters">
      <div className="bp-data-item-filter-primary">
        <input
          type="text"
          value={state.query}
          onChange={(event) => updateState({ query: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && onSubmit && !applyDisabled) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Search by name, description, external ID or index..."
          className="bp-data-item-filter-search"
          aria-label="Search data items"
        />

        <label className="bp-data-item-filter-control">
          <span className="bp-data-item-filter-label">Order</span>
          <select
            value={state.sortBy}
            onChange={(event) =>
              updateState({ sortBy: event.target.value as DataItemSortOption })
            }
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="bp-data-item-filter-actions">
          <button
            type="button"
            className="bp-toolbar-btn"
            onClick={() => onChange(DEFAULT_DATA_ITEM_FILTER_STATE)}
            disabled={isDefaultState(state)}
          >
            Reset
          </button>
          {onSubmit && (
            <button
              type="button"
              className="bp-toolbar-btn bp-data-item-filter-apply"
              onClick={onSubmit}
              disabled={applyDisabled}
            >
              Apply
            </button>
          )}
        </div>
      </div>

      <div className="bp-data-item-filter-secondary">
        <div className="bp-data-item-filter-control bp-data-item-filter-chip-group">
          <span className="bp-data-item-filter-label">Search In</span>
          <div className="bp-data-item-filter-chips">
            {SEARCH_FIELD_OPTIONS.map((option) => {
              const active = state.searchFields.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`bp-filter-chip ${active ? 'is-active' : ''}`}
                  onClick={() => toggleSearchField(option.value)}
                  aria-pressed={active}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="bp-data-item-filter-control">
          <span className="bp-data-item-filter-label">Verified</span>
          <select
            value={state.verified}
            onChange={(event) =>
              updateState({ verified: event.target.value as DataItemVerifiedFilter })
            }
          >
            <option value="all">All</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>
        </label>

        <label className="bp-data-item-filter-control">
          <span className="bp-data-item-filter-label">Revisions</span>
          <select
            value={state.revisions}
            onChange={(event) =>
              updateState({ revisions: event.target.value as DataItemPresenceFilter })
            }
          >
            <option value="all">All</option>
            <option value="with">With revisions</option>
            <option value="without">Without revisions</option>
          </select>
        </label>

        <label className="bp-data-item-filter-control">
          <span className="bp-data-item-filter-label">Verifications</span>
          <select
            value={state.verifications}
            onChange={(event) =>
              updateState({ verifications: event.target.value as DataItemPresenceFilter })
            }
          >
            <option value="all">All</option>
            <option value="with">With verifications</option>
            <option value="without">Without verifications</option>
          </select>
        </label>

        {availableDataTypes.length > 1 && (
          <label className="bp-data-item-filter-control">
            <span className="bp-data-item-filter-label">Data Type</span>
            <select
              value={state.dataType}
              onChange={(event) => updateState({ dataType: event.target.value })}
            >
              <option value="all">All data types</option>
              {availableDataTypes.map((dataTypeName) => (
                <option key={dataTypeName} value={dataTypeName}>
                  {dataTypeName}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="bp-data-item-filter-count" aria-live="polite">
          Showing {visibleCount} / {totalCount}
        </div>
      </div>
    </div>
  );
}
