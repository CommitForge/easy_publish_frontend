// File: ItemsTableRow.tsx
import React, { useEffect, useState } from 'react';
import type {
  CarMaintenance,
  DataItemVerification,
  Item,
  ItemRevision,
} from '../../types';
import { useContentDisplay } from '../../../context/ContentDisplayContext.tsx';
import { decodeContentForDisplay } from '../../forms/ContentCompaction.ts';
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

const normalizeCellValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

const parseMaintenancesFromContent = (rawContent: string): CarMaintenance[] => {
  try {
    const contentObj = rawContent ? JSON.parse(rawContent) : {};
    const maintenances = contentObj?.easy_publish?.cars?.maintenances;
    if (!Array.isArray(maintenances)) return [];
    return maintenances as CarMaintenance[];
  } catch {
    return [];
  }
};

const DecodedCellValue: React.FC<{ rawValue: unknown }> = ({ rawValue }) => {
  const { autoUnzipContent } = useContentDisplay();
  const [displayValue, setDisplayValue] = useState<string>(() =>
    normalizeCellValue(rawValue)
  );

  useEffect(() => {
    let cancelled = false;
    const rawAsString = normalizeCellValue(rawValue);

    if (!autoUnzipContent || rawAsString === '-') {
      setDisplayValue(rawAsString);
      return () => {
        cancelled = true;
      };
    }

    void decodeContentForDisplay(rawAsString).then((decoded) => {
      if (cancelled) return;
      setDisplayValue(decoded.content);
    });

    return () => {
      cancelled = true;
    };
  }, [autoUnzipContent, rawValue]);

  return <>{displayValue}</>;
};

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
  const { autoUnzipContent } = useContentDisplay();
  const objectId = item.object_id ?? item.fields.id ?? '-';
  const isSelected = selectedId === objectId;
  const [maintenances, setMaintenances] = useState<CarMaintenance[]>([]);
  const revisions: ItemRevision[] = Array.isArray(item.fields.revisions)
    ? item.fields.revisions
        .map((entry: any) => ({
          previousDataItemId:
            typeof entry?.previousDataItemId === 'string'
              ? entry.previousDataItemId
              : '',
          source:
            entry?.source === 'revision_setting'
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

  useEffect(() => {
    let cancelled = false;
    const rawContent =
      typeof item.fields.content === 'string' ? item.fields.content : '';

    if (!rawContent) {
      setMaintenances([]);
      return () => {
        cancelled = true;
      };
    }

    if (!autoUnzipContent) {
      setMaintenances(parseMaintenancesFromContent(rawContent));
      return () => {
        cancelled = true;
      };
    }

    void decodeContentForDisplay(rawContent).then((decoded) => {
      if (cancelled) return;
      setMaintenances(parseMaintenancesFromContent(decoded.content));
    });

    return () => {
      cancelled = true;
    };
  }, [autoUnzipContent, item.fields.content]);

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
          const value = resolvePath(item.fields, col);

          return (
            <td key={idx} className="bp-value-cell">
              <div
                className={`collapsible ${expandedCells.has(cellId) ? 'expanded' : ''}`}
                onClick={() => toggleCell(cellId)}
              >
                <DecodedCellValue rawValue={value} />
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
