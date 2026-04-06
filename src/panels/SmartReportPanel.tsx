import { useMemo, useState } from 'react';
import {
  API_BASE,
  APP_INSTANCE_DOMAIN,
  SMART_REPORT_MAX_RECORDS,
} from '../Config.ts';

type SmartReportScope = 'container' | 'data_type' | 'data_item';
type FilterToggle = 'all' | 'with' | 'without';
type VerifiedFilter = 'all' | 'verified' | 'unverified';
type SortBy = 'created' | 'name' | 'external_index' | 'external_id';
type SortDirection = 'asc' | 'desc';

type SmartReportPanelProps = {
  accountAddress: string;
  selectedContainerId?: string | null;
  selectedDataTypeId?: string | null;
  selectedDataItemId?: string | null;
};

function resolveScope(
  selectedContainerId?: string | null,
  selectedDataTypeId?: string | null,
  selectedDataItemId?: string | null
): SmartReportScope | null {
  if (selectedDataItemId) return 'data_item';
  if (selectedDataTypeId) return 'data_type';
  if (selectedContainerId) return 'container';
  return null;
}

function scopeLabel(scope: SmartReportScope | null): string {
  if (scope === 'data_item') return 'Data Item';
  if (scope === 'data_type') return 'Data Type';
  if (scope === 'container') return 'Container';
  return 'No selection';
}

export function SmartReportPanel({
  accountAddress,
  selectedContainerId,
  selectedDataTypeId,
  selectedDataItemId,
}: SmartReportPanelProps) {
  const scope = useMemo(
    () =>
      resolveScope(selectedContainerId, selectedDataTypeId, selectedDataItemId),
    [selectedContainerId, selectedDataTypeId, selectedDataItemId]
  );

  const [dataItemQuery, setDataItemQuery] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState<VerifiedFilter>('all');
  const [revisionsFilter, setRevisionsFilter] = useState<FilterToggle>('all');
  const [verificationsFilter, setVerificationsFilter] =
    useState<FilterToggle>('all');
  const [sortBy, setSortBy] = useState<SortBy>('created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSuccessMessage, setLastSuccessMessage] = useState<string | null>(
    null
  );

  const canGenerate = !!scope;

  const downloadSmartReport = async () => {
    if (!scope) {
      setError(
        'Select a container, data type, or data item first. Report scope is based on your current selection.'
      );
      return;
    }

    setLoading(true);
    setError(null);
    setLastSuccessMessage(null);

    try {
      const params = new URLSearchParams({
        userAddress: accountAddress,
        scope,
        limit: String(SMART_REPORT_MAX_RECORDS),
      });

      if (APP_INSTANCE_DOMAIN) {
        params.set('domain', APP_INSTANCE_DOMAIN);
      }

      if (selectedContainerId) params.set('containerId', selectedContainerId);
      if (selectedDataTypeId) params.set('dataTypeId', selectedDataTypeId);
      if (selectedDataItemId) params.set('dataItemId', selectedDataItemId);

      if (scope === 'data_type') {
        const trimmedQuery = dataItemQuery.trim();
        if (trimmedQuery) {
          params.set('dataItemQuery', trimmedQuery);
        }

        if (verifiedFilter === 'verified') {
          params.set('dataItemVerified', 'true');
        } else if (verifiedFilter === 'unverified') {
          params.set('dataItemVerified', 'false');
        }

        if (revisionsFilter === 'with') {
          params.set('dataItemHasRevisions', 'true');
        } else if (revisionsFilter === 'without') {
          params.set('dataItemHasRevisions', 'false');
        }

        if (verificationsFilter === 'with') {
          params.set('dataItemHasVerifications', 'true');
        } else if (verificationsFilter === 'without') {
          params.set('dataItemHasVerifications', 'false');
        }

        params.set('dataItemSortBy', sortBy);
        params.set('dataItemSortDirection', sortDirection);
      }

      const response = await fetch(`${API_BASE}api/report/smart?${params.toString()}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(body || `Report request failed (HTTP ${response.status})`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `smart-report-${scope.replace('_', '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setLastSuccessMessage('Smart Report generated and downloaded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate Smart Report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="analytics-dashboard">
      <div
        style={{
          border: '1px solid rgba(139, 233, 253, 0.3)',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.02)',
          padding: '0.8rem',
          marginBottom: '0.8rem',
        }}
      >
        <h2 style={{ margin: '0 0 0.45rem 0' }}>Smart Report</h2>
        <p style={{ margin: '0 0 0.5rem 0', color: 'var(--comment)' }}>
          Generate a PDF report for your current selection context.
        </p>
        <p style={{ margin: '0 0 0.5rem 0' }}>
          Current scope: <strong>{scopeLabel(scope)}</strong>
        </p>
        <p style={{ margin: '0 0 0.25rem 0', color: 'var(--comment)' }}>
          Container: {selectedContainerId || '(not selected)'}
        </p>
        <p style={{ margin: '0 0 0.25rem 0', color: 'var(--comment)' }}>
          Data Type: {selectedDataTypeId || '(not selected)'}
        </p>
        <p style={{ margin: 0, color: 'var(--comment)' }}>
          Data Item: {selectedDataItemId || '(not selected)'}
        </p>
      </div>

      {scope === 'data_type' && (
        <div
          style={{
            border: '1px solid rgba(98, 114, 164, 0.35)',
            borderRadius: 12,
            background: 'rgba(98, 114, 164, 0.08)',
            padding: '0.8rem',
            marginBottom: '0.8rem',
          }}
        >
          <h3 style={{ margin: '0 0 0.45rem 0' }}>Data Item Filters For Report</h3>
          <p style={{ margin: '0 0 0.55rem 0', color: 'var(--comment)' }}>
            These filters are applied when reporting items inside the selected data type.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 8,
            }}
          >
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--comment)' }}>Search Query</span>
              <input
                value={dataItemQuery}
                onChange={(event) => setDataItemQuery(event.target.value)}
                placeholder="Name, description, external ID..."
              />
            </label>

            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--comment)' }}>Verified</span>
              <select
                value={verifiedFilter}
                onChange={(event) =>
                  setVerifiedFilter(event.target.value as VerifiedFilter)
                }
              >
                <option value="all">All</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </label>

            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--comment)' }}>Revisions</span>
              <select
                value={revisionsFilter}
                onChange={(event) =>
                  setRevisionsFilter(event.target.value as FilterToggle)
                }
              >
                <option value="all">All</option>
                <option value="with">With Revisions</option>
                <option value="without">Without Revisions</option>
              </select>
            </label>

            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--comment)' }}>Verifications</span>
              <select
                value={verificationsFilter}
                onChange={(event) =>
                  setVerificationsFilter(event.target.value as FilterToggle)
                }
              >
                <option value="all">All</option>
                <option value="with">With Verifications</option>
                <option value="without">Without Verifications</option>
              </select>
            </label>

            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--comment)' }}>Sort By</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortBy)}
              >
                <option value="created">Created On-chain</option>
                <option value="name">Name</option>
                <option value="external_index">External Index</option>
                <option value="external_id">External ID</option>
              </select>
            </label>

            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--comment)' }}>Sort Direction</span>
              <select
                value={sortDirection}
                onChange={(event) =>
                  setSortDirection(event.target.value as SortDirection)
                }
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </label>
          </div>
        </div>
      )}

      <div
        style={{
          border: '1px solid rgba(80, 250, 123, 0.28)',
          borderRadius: 12,
          background: 'rgba(80, 250, 123, 0.06)',
          padding: '0.8rem',
        }}
      >
        <p style={{ margin: '0 0 0.55rem 0' }}>
          The report includes up to <strong>{SMART_REPORT_MAX_RECORDS}</strong> records per request.
          If more records exist, the PDF will clearly mark it as limited.
        </p>
        <button
          type="button"
          className="btn primary"
          onClick={downloadSmartReport}
          disabled={!canGenerate || loading}
        >
          {loading ? 'Generating Smart Report...' : 'Generate Smart Report'}
        </button>

        {error && (
          <p style={{ marginTop: 8, color: 'var(--orange)' }}>{error}</p>
        )}
        {lastSuccessMessage && (
          <p style={{ marginTop: 8, color: 'var(--green)' }}>
            {lastSuccessMessage}
          </p>
        )}
      </div>
    </section>
  );
}
