import React, { useEffect, useState } from 'react';
import type { ItemRevision } from '../../types';

type RevisionsTableProps = {
  revisions: ItemRevision[];
  parentObjectId: string;
  forceExpanded?: boolean;
};

const RevisionsTable: React.FC<RevisionsTableProps> = ({
  revisions,
  parentObjectId,
  forceExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(forceExpanded);

  useEffect(() => {
    setExpanded(forceExpanded);
  }, [forceExpanded]);

  if (!revisions || revisions.length === 0) return null;

  return (
    <div className="bp-nested-table-block">
      <button
        type="button"
        className="bp-nested-table-toggle"
        onClick={() => setExpanded((e) => !e)}
      >
        <span className="bp-nested-table-caret">{expanded ? '▼' : '▶'}</span>
        <span>Revisions ({revisions.length})</span>
        <span className="bp-nested-table-parent-id">{parentObjectId}</span>
      </button>

      {expanded && (
        <div className="bp-nested-table-wrap">
          <table className="bp-nested-table">
            <thead>
              <tr>
                <th className="bp-nested-index-col">#</th>
                <th>Previous Data Item ID</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {revisions.map((revision, idx) => (
                <tr key={`${parentObjectId}-revision-${revision.previousDataItemId}-${idx}`}>
                  <td>{idx + 1}</td>
                  <td className="bp-nested-multiline">{revision.previousDataItemId}</td>
                  <td>{revision.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RevisionsTable;
