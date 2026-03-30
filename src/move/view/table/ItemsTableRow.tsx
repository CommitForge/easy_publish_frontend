// File: ItemsTableRow.tsx
import React from 'react';
import type {
  CarMaintenance,
  DataItemVerification,
  Item,
  ItemRevision,
} from '../../types';
import CarMaintenanceTable from './CarMaintenanceTable.tsx';
import DataItemVerificationTable from './DataItemVerificationTable.tsx';
import RevisionsTable from './RevisionsTable.tsx';

type ItemsTableRowProps = {
  item: Item;
  columns: string[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  disableSelect?: boolean;
  expandedCells: Set<string>;
  toggleCell: (cellId: string) => void;
  explorerUrl?: (objectId: string) => string; // <- function to generate URL per row
  showObjectIdColumn?: boolean;
  detailsExpanded?: boolean;
};

const resolvePath = (obj: any, path: string) =>
  path.split('.').reduce((acc, key) => acc?.[key], obj);

const ItemsTableRow: React.FC<ItemsTableRowProps> = ({
  item,
  columns,
  selectedId,
  onSelect,
  disableSelect,
  expandedCells,
  toggleCell,
  explorerUrl, // function
  showObjectIdColumn = true,
  detailsExpanded = true,
}) => {
  const objectId = item.object_id ?? item.fields.id ?? '-';
  const isSelected = selectedId === objectId;
  let maintenances: CarMaintenance[] = [];
  const revisions: ItemRevision[] = Array.isArray(item.fields.revisions)
    ? item.fields.revisions
        .map((entry: any) => ({
          previousDataItemId:
            typeof entry?.previousDataItemId === 'string'
              ? entry.previousDataItemId
              : '',
          source:
            entry?.source === 'revision_setting' || entry?.source === 'references'
              ? entry.source
              : 'revision_setting',
        }))
        .filter((entry: ItemRevision) => Boolean(entry.previousDataItemId))
    : [];
  const verifications: DataItemVerification[] = Array.isArray(
    item.fields.dataItemVerifications
  )
    ? item.fields.dataItemVerifications
    : [];

  try {
    const contentObj = item.fields.content ? JSON.parse(item.fields.content) : {};
    maintenances = contentObj?.easy_publish?.cars?.maintenances ?? [];
  } catch (err) {
    console.warn(`Failed to parse maintenances for item ${objectId}`, err);
  }

  const rowExplorerUrl = explorerUrl ? explorerUrl(objectId) : undefined;

  return (
    <>
      {/* Main row */}
      <tr className={isSelected ? 'bp-row-selected' : ''}>
        {/* Select column */}
        <td className="bp-select-cell">
          <button
            type="button"
            className={`bp-select-cell-button ${isSelected ? 'is-selected' : ''}`}
            disabled={!!disableSelect}
            aria-label={
              disableSelect
                ? `Selection disabled for ${objectId}`
                : isSelected
                  ? `Deselect ${objectId}`
                  : `Select ${objectId}`
            }
            title={objectId}
            onClick={() => onSelect?.(objectId)}
          >
            <i
              className={`bi ${
                isSelected
                  ? 'bi-check-circle-fill'
                  : disableSelect
                    ? 'bi-slash-circle'
                    : 'bi-circle'
              } bp-select-icon`}
            />
          </button>
        </td>

        {/* Object ID */}
        {showObjectIdColumn && (
          <td className="bp-object-id-cell">
            <div
              className={`collapsible ${expandedCells.has(`${objectId}-id`) ? 'expanded' : ''}`}
              onClick={() => toggleCell(`${objectId}-id`)}
            >
              {objectId}{' '}
              {rowExplorerUrl && (
                <a
                  href={rowExplorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Open in IOTA Explorer"
                  style={{ marginLeft: 6 }}
                >
                  <i className="bi bi-box-arrow-up-right" />
                </a>
              )}
            </div>
          </td>
        )}

        {/* Dynamic columns */}
        {columns.map((col, idx) => {
          const cellId = `${objectId}-${idx}`;
          let value = resolvePath(item.fields, col);
          if (value && typeof value === 'object') value = JSON.stringify(value, null, 2);

          return (
            <td key={idx} className="bp-value-cell">
              <div
                className={`collapsible ${expandedCells.has(cellId) ? 'expanded' : ''}`}
                onClick={() => toggleCell(cellId)}
              >
                {value ?? '-'}
              </div>
            </td>
          );
        })}
      </tr>

      {/* Nested data item verification table */}
      {verifications.length > 0 && (
        <tr className="bp-nested-row">
          <td colSpan={columns.length + (showObjectIdColumn ? 2 : 1)} className="bp-nested-cell">
            <DataItemVerificationTable
              verifications={verifications}
              parentObjectId={objectId}
              forceExpanded={detailsExpanded}
            />
          </td>
        </tr>
      )}

      {/* Nested revisions table (generic for all instances) */}
      {revisions.length > 0 && (
        <tr className="bp-nested-row">
          <td colSpan={columns.length + (showObjectIdColumn ? 2 : 1)} className="bp-nested-cell">
            <RevisionsTable
              revisions={revisions}
              parentObjectId={objectId}
              forceExpanded={detailsExpanded}
            />
          </td>
        </tr>
      )}

      {/* Nested maintenance table */}
      {maintenances.length > 0 && (
        <tr className="bp-nested-row">
          <td colSpan={columns.length + (showObjectIdColumn ? 2 : 1)} className="bp-nested-cell">
            <CarMaintenanceTable
              maintenances={maintenances}
              parentObjectId={objectId}
              forceExpanded={detailsExpanded}
            />
          </td>
        </tr>
      )}
    </>
  );
};

export default ItemsTableRow;
