// File: ItemsTableRow.tsx
import React from 'react';
import type { CarMaintenance, Item } from '../../types';
import CarMaintenanceTable from './CarMaintenanceTable.tsx';

type ItemsTableRowProps = {
  item: Item;
  columns: string[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  disableSelect?: boolean;
  expandedCells: Set<string>;
  toggleCell: (cellId: string) => void;
  explorerUrl?: (objectId: string) => string; // <- function to generate URL per row
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
}) => {
  const objectId = item.object_id ?? item.fields.id ?? '-';
  let maintenances: CarMaintenance[] = [];

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
      <tr className={selectedId === objectId ? 'table-primary' : ''}>
        {/* Select column */}
        <td
          style={{
            textAlign: 'center',
            cursor: disableSelect ? 'not-allowed' : 'pointer',
            minWidth: 40,
          }}
          onClick={() => !disableSelect && onSelect?.(objectId)}
        >
          {selectedId === objectId ? (
            <i className="bi bi-check-circle-fill text-success select-icon" />
          ) : (
            <i
              className={`bi ${
                disableSelect ? 'bi-slash-circle text-muted' : 'bi-circle text-muted'
              } select-icon`}
            />
          )}
        </td>

        {/* Object ID */}
        <td style={{ minWidth: 120 }}>
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

        {/* Dynamic columns */}
        {columns.map((col, idx) => {
          const cellId = `${objectId}-${idx}`;
          let value = resolvePath(item.fields, col);
          if (value && typeof value === 'object') value = JSON.stringify(value, null, 2);

          return (
            <td key={idx} style={{ minWidth: 100, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

      {/* Nested maintenance table */}
      {maintenances.length > 0 && (
        <tr>
          <td
            colSpan={2 + columns.length} // span all master columns
            style={{
              padding: 0,
              border: 'none',
              paddingLeft: 46, // 40px selector + 6px spacing
            }}
          >
            <CarMaintenanceTable maintenances={maintenances} parentObjectId={objectId} />
          </td>
        </tr>
      )}
    </>
  );
};

export default ItemsTableRow;
