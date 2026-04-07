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
type TemplateVariant = 'standard' | 'compact' | 'dense';
type ScopeFieldOption = { key: string; label: string };

type SmartReportPanelProps = {
  accountAddress: string;
  selectedContainerId?: string | null;
  selectedDataTypeId?: string | null;
  selectedDataItemId?: string | null;
};

const DEFAULT_TEXT_MAX_LENGTH = 200;
const MIN_TEXT_MAX_LENGTH = 40;
const MAX_TEXT_MAX_LENGTH = 4000;

const FIELD_OPTIONS_BY_SCOPE: Record<SmartReportScope, ScopeFieldOption[]> = {
  container: [
    { key: 'dataTypeName', label: 'Type Name' },
    { key: 'dataTypeId', label: 'Type ID' },
    { key: 'description', label: 'Description' },
    { key: 'externalId', label: 'External ID' },
    { key: 'creatorAddr', label: 'Creator Address' },
    { key: 'createdOnChain', label: 'Created On-chain' },
  ],
  data_type: [
    { key: 'dataItemName', label: 'Item Name' },
    { key: 'dataItemId', label: 'Item ID' },
    { key: 'verified', label: 'Verified' },
    { key: 'verificationCount', label: 'Verification Count' },
    { key: 'externalId', label: 'External ID' },
    { key: 'externalIndex', label: 'External Index' },
    { key: 'creatorAddr', label: 'Creator Address' },
    { key: 'createdOnChain', label: 'Created On-chain' },
    { key: 'description', label: 'Description' },
  ],
  data_item: [
    { key: 'containerRef', label: 'Container (summary)' },
    { key: 'dataTypeRef', label: 'Data Type (summary)' },
    { key: 'dataItemRef', label: 'Data Item (summary)' },
    { key: 'verified', label: 'Verified' },
    { key: 'externalId', label: 'External ID' },
    { key: 'externalIndex', label: 'External Index' },
    { key: 'creatorAddr', label: 'Creator Address' },
    { key: 'createdOnChain', label: 'Created On-chain' },
    { key: 'description', label: 'Description' },
    { key: 'contentPreview', label: 'Content Preview' },
    { key: 'verificationId', label: 'Verification ID' },
    { key: 'name', label: 'Verification Name' },
  ],
};

const DEFAULT_FIELDS_BY_SCOPE: Record<SmartReportScope, string[]> = {
  container: FIELD_OPTIONS_BY_SCOPE.container.map((option) => option.key),
  data_type: FIELD_OPTIONS_BY_SCOPE.data_type.map((option) => option.key),
  data_item: FIELD_OPTIONS_BY_SCOPE.data_item.map((option) => option.key),
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
  const [templateVariant, setTemplateVariant] =
    useState<TemplateVariant>('compact');
  const [compactOutput, setCompactOutput] = useState(true);
  const [textMaxLength, setTextMaxLength] = useState(DEFAULT_TEXT_MAX_LENGTH);
  const [selectedFieldsByScope, setSelectedFieldsByScope] = useState<
    Record<SmartReportScope, string[]>
  >({
    container: [...DEFAULT_FIELDS_BY_SCOPE.container],
    data_type: [...DEFAULT_FIELDS_BY_SCOPE.data_type],
    data_item: [...DEFAULT_FIELDS_BY_SCOPE.data_item],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSuccessMessage, setLastSuccessMessage] = useState<string | null>(
    null
  );

  const activeFieldOptions = scope ? FIELD_OPTIONS_BY_SCOPE[scope] : [];
  const activeSelectedFields = scope ? selectedFieldsByScope[scope] : [];
  const dataTypeScopeActive = scope === 'data_type';
  const canGenerate = !!scope && activeSelectedFields.length > 0;

  const updateFieldsForScope = (next: string[]) => {
    if (!scope) return;
    const allowedKeys = FIELD_OPTIONS_BY_SCOPE[scope].map((option) => option.key);
    const dedup = Array.from(new Set(next)).filter((key) =>
      allowedKeys.includes(key)
    );
    setSelectedFieldsByScope((prev) => ({ ...prev, [scope]: dedup }));
  };

  const downloadSmartReport = async () => {
    if (!scope) {
      setError(
        'Select a container, data type, or data item first. Report scope is based on your current selection.'
      );
      return;
    }
    if (activeSelectedFields.length === 0) {
      setError('Select at least one report field to include.');
      return;
    }

    setLoading(true);
    setError(null);
    setLastSuccessMessage(null);

    try {
      const safeTextMaxLength = Math.min(
        MAX_TEXT_MAX_LENGTH,
        Math.max(MIN_TEXT_MAX_LENGTH, textMaxLength || DEFAULT_TEXT_MAX_LENGTH)
      );
      const params = new URLSearchParams({
        userAddress: accountAddress,
        scope,
        limit: String(SMART_REPORT_MAX_RECORDS),
        compact: compactOutput ? 'true' : 'false',
        textMaxLength: String(safeTextMaxLength),
        templateVariant,
        fields: activeSelectedFields.join(','),
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

      <div
        style={{
          border: '1px solid rgba(98, 114, 164, 0.35)',
          borderRadius: 12,
          background: 'rgba(98, 114, 164, 0.08)',
          padding: '0.8rem',
          marginBottom: '0.8rem',
          opacity: dataTypeScopeActive ? 1 : 0.85,
        }}
      >
        <h3 style={{ margin: '0 0 0.45rem 0' }}>Data Item Filters For Report</h3>
        <p style={{ margin: '0 0 0.55rem 0', color: 'var(--comment)' }}>
          These are the classic Smart Report filters. They apply when scope is{' '}
          <strong>Data Type</strong>.
          {!dataTypeScopeActive
            ? ' Select a data type to activate them.'
            : ''}
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
              disabled={!dataTypeScopeActive}
            />
          </label>

          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--comment)' }}>Verified</span>
            <select
              value={verifiedFilter}
              onChange={(event) =>
                setVerifiedFilter(event.target.value as VerifiedFilter)
              }
              disabled={!dataTypeScopeActive}
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
              disabled={!dataTypeScopeActive}
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
              disabled={!dataTypeScopeActive}
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
              disabled={!dataTypeScopeActive}
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
              disabled={!dataTypeScopeActive}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>
        </div>
      </div>

      <div
        style={{
          border: '1px solid rgba(255, 184, 108, 0.35)',
          borderRadius: 12,
          background: 'rgba(255, 184, 108, 0.08)',
          padding: '0.8rem',
          marginBottom: '0.8rem',
        }}
      >
        <h3 style={{ margin: '0 0 0.45rem 0' }}>Report Output Settings</h3>
        <p style={{ margin: '0 0 0.55rem 0', color: 'var(--comment)' }}>
          Control included fields, layout density, and compact formatting.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--comment)' }}>
              Template Variant
            </span>
            <select
              value={templateVariant}
              onChange={(event) =>
                setTemplateVariant(event.target.value as TemplateVariant)
              }
            >
              <option value="standard">Standard</option>
              <option value="compact">Compact</option>
              <option value="dense">Dense</option>
            </select>
          </label>

          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--comment)' }}>
              Text Length Limit (compact mode)
            </span>
            <input
              type="number"
              min={MIN_TEXT_MAX_LENGTH}
              max={MAX_TEXT_MAX_LENGTH}
              value={textMaxLength}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                if (!Number.isFinite(parsed)) {
                  setTextMaxLength(DEFAULT_TEXT_MAX_LENGTH);
                  return;
                }
                setTextMaxLength(
                  Math.min(MAX_TEXT_MAX_LENGTH, Math.max(MIN_TEXT_MAX_LENGTH, parsed))
                );
              }}
            />
          </label>
        </div>

        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <input
            type="checkbox"
            checked={compactOutput}
            onChange={(event) => setCompactOutput(event.target.checked)}
          />
          <span>Compact output (addresses compacted, long text trimmed)</span>
        </label>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (!scope) return;
              updateFieldsForScope(DEFAULT_FIELDS_BY_SCOPE[scope]);
            }}
            disabled={!scope}
          >
            Select All Fields
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => updateFieldsForScope([])}
            disabled={!scope}
          >
            Clear Fields
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (!scope) return;
              updateFieldsForScope(DEFAULT_FIELDS_BY_SCOPE[scope]);
            }}
            disabled={!scope}
          >
            Reset Defaults
          </button>
        </div>

        {!scope ? (
          <p style={{ margin: 0, color: 'var(--comment)' }}>
            Select container, data type, or data item to edit field list.
          </p>
        ) : (
          <>
            <p style={{ margin: '0 0 0.4rem 0', color: 'var(--comment)' }}>
              Fields for current scope ({scopeLabel(scope)}):
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 6,
              }}
            >
              {activeFieldOptions.map((option) => {
                const checked = activeSelectedFields.includes(option.key);
                return (
                  <label
                    key={option.key}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      fontSize: 13,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        if (!scope) return;
                        if (event.target.checked) {
                          updateFieldsForScope([...activeSelectedFields, option.key]);
                        } else {
                          updateFieldsForScope(
                            activeSelectedFields.filter((key) => key !== option.key)
                          );
                        }
                      }}
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
            <p style={{ margin: '0.5rem 0 0 0', color: 'var(--comment)' }}>
              Selected fields: {activeSelectedFields.length}
            </p>
          </>
        )}
      </div>

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
        <p style={{ margin: '0 0 0.55rem 0', color: 'var(--comment)' }}>
          Compact output is <strong>{compactOutput ? 'ON' : 'OFF'}</strong>, text limit is{' '}
          <strong>{textMaxLength}</strong>, template is <strong>{templateVariant}</strong>.
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
