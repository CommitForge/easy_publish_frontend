import { useMemo, useState } from 'react';
import { useSelection } from '../../context/SelectionContext.tsx';
import { EntityBrowseTableView } from './EntityBrowseTableView.tsx';
import type { EntityFilterState } from './table/EntityFilterBar.tsx';

const DEFAULT_FILTER_STATE: EntityFilterState = {
  query: '',
  searchFields: [
    'name',
    'description',
    'externalId',
    'externalIndex',
    'parentContainerId',
    'childContainerId',
  ],
  sortBy: 'created_desc',
  verified: 'all',
};

export function ContainerChildLinksView() {
  const {
    selectedContainerId,
    setSelectedContainerId,
    setSelectedDataTypeId,
  } = useSelection();
  const [selectedChildLinkId, setSelectedChildLinkId] = useState<string | null>(
    null
  );
  const [containerScope, setContainerScope] = useState<'accessible' | 'all'>(
    'accessible'
  );

  const extraQueryParams = useMemo(
    () => ({
      containerScope,
      containerId: selectedContainerId ?? undefined,
    }),
    [containerScope, selectedContainerId]
  );

  const extraFilterBar = (
    <div className="bp-data-item-filter bp-data-item-filter-condensed">
      <div className="bp-data-item-filter-primary">
        <label className="bp-data-item-filter-control">
          <span className="bp-data-item-filter-label">Container Scope</span>
          <select
            value={containerScope}
            onChange={(event) =>
              setContainerScope(event.target.value as 'accessible' | 'all')
            }
          >
            <option value="accessible">Followed + owned containers</option>
            <option value="all">All containers</option>
          </select>
        </label>

        <div className="bp-data-item-filter-count" aria-live="polite">
          {selectedContainerId
            ? `Scoped to selected container: ${selectedContainerId.slice(0, 10)}...${selectedContainerId.slice(-8)}`
            : 'No selected container: showing all in scope'}
        </div>
      </div>
    </div>
  );

  return (
    <EntityBrowseTableView
      endpointPath="api/container-child-links"
      tableLabel="Container Child Link"
      fieldsToShow={[
        'containerParentId',
        'containerChildId',
        'name',
        'description',
        'externalId',
        'externalIndex',
        'creatorAddr',
      ]}
      selectedId={selectedChildLinkId}
      onSelectItem={(item) => {
        setSelectedChildLinkId((prev) =>
          prev === item.object_id ? null : item.object_id
        );
        const parentId = item.fields?.containerParentId;
        if (typeof parentId === 'string' && parentId.trim()) {
          setSelectedContainerId(parentId.trim());
          setSelectedDataTypeId(null);
        }
      }}
      filterDefaultState={DEFAULT_FILTER_STATE}
      filterSearchFieldOptions={[
        { value: 'name', label: 'Name' },
        { value: 'description', label: 'Description' },
        { value: 'content', label: 'Content' },
        { value: 'externalId', label: 'External ID' },
        { value: 'externalIndex', label: 'External Index' },
        { value: 'parentContainerId', label: 'Parent Container ID' },
        { value: 'childContainerId', label: 'Child Container ID' },
        { value: 'creatorAddr', label: 'Creator' },
        { value: 'objectId', label: 'Object ID' },
      ]}
      filterSortOptions={[
        {
          value: 'created_desc',
          label: 'Created on-chain: latest first',
          apiSortBy: 'created',
          apiSortDirection: 'desc',
        },
        {
          value: 'created_asc',
          label: 'Created on-chain: oldest first',
          apiSortBy: 'created',
          apiSortDirection: 'asc',
        },
        {
          value: 'name_asc',
          label: 'Name: A to Z',
          apiSortBy: 'name',
          apiSortDirection: 'asc',
        },
        {
          value: 'name_desc',
          label: 'Name: Z to A',
          apiSortBy: 'name',
          apiSortDirection: 'desc',
        },
        {
          value: 'external_index_desc',
          label: 'External index: high to low',
          apiSortBy: 'external_index',
          apiSortDirection: 'desc',
        },
        {
          value: 'external_index_asc',
          label: 'External index: low to high',
          apiSortBy: 'external_index',
          apiSortDirection: 'asc',
        },
        {
          value: 'external_id_asc',
          label: 'External ID: A to Z',
          apiSortBy: 'external_id',
          apiSortDirection: 'asc',
        },
        {
          value: 'external_id_desc',
          label: 'External ID: Z to A',
          apiSortBy: 'external_id',
          apiSortDirection: 'desc',
        },
      ]}
      filterSearchPlaceholder="Search by names, parent/child container IDs, or content..."
      filterSearchAriaLabel="Search container child links"
      filterRegionLabel="Container child links filters"
      showVerifiedFilter={false}
      extraQueryParams={extraQueryParams}
      extraFilterBar={extraFilterBar}
    />
  );
}
