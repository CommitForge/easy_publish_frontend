import { useMemo, useState } from 'react';
import { useSelection } from '../../context/SelectionContext.tsx';
import { EntityBrowseTableView } from './EntityBrowseTableView.tsx';
import type { EntityFilterState } from './table/EntityFilterBar.tsx';

const DEFAULT_FILTER_STATE: EntityFilterState = {
  query: '',
  searchFields: ['addr', 'role', 'containerName', 'containerId'],
  sortBy: 'created_desc',
  verified: 'all',
};

type OwnerStatusFilter = 'active' | 'removed' | 'all';

export function OwnersView() {
  const {
    selectedContainerId,
    setSelectedContainerId,
    setSelectedDataTypeId,
  } = useSelection();
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [containerScope, setContainerScope] = useState<'accessible' | 'all'>(
    'accessible'
  );
  const [ownerStatus, setOwnerStatus] = useState<OwnerStatusFilter>('active');

  const extraQueryParams = useMemo(
    () => ({
      containerScope,
      containerId: selectedContainerId ?? undefined,
      ownerStatus,
    }),
    [containerScope, ownerStatus, selectedContainerId]
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

        <label className="bp-data-item-filter-control">
          <span className="bp-data-item-filter-label">Owner Status</span>
          <select
            value={ownerStatus}
            onChange={(event) =>
              setOwnerStatus(event.target.value as OwnerStatusFilter)
            }
          >
            <option value="active">Active owners</option>
            <option value="removed">Removed owners</option>
            <option value="all">All owners</option>
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
      endpointPath="api/owners"
      tableLabel="Owner"
      fieldsToShow={[
        'containerId',
        'containerName',
        'addr',
        'role',
        'removed',
        'creatorAddr',
      ]}
      selectedId={selectedOwnerId}
      onSelectItem={(item) => {
        setSelectedOwnerId((prev) =>
          prev === item.object_id ? null : item.object_id
        );
        const containerId = item.fields?.containerId;
        if (typeof containerId === 'string' && containerId.trim()) {
          setSelectedContainerId(containerId.trim());
          setSelectedDataTypeId(null);
        }
      }}
      filterDefaultState={DEFAULT_FILTER_STATE}
      filterSearchFieldOptions={[
        { value: 'addr', label: 'Address' },
        { value: 'role', label: 'Role' },
        { value: 'containerName', label: 'Container Name' },
        { value: 'containerId', label: 'Container ID' },
        { value: 'creatorAddr', label: 'Creator' },
        { value: 'removed', label: 'Removed Flag' },
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
          value: 'address_asc',
          label: 'Address: A to Z',
          apiSortBy: 'address',
          apiSortDirection: 'asc',
        },
        {
          value: 'address_desc',
          label: 'Address: Z to A',
          apiSortBy: 'address',
          apiSortDirection: 'desc',
        },
        {
          value: 'role_asc',
          label: 'Role: A to Z',
          apiSortBy: 'role',
          apiSortDirection: 'asc',
        },
        {
          value: 'role_desc',
          label: 'Role: Z to A',
          apiSortBy: 'role',
          apiSortDirection: 'desc',
        },
        {
          value: 'container_name_asc',
          label: 'Container: A to Z',
          apiSortBy: 'container_name',
          apiSortDirection: 'asc',
        },
        {
          value: 'container_name_desc',
          label: 'Container: Z to A',
          apiSortBy: 'container_name',
          apiSortDirection: 'desc',
        },
      ]}
      filterSearchPlaceholder="Search by owner address, role, or container..."
      filterSearchAriaLabel="Search owners"
      filterRegionLabel="Owner filters"
      showVerifiedFilter={false}
      extraQueryParams={extraQueryParams}
      extraFilterBar={extraFilterBar}
    />
  );
}
