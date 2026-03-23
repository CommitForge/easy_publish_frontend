import React, { useState } from 'react';
import type { CarMaintenance } from '../../types';

type CarMaintenanceTableProps = {
  maintenances: CarMaintenance[];
  parentObjectId: string;
};

const CarMaintenanceTable: React.FC<CarMaintenanceTableProps> = ({ maintenances, parentObjectId }) => {
  const [expanded, setExpanded] = useState(true);

  if (!maintenances || maintenances.length === 0) return null;

  return (
    <>
      {/* Collapsible header row */}
      <tr>
        <td colSpan={100} style={{ padding: 0, border: 'none' }}>
          <div
            style={{
              background: 'var(--bg-deep)',
              color: 'var(--green)',
              fontWeight: 'bold',
              cursor: 'pointer',
              padding: '6px 10px',
              userSelect: 'none',
              borderBottom: '1px solid var(--comment)',
            }}
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? '▼' : '▶'} Maintenances ({maintenances.length}) for {parentObjectId}
          </div>
        </td>
      </tr>

      {/* Inner table */}
      {expanded && (
        <tr>
          <td colSpan={100} style={{ padding: 0, border: 'none' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                tableLayout: 'fixed',
                background: 'var(--bg-alt)',
              }}
            >
              <thead>
                <tr style={{ background: 'var(--bg-deep)', color: 'var(--purple)' }}>
                  <th style={{ width: 40, padding: '4px 6px' }}>#</th>
                  <th style={{ padding: '4px 6px' }}>Date</th>
                  <th style={{ padding: '4px 6px' }}>Distance</th>
                  <th style={{ padding: '4px 6px' }}>Service</th>
                  <th style={{ padding: '4px 6px' }}>Cost</th>
                  <th style={{ padding: '4px 6px' }}>Parts</th>
                  <th style={{ padding: '4px 6px' }}>Performed By</th>
                  <th style={{ padding: '4px 6px' }}>Note</th>
                </tr>
              </thead>
              <tbody>
                {maintenances.map((m, idx) => (
                  <tr
                    key={`${parentObjectId}-maint-${idx}`}
                    style={{
                      fontSize: 13,
                      color: 'var(--fg)',
                      borderBottom: '1px solid var(--comment)',
                    }}
                  >
                    <td style={{ padding: '4px 6px' }}>{idx + 1}</td>
                    <td style={{ padding: '4px 6px' }}>{m.date}</td>
                    <td style={{ padding: '4px 6px' }}>{m.distance}</td>
                    <td style={{ padding: '4px 6px' }}>{m.service}</td>
                    <td style={{ padding: '4px 6px' }}>{m.cost}</td>
                    <td style={{ padding: '4px 6px' }}>{m.parts}</td>
                    <td style={{ padding: '4px 6px' }}>{m.performed_by}</td>
                    <td style={{ padding: '4px 6px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {m.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
};

export default CarMaintenanceTable;
