// File: ItemsTable.tsx
import React, { useState, useMemo, useEffect } from 'react';
import type { Item } from '../types';
import { copyToClipboard } from '../../utils/clipboard';
import 'bootstrap-icons/font/bootstrap-icons.css';
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
}) => {
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());

  useEffect(() => setExpandedCells(new Set()), [resetKey]);

  const pagedItems = items;

  const columns = useMemo(() => {
    if (fieldsToShow?.length) return fieldsToShow;
    return Array.from(new Set(items.flatMap(i => Object.keys(i.fields)))).sort();
  }, [items, fieldsToShow]);

  const toggleCell = (cellId: string) => {
    setExpandedCells(prev => {
      const next = new Set(prev);
      next.has(cellId) ? next.delete(cellId) : next.add(cellId);
      return next;
    });
  };

  return (
    <div className="bp-items-root" style={{ position: 'relative' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', fontSize: collapsed ? 12 : 14, marginBottom: 5, gap: 6 }}>
        <span>
          Selected {label ?? 'Item'}:{' '}
          {selectedId ? `${selectedId.slice(0, 6)}...${selectedId.slice(-4)}` : '(none)'}
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

      {error && <div className="error">{error}</div>}
      {items.length === 0 ? (
        <p className="empty-msg">No items found.</p>
      ) : (
        <div className="table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="table table-striped table-bordered table-sm">
            <thead>
              <tr>
                <th style={{ width: 40 }}>Sel.</th>
                <th>Object ID</th>
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
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div style={{ marginTop: 6, fontSize: 13 }}>
        {page > 0 && (
          <b style={{ cursor: 'pointer', marginRight: 8 }} onClick={() => onPageChange(page - 1)}>
            {'< page ' + page}
          </b>
        )}
        <span style={{ marginRight: 8 }}>Page {page + 1}</span>
        {items.length === PAGE_SIZE && (
          <b style={{ cursor: 'pointer' }} onClick={() => onPageChange(page + 1)}>
            {'page ' + (page + 2) + ' >'}
          </b>
        )}
      </div>
    </div>
  );
};

export default ItemsTable;
