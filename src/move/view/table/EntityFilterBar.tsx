import type { Item } from '../../types';

export type EntitySearchField =
  | 'name'
  | 'description'
  | 'content'
  | 'externalId'
  | 'externalIndex'
  | 'objectId'
  | 'creatorAddr'
  | 'parentContainerId'
  | 'childContainerId'
  | 'containerId'
  | 'containerName'
  | 'addr'
  | 'role'
  | 'removed';

export type EntitySortOption =
  | 'created_desc'
  | 'created_asc'
  | 'name_asc'
  | 'name_desc'
  | 'external_index_desc'
  | 'external_index_asc'
  | 'external_id_asc'
  | 'external_id_desc'
  | 'address_asc'
  | 'address_desc'
  | 'role_asc'
  | 'role_desc'
  | 'container_name_asc'
  | 'container_name_desc';

export type EntityVerifiedFilter = 'all' | 'verified' | 'unverified';

export type EntityFilterState = {
  query: string;
  searchFields: EntitySearchField[];
  sortBy: EntitySortOption;
  verified: EntityVerifiedFilter;
};

type EntityFilterBarProps = {
  state: EntityFilterState;
  onChange: (next: EntityFilterState) => void;
  onSubmit?: () => void;
  applyDisabled?: boolean;
  totalCount: number;
  visibleCount: number;
  defaultState?: EntityFilterState;
  searchFieldOptions?: EntitySearchFieldOption[];
  sortOptions?: EntitySortOptionEntry[];
  searchPlaceholder?: string;
  searchAriaLabel?: string;
  regionLabel?: string;
  showVerifiedFilter?: boolean;
};

type SortDirection = 'asc' | 'desc';

export type EntitySearchFieldOption = { value: EntitySearchField; label: string };
export type EntitySortOptionEntry = { value: EntitySortOption; label: string };

const DEFAULT_SEARCH_FIELD_OPTIONS: EntitySearchFieldOption[] = [
  { value: 'name', label: 'Name' },
  { value: 'description', label: 'Description' },
  { value: 'content', label: 'Content' },
  { value: 'externalId', label: 'External ID' },
  { value: 'externalIndex', label: 'External Index' },
  { value: 'objectId', label: 'Object ID' },
  { value: 'creatorAddr', label: 'Creator' },
];

const DEFAULT_SORT_OPTIONS: EntitySortOptionEntry[] = [
  { value: 'created_desc', label: 'Created on-chain: latest first' },
  { value: 'created_asc', label: 'Created on-chain: oldest first' },
  { value: 'name_asc', label: 'Name: A to Z' },
  { value: 'name_desc', label: 'Name: Z to A' },
  { value: 'external_index_desc', label: 'External index: high to low' },
  { value: 'external_index_asc', label: 'External index: low to high' },
  { value: 'external_id_asc', label: 'External ID: A to Z' },
  { value: 'external_id_desc', label: 'External ID: Z to A' },
];

export const DEFAULT_ENTITY_FILTER_STATE: EntityFilterState = {
  query: '',
  searchFields: ['name', 'description', 'externalId', 'externalIndex'],
  sortBy: 'created_desc',
  verified: 'all',
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
  if (value > 1e17) return Math.round(value / 1e6);
  if (value > 1e14) return Math.round(value / 1e3);
  if (value < 1e12) return Math.round(value * 1000);
  return Math.round(value);
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
  const result = left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
  return direction === 'asc' ? result : -result;
}

function compareNullableNumbers(
  a: number | null,
  b: number | null,
  direction: SortDirection
): number {
  const leftMissing = a == null;
  const rightMissing = b == null;

  if (leftMissing && rightMissing) return 0;
  if (leftMissing) return 1;
  if (rightMissing) return -1;

  const result = a - b;
  return direction === 'asc' ? result : -result;
}

function resolveSearchFieldValue(item: Item, field: EntitySearchField): string {
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
    case 'creatorAddr':
      return normalizeText(fields.creatorAddr);
    case 'parentContainerId':
      return normalizeText(fields.containerParentId);
    case 'childContainerId':
      return normalizeText(fields.containerChildId);
    case 'containerId':
      return normalizeText(fields.containerId);
    case 'containerName':
      return normalizeText(fields.containerName);
    case 'addr':
      return normalizeText(fields.addr);
    case 'role':
      return normalizeText(fields.role);
    case 'removed':
      return normalizeText(fields.removed);
    default:
      return '';
  }
}

function compareEntityItems(a: Item, b: Item, sortBy: EntitySortOption): number {
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
    case 'address_asc':
      return compareText(a.fields?.addr, b.fields?.addr, 'asc');
    case 'address_desc':
      return compareText(a.fields?.addr, b.fields?.addr, 'desc');
    case 'role_asc':
      return compareText(a.fields?.role, b.fields?.role, 'asc');
    case 'role_desc':
      return compareText(a.fields?.role, b.fields?.role, 'desc');
    case 'container_name_asc':
      return compareText(a.fields?.containerName, b.fields?.containerName, 'asc');
    case 'container_name_desc':
      return compareText(a.fields?.containerName, b.fields?.containerName, 'desc');
    default:
      return 0;
  }
}

export function filterAndSortEntityItems(items: Item[], state: EntityFilterState): Item[] {
  const effectiveSearchFields =
    state.searchFields.length > 0
      ? state.searchFields
      : DEFAULT_ENTITY_FILTER_STATE.searchFields;

  const queryTokens = normalizeText(state.query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const filtered = items.filter((item) => {
    const verified = resolveVerified(item);
    if (state.verified === 'verified' && !verified) return false;
    if (state.verified === 'unverified' && verified) return false;

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
      const ordered = compareEntityItems(left.item, right.item, state.sortBy);
      if (ordered !== 0) return ordered;
      return left.index - right.index;
    })
    .map((entry) => entry.item);
}

function isDefaultState(
  state: EntityFilterState,
  defaultState: EntityFilterState
): boolean {
  return (
    state.query === defaultState.query &&
    state.sortBy === defaultState.sortBy &&
    state.verified === defaultState.verified &&
    state.searchFields.length === defaultState.searchFields.length &&
    state.searchFields.every(
      (field, idx) => field === defaultState.searchFields[idx]
    )
  );
}

export default function EntityFilterBar({
  state,
  onChange,
  onSubmit,
  applyDisabled = false,
  totalCount,
  visibleCount,
  defaultState = DEFAULT_ENTITY_FILTER_STATE,
  searchFieldOptions = DEFAULT_SEARCH_FIELD_OPTIONS,
  sortOptions = DEFAULT_SORT_OPTIONS,
  searchPlaceholder = 'Search by name, description, content, external fields...',
  searchAriaLabel = 'Search entities',
  regionLabel = 'Container and type filters',
  showVerifiedFilter = true,
}: EntityFilterBarProps) {
  const updateState = (patch: Partial<EntityFilterState>) => {
    onChange({ ...state, ...patch });
  };

  const toggleSearchField = (field: EntitySearchField) => {
    const alreadyEnabled = state.searchFields.includes(field);
    if (alreadyEnabled && state.searchFields.length === 1) return;

    const nextFields = alreadyEnabled
      ? state.searchFields.filter((entry) => entry !== field)
      : [...state.searchFields, field];

    updateState({ searchFields: nextFields });
  };

  return (
    <div className="bp-data-item-filter" role="region" aria-label={regionLabel}>
      <div className="bp-data-item-filter-primary">
        <label className="bp-data-item-filter-control bp-data-item-filter-search-control">
          <span className="bp-data-item-filter-label">Search</span>
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
            placeholder={searchPlaceholder}
            className="bp-data-item-filter-search"
            aria-label={searchAriaLabel}
          />
        </label>

        <label className="bp-data-item-filter-control">
          <span className="bp-data-item-filter-label">Order</span>
          <select
            value={state.sortBy}
            onChange={(event) =>
              updateState({ sortBy: event.target.value as EntitySortOption })
            }
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {showVerifiedFilter ? (
          <label className="bp-data-item-filter-control">
            <span className="bp-data-item-filter-label">Verified</span>
            <select
              value={state.verified}
              onChange={(event) =>
                updateState({ verified: event.target.value as EntityVerifiedFilter })
              }
            >
              <option value="all">All</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
          </label>
        ) : null}

        <div className="bp-data-item-filter-control bp-data-item-filter-actions-control">
          <span className="bp-data-item-filter-label">Actions</span>
          <div className="bp-data-item-filter-actions">
            {onSubmit ? (
              <button
                type="button"
                className="bp-toolbar-btn bp-data-item-filter-apply"
                onClick={onSubmit}
                disabled={applyDisabled}
              >
                Apply
              </button>
            ) : null}
            <button
              type="button"
              className="bp-toolbar-btn"
              onClick={() => onChange(defaultState)}
              disabled={isDefaultState(state, defaultState)}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="bp-data-item-filter-secondary">
        <div className="bp-data-item-filter-chip-group">
          <span className="bp-data-item-filter-label">Search In</span>
          <div className="bp-data-item-filter-chips">
            {searchFieldOptions.map((option) => {
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

        <div className="bp-data-item-filter-count" aria-live="polite">
          Showing {visibleCount} / {totalCount}
        </div>
      </div>
    </div>
  );
}
