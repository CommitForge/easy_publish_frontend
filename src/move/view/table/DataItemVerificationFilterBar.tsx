export type DataItemVerificationVerifiedFilter = 'all' | 'verified' | 'unverified';

export type DataItemVerificationFilterState = {
  query: string;
  verified: DataItemVerificationVerifiedFilter;
  dataType: string;
  dataItemId: string;
};

type DataItemVerificationFilterBarProps = {
  state: DataItemVerificationFilterState;
  onChange: (next: DataItemVerificationFilterState) => void;
  availableDataTypes: string[];
  totalCount: number;
  visibleCount: number;
};

export const DEFAULT_DATA_ITEM_VERIFICATION_FILTER_STATE: DataItemVerificationFilterState = {
  query: '',
  verified: 'all',
  dataType: 'all',
  dataItemId: '',
};

function isDefaultState(state: DataItemVerificationFilterState): boolean {
  return (
    state.query === DEFAULT_DATA_ITEM_VERIFICATION_FILTER_STATE.query &&
    state.verified === DEFAULT_DATA_ITEM_VERIFICATION_FILTER_STATE.verified &&
    state.dataType === DEFAULT_DATA_ITEM_VERIFICATION_FILTER_STATE.dataType &&
    state.dataItemId === DEFAULT_DATA_ITEM_VERIFICATION_FILTER_STATE.dataItemId
  );
}

export default function DataItemVerificationFilterBar({
  state,
  onChange,
  availableDataTypes,
  totalCount,
  visibleCount,
}: DataItemVerificationFilterBarProps) {
  const updateState = (patch: Partial<DataItemVerificationFilterState>) => {
    onChange({ ...state, ...patch });
  };

  return (
    <div className="bp-data-item-filter" role="region" aria-label="Data item verification filters">
      <div className="bp-data-item-filter-primary">
        <label className="bp-data-item-filter-control bp-data-item-filter-search-control">
          <span className="bp-data-item-filter-label">Search</span>
          <input
            type="text"
            value={state.query}
            onChange={(event) => updateState({ query: event.target.value })}
            placeholder="Search by verification, item, type, creator, content..."
            className="bp-data-item-filter-search"
            aria-label="Search data item verifications"
          />
        </label>

        <label className="bp-data-item-filter-control">
          <span className="bp-data-item-filter-label">Verified</span>
          <select
            value={state.verified}
            onChange={(event) =>
              updateState({
                verified: event.target.value as DataItemVerificationVerifiedFilter,
              })
            }
          >
            <option value="all">All</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>
        </label>

        <label className="bp-data-item-filter-control">
          <span className="bp-data-item-filter-label">Item ID</span>
          <input
            type="text"
            value={state.dataItemId}
            onChange={(event) => updateState({ dataItemId: event.target.value })}
            placeholder="Filter by related data item id"
            className="bp-data-item-filter-search"
            aria-label="Filter verifications by data item id"
          />
        </label>

        <div className="bp-data-item-filter-control bp-data-item-filter-actions-control">
          <span className="bp-data-item-filter-label">Actions</span>
          <div className="bp-data-item-filter-actions">
            <button
              type="button"
              className="bp-toolbar-btn"
              onClick={() => onChange(DEFAULT_DATA_ITEM_VERIFICATION_FILTER_STATE)}
              disabled={isDefaultState(state)}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="bp-data-item-filter-secondary">
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
