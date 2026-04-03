// File: ItemsTable.tsx
import React, { useState, useMemo, useEffect } from 'react';
import type { Item } from '../types';
import { copyToClipboard } from '../../utils/clipboard';
import ItemsTableRow from './table/ItemsTableRow';
import { buildObjectExplorerUrl } from '../../utils/explorer';

const PAGE_SIZE = 20;

type ItemsTableProps = {
  items?: Item[];
  error?: string;
  fieldsToShow?: string[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  disableSelect?: boolean;
  page: number;
  onPageChange: (page: number) => void;
  resetKey: string;
  label?: string;
  collapsed?: boolean;
  explorerUrl?: (objectId: string) => string; // <- pass function
  pageSize?: number;
  hasNextPage?: boolean;
  totalPages?: number | null;
  showObjectIdColumn?: boolean;
  latestRevisionOnly?: boolean;
  onToggleLatestRevisionOnly?: () => void;
  enableDetailToggle?: boolean;
  filterBar?: React.ReactNode;
};

const ItemsTable: React.FC<ItemsTableProps> = ({
  items = [],
  error,
  fieldsToShow,
  selectedId,
  onSelect,
  disableSelect = false,
  page,
  onPageChange,
  resetKey,
  label,
  collapsed = false,
  explorerUrl = buildObjectExplorerUrl,
  pageSize = PAGE_SIZE,
  hasNextPage,
  totalPages = null,
  showObjectIdColumn = true,
  latestRevisionOnly = false,
  onToggleLatestRevisionOnly,
  enableDetailToggle = false,
  filterBar,
}) => {
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const selectedLabel =
    label === 'Container' || label === 'Data Type'
      ? 'Selected:'
      : `Selected ${label ?? 'Item'}:`;

  useEffect(() => {
    setExpandedCells(new Set());
    setDetailsExpanded(true);
  }, [resetKey]);

  const pagedItems = items;

  const columns = useMemo(() => {
    if (fieldsToShow?.length) return fieldsToShow;
    return Array.from(new Set(items.flatMap(i => Object.keys(i.fields)))).sort();
  }, [items, fieldsToShow]);

  const toggleCell = (cellId: string) => {
    setExpandedCells(prev => {
      const next = new Set(prev);
      if (next.has(cellId)) {
        next.delete(cellId);
      } else {
        next.add(cellId);
      }
      return next;
    });
  };

  const canGoNext =
    typeof hasNextPage === 'boolean' ? hasNextPage : items.length >= pageSize;

  return (
    <div className="bp-items-root" style={{ position: 'relative' }}>
      {/* Top bar */}
      <div className="bp-items-toolbar" style={{ fontSize: collapsed ? 12 : 14 }}>
        <div className="bp-selected-cluster">
          <span>
            {selectedLabel}{' '}
            <strong>
              {selectedId ? `${selectedId.slice(0, 6)}...${selectedId.slice(-4)}` : '(none)'}
            </strong>
          </span>
          {selectedId && (
            <>
              <i className="bi bi-clipboard copy-icon" title="Copy ID" onClick={e => copyToClipboard(e, selectedId)} />
              <a
                href={explorerUrl(selectedId)}
                target="_blank"
                rel="noreferrer"
                title="Open in IOTA Explorer"
                className="explorer-icon"
              >
                <i className="bi bi-box-arrow-up-right" />
              </a>
            </>
          )}
        </div>
        <div className="bp-toolbar-actions">
          {onToggleLatestRevisionOnly && (
            <button
              type="button"
              className={`bp-toolbar-btn ${latestRevisionOnly ? 'is-active' : ''}`}
              onClick={onToggleLatestRevisionOnly}
              aria-pressed={latestRevisionOnly}
            >
              Latest Revision
            </button>
          )}
          {enableDetailToggle && (
            <button
              type="button"
              className={`bp-toolbar-btn ${detailsExpanded ? 'is-active' : ''}`}
              onClick={() => setDetailsExpanded((prev) => !prev)}
            >
              {detailsExpanded ? 'Collapse Details' : 'Expand Details'}
            </button>
          )}
        </div>
      </div>
      {filterBar}

      {error && <div className="error">{error}</div>}
      {items.length === 0 ? (
        <p className="empty-msg">No items found.</p>
      ) : (
        <div className="table-wrapper">
          <table className="bp-items-table">
            <thead>
              <tr>
                <th className="bp-select-col-header">Sel.</th>
                {showObjectIdColumn && <th>Object ID</th>}
                {columns.map(col => <th key={col}>{col}</th>)}
              </tr>
            </thead>
            <tbody>
              {pagedItems.map(item => (
                <ItemsTableRow
                  key={item.object_id ?? item.fields.id ?? '-'}
                  item={item}
                  columns={columns}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  disableSelect={disableSelect}
                  expandedCells={expandedCells}
                  toggleCell={toggleCell}
                  explorerUrl={explorerUrl} // <- pass function instead of string
                  showObjectIdColumn={showObjectIdColumn}
                  detailsExpanded={detailsExpanded}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="bp-items-pagination">
        {page > 0 && (
          <button
            type="button"
            className="bp-page-btn"
            onClick={() => onPageChange(page - 1)}
          >
            {'< page ' + page}
          </button>
        )}
        <span className="bp-page-indicator">
          Page {page + 1}
          {totalPages ? ` / ${Math.max(1, totalPages)}` : ''}
        </span>
        {canGoNext && (
          <button
            type="button"
            className="bp-page-btn"
            onClick={() => onPageChange(page + 1)}
          >
            {'page ' + (page + 2) + ' >'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ItemsTable;
