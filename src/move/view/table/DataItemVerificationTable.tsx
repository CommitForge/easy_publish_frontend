import React, { useEffect, useState } from 'react';
import type { DataItemVerification } from '../../types';

type DataItemVerificationTableProps = {
  verifications: DataItemVerification[];
  parentObjectId: string;
  forceExpanded?: boolean;
};

function show(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

const DataItemVerificationTable: React.FC<DataItemVerificationTableProps> = ({
  verifications,
  parentObjectId,
  forceExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(forceExpanded);

  useEffect(() => {
    setExpanded(forceExpanded);
  }, [forceExpanded]);

  if (!verifications || verifications.length === 0) return null;

  return (
    <div className="bp-nested-table-block">
      <button
        type="button"
        className="bp-nested-table-toggle"
        onClick={() => setExpanded((e) => !e)}
      >
        <span className="bp-nested-table-caret">{expanded ? '▼' : '▶'}</span>
        <span>Data Item Verifications ({verifications.length})</span>
        <span className="bp-nested-table-parent-id">{parentObjectId}</span>
      </button>

      {expanded && (
        <div className="bp-nested-table-wrap">
          <table className="bp-nested-table">
            <thead>
              <tr>
                <th className="bp-nested-index-col">#</th>
                <th>Verification ID</th>
                <th>Name</th>
                <th>Description</th>
                <th>Verified</th>
                <th>Creator</th>
              </tr>
            </thead>
            <tbody>
              {verifications.map((verification, idx) => (
                <tr key={`${parentObjectId}-verif-${verification.id || idx}`}>
                  <td>{idx + 1}</td>
                  <td className="bp-nested-multiline">{show(verification.id)}</td>
                  <td className="bp-nested-multiline">{show(verification.name)}</td>
                  <td className="bp-nested-multiline">{show(verification.description)}</td>
                  <td>{show(verification.verified)}</td>
                  <td className="bp-nested-multiline">{show(verification.creatorAddr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DataItemVerificationTable;
