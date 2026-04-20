import { useEffect, useMemo, useState } from 'react';
import { API_BASE } from '../Config.ts';

type ErpIntegration = {
  id: string;
  ownerAddress?: string;
  name: string;
  description?: string;
  status?: string;
  webhookUrl?: string;
  defaultContainerId?: string;
  defaultDataTypeId?: string;
  cliBinary?: string;
  cliScript?: string;
  cliWorkingDirectory?: string;
  cliNetwork?: string;
  cliPrivateKeyEnvVar?: string;
  apiKey?: string;
  apiKeyHint?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ErpRecord = {
  id: string;
  externalRecordId?: string;
  recordName?: string;
  recordDescription?: string;
  containerId?: string;
  dataTypeId?: string;
  publishStatus?: string;
  validationStatus?: string;
  linkedDataItemId?: string;
  zipBlobId?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ErpJob = {
  id: string;
  recordId: string;
  status?: string;
  dryRun?: boolean;
  txDigest?: string;
  resultDataItemId?: string;
  syncMessage?: string;
  syncCheckedAt?: string;
  updatedAt?: string;
  cliExitCode?: number;
};

type ErpCandidate = {
  id: string;
  recordId?: string;
  dataItemId?: string;
  reason?: string;
  status?: string;
  suggestedRecipientsCsv?: string;
  existingVerificationIdsCsv?: string;
  updatedAt?: string;
};

type ErpIntegrationPanelProps = {
  accountAddress: string;
  selectedContainerId?: string | null;
  selectedDataTypeId?: string | null;
};

type RecordDraft = {
  externalRecordId: string;
  recordName: string;
  recordDescription: string;
  containerId: string;
  dataTypeId: string;
  contentRaw: string;
  metadataJson: string;
  recipientsCsv: string;
  referencesCsv: string;
  tagsCsv: string;
  shouldPublish: boolean;
};

type IntegrationDraft = {
  name: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PAUSED';
  webhookUrl: string;
  defaultContainerId: string;
  defaultDataTypeId: string;
  cliBinary: string;
  cliScript: string;
  cliWorkingDirectory: string;
  cliNetwork: string;
  cliPrivateKeyEnvVar: string;
};

const RECORD_STATUS_OPTIONS = ['', 'NEW', 'CHECKED', 'WAITING_SYNC', 'PUBLISHED', 'FAILED', 'SKIPPED'];
const JOB_STATUS_OPTIONS = [
  '',
  'RUNNING_CLI',
  'CLI_FAILED',
  'WAITING_SYNC',
  'SYNCED',
  'DRY_RUN_OK',
  'VALIDATION_FAILED',
  'SKIPPED',
];
const CANDIDATE_STATUS_OPTIONS = ['', 'OPEN', 'RESOLVED', 'IGNORED'];

function buildUrl(
  path: string,
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'string') {
      if (value.trim()) {
        query.set(key, value.trim());
      }
      return;
    }
    query.set(key, String(value));
  });
  return query.size > 0 ? `${API_BASE}${path}?${query.toString()}` : `${API_BASE}${path}`;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    let message = `Request failed (HTTP ${response.status})`;
    if (response.status === 404 && url.includes('/api/erp')) {
      message = `${message}: ERP endpoint not found (backend ERP API may be disabled; set app.erp.api.enabled=true).`;
    }
    try {
      const text = await response.text();
      if (text) message = `${message}: ${text}`;
    } catch {
      // keep default
    }
    throw new Error(message);
  }
  if (response.status === 204) {
    return null as T;
  }
  return (await response.json()) as T;
}

function emptyRecordDraft(containerId?: string | null, dataTypeId?: string | null): RecordDraft {
  return {
    externalRecordId: '',
    recordName: '',
    recordDescription: '',
    containerId: containerId ?? '',
    dataTypeId: dataTypeId ?? '',
    contentRaw: '',
    metadataJson: '',
    recipientsCsv: '',
    referencesCsv: '',
    tagsCsv: '',
    shouldPublish: true,
  };
}

function defaultIntegrationDraft(
  selectedContainerId?: string | null,
  selectedDataTypeId?: string | null
): IntegrationDraft {
  return {
    name: '',
    description: '',
    status: 'ACTIVE',
    webhookUrl: '',
    defaultContainerId: selectedContainerId ?? '',
    defaultDataTypeId: selectedDataTypeId ?? '',
    cliBinary: 'node',
    cliScript: '',
    cliWorkingDirectory: '.',
    cliNetwork: 'mainnet',
    cliPrivateKeyEnvVar: 'IOTA_PRIVATE_KEY',
  };
}

function toIntegrationDraft(
  integration: ErpIntegration,
  selectedContainerId?: string | null,
  selectedDataTypeId?: string | null
): IntegrationDraft {
  return {
    name: integration.name ?? '',
    description: integration.description ?? '',
    status:
      integration.status === 'INACTIVE' || integration.status === 'PAUSED'
        ? integration.status
        : 'ACTIVE',
    webhookUrl: integration.webhookUrl ?? '',
    defaultContainerId: integration.defaultContainerId ?? selectedContainerId ?? '',
    defaultDataTypeId: integration.defaultDataTypeId ?? selectedDataTypeId ?? '',
    cliBinary: integration.cliBinary ?? 'node',
    cliScript: integration.cliScript ?? '',
    cliWorkingDirectory: integration.cliWorkingDirectory ?? '.',
    cliNetwork: integration.cliNetwork ?? 'mainnet',
    cliPrivateKeyEnvVar: integration.cliPrivateKeyEnvVar ?? 'IOTA_PRIVATE_KEY',
  };
}

const shortId = (value?: string, head = 10, tail = 6) => {
  if (!value) return '-';
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
};

export function ErpIntegrationPanel({
  accountAddress,
  selectedContainerId,
  selectedDataTypeId,
}: ErpIntegrationPanelProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [integrations, setIntegrations] = useState<ErpIntegration[]>([]);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>('');
  const [createdApiKey, setCreatedApiKey] = useState<string>('');
  const [integrationApiKey, setIntegrationApiKey] = useState<string>('');
  const [integrationDraft, setIntegrationDraft] = useState<IntegrationDraft>(() =>
    defaultIntegrationDraft(selectedContainerId, selectedDataTypeId)
  );

  const [records, setRecords] = useState<ErpRecord[]>([]);
  const [recordDraft, setRecordDraft] = useState<RecordDraft>(() =>
    emptyRecordDraft(selectedContainerId, selectedDataTypeId)
  );
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [recordStatusFilter, setRecordStatusFilter] = useState<string>('');
  const [recordQueryFilter, setRecordQueryFilter] = useState<string>('');
  const [unzipPreview, setUnzipPreview] = useState<string>('');

  const [jobs, setJobs] = useState<ErpJob[]>([]);
  const [jobStatusFilter, setJobStatusFilter] = useState<string>('');
  const [candidates, setCandidates] = useState<ErpCandidate[]>([]);
  const [candidateStatusFilter, setCandidateStatusFilter] = useState<string>('');

  const selectedIntegration = useMemo(
    () => integrations.find((entry) => entry.id === selectedIntegrationId) ?? null,
    [integrations, selectedIntegrationId]
  );

  const erpAuthHeaders = (): Record<string, string> => {
    const key = integrationApiKey.trim();
    return key ? { 'X-ERP-API-KEY': key } : {};
  };

  const withErpAuthHeaders = (headers?: Record<string, string>): Record<string, string> => ({
    ...(headers ?? {}),
    ...erpAuthHeaders(),
  });

  const erpKpis = useMemo(() => {
    const waitingSyncJobs = jobs.filter((job) => job.status === 'WAITING_SYNC').length;
    const syncedJobs = jobs.filter((job) => job.status === 'SYNCED').length;
    const openCandidates = candidates.filter((candidate) => candidate.status === 'OPEN').length;
    const resolvedCandidates = candidates.filter(
      (candidate) => candidate.status === 'RESOLVED'
    ).length;

    return {
      connectors: integrations.length,
      records: records.length,
      waitingSyncJobs,
      syncedJobs,
      openCandidates,
      resolvedCandidates,
    };
  }, [integrations, records, jobs, candidates]);

  useEffect(() => {
    if (!integrationDraft.defaultContainerId && selectedContainerId) {
      setIntegrationDraft((prev) => ({ ...prev, defaultContainerId: selectedContainerId }));
    }
    if (!integrationDraft.defaultDataTypeId && selectedDataTypeId) {
      setIntegrationDraft((prev) => ({ ...prev, defaultDataTypeId: selectedDataTypeId }));
    }
  }, [
    selectedContainerId,
    selectedDataTypeId,
    integrationDraft.defaultContainerId,
    integrationDraft.defaultDataTypeId,
  ]);

  useEffect(() => {
    if (!recordDraft.containerId && selectedContainerId) {
      setRecordDraft((prev) => ({ ...prev, containerId: selectedContainerId }));
    }
    if (!recordDraft.dataTypeId && selectedDataTypeId) {
      setRecordDraft((prev) => ({ ...prev, dataTypeId: selectedDataTypeId }));
    }
  }, [selectedContainerId, selectedDataTypeId, recordDraft.containerId, recordDraft.dataTypeId]);

  const loadIntegrations = async () => {
    const list = await requestJson<ErpIntegration[]>(
      buildUrl('api/erp/integrations', { ownerAddress: accountAddress }),
      { headers: erpAuthHeaders() }
    );
    setIntegrations(list);
    setSelectedIntegrationId((prev) => {
      if (prev && list.some((item) => item.id === prev)) {
        return prev;
      }
      return list[0]?.id ?? '';
    });
  };

  const loadIntegrationDetails = async (integrationId: string) => {
    const detail = await requestJson<ErpIntegration>(
      buildUrl(`api/erp/integrations/${integrationId}`, {
        ownerAddress: accountAddress,
      }),
      { headers: erpAuthHeaders() }
    );
    setIntegrationDraft(toIntegrationDraft(detail, selectedContainerId, selectedDataTypeId));
    setIntegrations((prev) =>
      prev.map((entry) => (entry.id === detail.id ? { ...entry, ...detail } : entry))
    );
  };

  const loadRecords = async (integrationId: string) => {
    const list = await requestJson<ErpRecord[]>(
      buildUrl('api/erp/records', {
        integrationId,
        ownerAddress: accountAddress,
        publishStatus: recordStatusFilter || null,
        query: recordQueryFilter || null,
      }),
      { headers: erpAuthHeaders() }
    );
    setRecords(list);
    setSelectedRecordId((prev) => {
      if (prev && list.some((entry) => entry.id === prev)) {
        return prev;
      }
      return list[0]?.id ?? '';
    });
  };

  const loadJobs = async (integrationId: string) => {
    const list = await requestJson<ErpJob[]>(
      buildUrl('api/erp/jobs', {
        integrationId,
        ownerAddress: accountAddress,
        status: jobStatusFilter || null,
      }),
      { headers: erpAuthHeaders() }
    );
    setJobs(list);
  };

  const loadCandidates = async (integrationId: string) => {
    const list = await requestJson<ErpCandidate[]>(
      buildUrl('api/erp/verifications/candidates', {
        integrationId,
        ownerAddress: accountAddress,
        status: candidateStatusFilter || null,
      }),
      { headers: erpAuthHeaders() }
    );
    setCandidates(list);
  };

  const reloadIntegrationScopedData = async (integrationId: string) => {
    await Promise.all([loadRecords(integrationId), loadJobs(integrationId), loadCandidates(integrationId)]);
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    setMessage(null);
    void loadIntegrations()
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load ERP integrations'))
      .finally(() => setLoading(false));
  }, [accountAddress, integrationApiKey]);

  useEffect(() => {
    if (!selectedIntegrationId) {
      setRecords([]);
      setJobs([]);
      setCandidates([]);
      setSelectedRecordId('');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    setUnzipPreview('');
    void Promise.all([
      loadIntegrationDetails(selectedIntegrationId),
      reloadIntegrationScopedData(selectedIntegrationId),
    ])
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load ERP integration data'))
      .finally(() => setLoading(false));
  }, [
    selectedIntegrationId,
    recordStatusFilter,
    recordQueryFilter,
    jobStatusFilter,
    candidateStatusFilter,
    integrationApiKey,
  ]);

  const run = async (task: () => Promise<void>, successMessage: string) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await task();
      setMessage(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ERP request failed');
    } finally {
      setLoading(false);
    }
  };

  const createIntegration = () =>
    run(async () => {
      const created = await requestJson<ErpIntegration>(`${API_BASE}api/erp/integrations`, {
        method: 'POST',
        headers: withErpAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          ownerAddress: accountAddress,
          name: integrationDraft.name,
          description: integrationDraft.description,
          webhookUrl: integrationDraft.webhookUrl,
          defaultContainerId: integrationDraft.defaultContainerId,
          defaultDataTypeId: integrationDraft.defaultDataTypeId,
          cliBinary: integrationDraft.cliBinary,
          cliScript: integrationDraft.cliScript,
          cliWorkingDirectory: integrationDraft.cliWorkingDirectory,
          cliNetwork: integrationDraft.cliNetwork,
          cliPrivateKeyEnvVar: integrationDraft.cliPrivateKeyEnvVar,
        }),
      });
      setCreatedApiKey(created.apiKey ?? '');
      setIntegrationApiKey(created.apiKey ?? '');
      await loadIntegrations();
      if (created.id) setSelectedIntegrationId(created.id);
    }, 'ERP integration created.');

  const updateIntegration = () => {
    if (!selectedIntegrationId) return;
    return run(async () => {
      await requestJson(
        buildUrl(`api/erp/integrations/${selectedIntegrationId}`, {
          ownerAddress: accountAddress,
        }),
        {
          method: 'PATCH',
          headers: withErpAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            ...integrationDraft,
          }),
        }
      );
      await loadIntegrations();
    }, 'Integration settings updated.');
  };

  const rotateKey = () => {
    if (!selectedIntegrationId) return;
    return run(async () => {
      const response = await requestJson<ErpIntegration>(
        buildUrl(`api/erp/integrations/${selectedIntegrationId}/rotate-key`, {
          ownerAddress: accountAddress,
        }),
        { method: 'POST', headers: withErpAuthHeaders() }
      );
      setCreatedApiKey(response.apiKey ?? '');
      setIntegrationApiKey(response.apiKey ?? '');
      await loadIntegrations();
    }, 'API key rotated.');
  };

  const saveRecord = () => {
    if (!selectedIntegrationId) return;
    return run(async () => {
      await requestJson(buildUrl('api/erp/records', { ownerAddress: accountAddress }), {
        method: 'POST',
        headers: withErpAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          integrationId: selectedIntegrationId,
          ...recordDraft,
        }),
      });
      setRecordDraft(emptyRecordDraft(selectedContainerId, selectedDataTypeId));
      await loadRecords(selectedIntegrationId);
    }, 'ERP record saved.');
  };

  const runRecordAction = (action: 'check' | 'compact' | 'zip' | 'unzip') => {
    if (!selectedIntegrationId || !selectedRecordId) return;
    return run(async () => {
      const result = await requestJson<{ unzippedContent?: string }>(
        buildUrl(`api/erp/records/${selectedRecordId}/${action}`, {
          integrationId: selectedIntegrationId,
          ownerAddress: accountAddress,
        }),
        { method: 'POST', headers: withErpAuthHeaders() }
      );
      if (action === 'unzip') {
        setUnzipPreview(result.unzippedContent ?? '');
      } else {
        setUnzipPreview('');
      }
      await loadRecords(selectedIntegrationId);
    }, `Record ${action} finished.`);
  };

  const publishSelected = (dryRun: boolean) => {
    if (!selectedIntegrationId || !selectedRecordId) return;
    return run(async () => {
      await requestJson(buildUrl('api/erp/jobs/publish', { ownerAddress: accountAddress }), {
        method: 'POST',
        headers: withErpAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          integrationId: selectedIntegrationId,
          recordIds: [selectedRecordId],
          dryRun,
        }),
      });
      await reloadIntegrationScopedData(selectedIntegrationId);
    }, dryRun ? 'Dry-run publish executed.' : 'Publish job submitted.');
  };

  const refreshSync = () => {
    if (!selectedIntegrationId) return;
    return run(async () => {
      await requestJson(
        buildUrl('api/erp/jobs/sync-refresh', {
          integrationId: selectedIntegrationId,
          ownerAddress: accountAddress,
        }),
        { method: 'POST', headers: withErpAuthHeaders() }
      );
      await reloadIntegrationScopedData(selectedIntegrationId);
    }, 'Sync refresh completed.');
  };

  const runDiagnostics = () => {
    if (!selectedIntegrationId) return;
    return run(async () => {
      const response = await requestJson<{ exitCode?: number; stdout?: string; stderr?: string }>(
        buildUrl('api/erp/jobs/diagnostics', {
          integrationId: selectedIntegrationId,
          ownerAddress: accountAddress,
        }),
        { method: 'POST', headers: withErpAuthHeaders() }
      );
      await loadJobs(selectedIntegrationId);
      if (typeof response.exitCode === 'number') {
        setMessage(`CLI diagnostics completed (exit code ${response.exitCode}).`);
      }
    }, 'CLI diagnostics completed.');
  };

  const retryJob = (jobId: string) => {
    if (!selectedIntegrationId || !jobId) return;
    return run(async () => {
      await requestJson(
        buildUrl(`api/erp/jobs/${jobId}/retry`, {
          integrationId: selectedIntegrationId,
          ownerAddress: accountAddress,
        }),
        { method: 'POST', headers: withErpAuthHeaders() }
      );
      await loadJobs(selectedIntegrationId);
      await loadRecords(selectedIntegrationId);
    }, 'Job retried.');
  };

  const syncCheckJob = (jobId: string) => {
    if (!selectedIntegrationId || !jobId) return;
    return run(async () => {
      await requestJson(
        buildUrl(`api/erp/jobs/${jobId}/sync-check`, {
          integrationId: selectedIntegrationId,
          ownerAddress: accountAddress,
        }),
        { method: 'POST', headers: withErpAuthHeaders() }
      );
      await loadJobs(selectedIntegrationId);
      await loadRecords(selectedIntegrationId);
    }, 'Job sync-check finished.');
  };

  const refreshCandidates = () => {
    if (!selectedIntegrationId) return;
    return run(async () => {
      await requestJson(
        buildUrl('api/erp/verifications/candidates/refresh', {
          integrationId: selectedIntegrationId,
          ownerAddress: accountAddress,
        }),
        { method: 'POST', headers: withErpAuthHeaders() }
      );
      await loadCandidates(selectedIntegrationId);
    }, 'Verification candidates refreshed.');
  };

  const updateCandidateStatus = (candidateId: string, status: 'OPEN' | 'RESOLVED' | 'IGNORED') => {
    if (!selectedIntegrationId) return;
    return run(async () => {
      await requestJson(
        buildUrl(`api/erp/verifications/candidates/${candidateId}`, {
          integrationId: selectedIntegrationId,
          ownerAddress: accountAddress,
        }),
        {
          method: 'PATCH',
          headers: withErpAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ status }),
        }
      );
      await loadCandidates(selectedIntegrationId);
    }, `Candidate marked ${status}.`);
  };

  return (
    <div className="erp-panel">
      <div className="erp-header">
        <h2>ERP Integration (Work in Progress)</h2>
        <div className="analytics-muted">
          Independent ERP module with dedicated `erp_*` tables, backend API, CLI publishing jobs, sync wait, and verification candidate tracking.
        </div>
      </div>

      {error && <div className="analytics-error">{error}</div>}
      {message && <div className="erp-message">{message}</div>}
      {loading && <div className="analytics-muted">Working...</div>}

      <section className="analytics-section">
        <h3>ERP Connector Health</h3>
        <div className="analytics-kpi-grid analytics-kpi-grid--compact">
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">ERP Connectors</div>
            <div className="analytics-kpi-value">{erpKpis.connectors}</div>
          </div>
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Staged Records</div>
            <div className="analytics-kpi-value">{erpKpis.records}</div>
          </div>
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Waiting Sync</div>
            <div className="analytics-kpi-value">{erpKpis.waitingSyncJobs}</div>
          </div>
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Synced Jobs</div>
            <div className="analytics-kpi-value">{erpKpis.syncedJobs}</div>
          </div>
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Open Candidates</div>
            <div className="analytics-kpi-value">{erpKpis.openCandidates}</div>
          </div>
          <div className="analytics-kpi-card">
            <div className="analytics-kpi-label">Resolved Candidates</div>
            <div className="analytics-kpi-value">{erpKpis.resolvedCandidates}</div>
          </div>
        </div>
      </section>

      <section className="analytics-section">
        <h3>Integrations</h3>
        <div className="erp-grid">
          <input
            placeholder="Integration name"
            value={integrationDraft.name}
            onChange={(e) => setIntegrationDraft((p) => ({ ...p, name: e.target.value }))}
          />
          <input
            placeholder="Description"
            value={integrationDraft.description}
            onChange={(e) => setIntegrationDraft((p) => ({ ...p, description: e.target.value }))}
          />
          <input
            placeholder="Webhook URL"
            value={integrationDraft.webhookUrl}
            onChange={(e) => setIntegrationDraft((p) => ({ ...p, webhookUrl: e.target.value }))}
          />
          <select
            value={integrationDraft.status}
            onChange={(e) =>
              setIntegrationDraft((p) => ({
                ...p,
                status:
                  e.target.value === 'INACTIVE' || e.target.value === 'PAUSED'
                    ? e.target.value
                    : 'ACTIVE',
              }))
            }
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAUSED">PAUSED</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
          <input
            placeholder="Default container ID"
            value={integrationDraft.defaultContainerId}
            onChange={(e) => setIntegrationDraft((p) => ({ ...p, defaultContainerId: e.target.value }))}
          />
          <input
            placeholder="Default data type ID"
            value={integrationDraft.defaultDataTypeId}
            onChange={(e) => setIntegrationDraft((p) => ({ ...p, defaultDataTypeId: e.target.value }))}
          />
          <input
            placeholder="CLI binary"
            value={integrationDraft.cliBinary}
            onChange={(e) => setIntegrationDraft((p) => ({ ...p, cliBinary: e.target.value }))}
          />
          <input
            placeholder="CLI script path"
            value={integrationDraft.cliScript}
            onChange={(e) => setIntegrationDraft((p) => ({ ...p, cliScript: e.target.value }))}
          />
          <input
            placeholder="CLI working dir"
            value={integrationDraft.cliWorkingDirectory}
            onChange={(e) => setIntegrationDraft((p) => ({ ...p, cliWorkingDirectory: e.target.value }))}
          />
          <input
            placeholder="CLI network"
            value={integrationDraft.cliNetwork}
            onChange={(e) => setIntegrationDraft((p) => ({ ...p, cliNetwork: e.target.value }))}
          />
          <input
            placeholder="Private key env var"
            value={integrationDraft.cliPrivateKeyEnvVar}
            onChange={(e) => setIntegrationDraft((p) => ({ ...p, cliPrivateKeyEnvVar: e.target.value }))}
          />
          <button type="button" onClick={createIntegration}>
            Create Integration
          </button>
        </div>

        {createdApiKey && (
          <div className="erp-key-box">
            New API key: <code>{createdApiKey}</code>
          </div>
        )}

        <div className="erp-row">
          <label>
            ERP API Key:
            <input
              type="password"
              value={integrationApiKey}
              onChange={(e) => setIntegrationApiKey(e.target.value)}
              placeholder="Paste integration API key"
            />
          </label>
          <label>
            Active Integration:
            <select value={selectedIntegrationId} onChange={(e) => setSelectedIntegrationId(e.target.value)}>
              <option value="">Select integration</option>
              {integrations.map((integration) => (
                <option key={integration.id} value={integration.id}>
                  {integration.name} ({integration.status})
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={updateIntegration} disabled={!selectedIntegrationId}>
            Save Settings
          </button>
          <button type="button" onClick={rotateKey} disabled={!selectedIntegrationId}>
            Rotate API Key
          </button>
        </div>

        {selectedIntegration && (
          <div className="analytics-muted">
            API key hint: {selectedIntegration.apiKeyHint ?? 'n/a'} · CLI: {selectedIntegration.cliBinary ?? 'node'}{' '}
            {selectedIntegration.cliScript ?? '(script not set)'}
          </div>
        )}
      </section>

      <section className="analytics-section">
        <h3>Record Staging</h3>
        <div className="erp-grid">
          <input
            placeholder="External record ID"
            value={recordDraft.externalRecordId}
            onChange={(e) => setRecordDraft((p) => ({ ...p, externalRecordId: e.target.value }))}
          />
          <input
            placeholder="Record name"
            value={recordDraft.recordName}
            onChange={(e) => setRecordDraft((p) => ({ ...p, recordName: e.target.value }))}
          />
          <input
            placeholder="Container ID"
            value={recordDraft.containerId}
            onChange={(e) => setRecordDraft((p) => ({ ...p, containerId: e.target.value }))}
          />
          <input
            placeholder="Data Type ID"
            value={recordDraft.dataTypeId}
            onChange={(e) => setRecordDraft((p) => ({ ...p, dataTypeId: e.target.value }))}
          />
          <input
            placeholder="Recipients CSV"
            value={recordDraft.recipientsCsv}
            onChange={(e) => setRecordDraft((p) => ({ ...p, recipientsCsv: e.target.value }))}
          />
          <input
            placeholder="References CSV"
            value={recordDraft.referencesCsv}
            onChange={(e) => setRecordDraft((p) => ({ ...p, referencesCsv: e.target.value }))}
          />
          <input
            placeholder="Tags CSV"
            value={recordDraft.tagsCsv}
            onChange={(e) => setRecordDraft((p) => ({ ...p, tagsCsv: e.target.value }))}
          />
          <textarea
            placeholder="Description"
            value={recordDraft.recordDescription}
            onChange={(e) => setRecordDraft((p) => ({ ...p, recordDescription: e.target.value }))}
          />
          <textarea
            placeholder="JSON metadata (optional)"
            value={recordDraft.metadataJson}
            onChange={(e) => setRecordDraft((p) => ({ ...p, metadataJson: e.target.value }))}
          />
          <textarea
            className="erp-content-input"
            placeholder="Record content"
            value={recordDraft.contentRaw}
            onChange={(e) => setRecordDraft((p) => ({ ...p, contentRaw: e.target.value }))}
          />
          <label className="erp-checkbox">
            <input
              type="checkbox"
              checked={recordDraft.shouldPublish}
              onChange={(e) => setRecordDraft((p) => ({ ...p, shouldPublish: e.target.checked }))}
            />
            Should publish on-chain
          </label>
          <button type="button" onClick={saveRecord} disabled={!selectedIntegrationId}>
            Save Record
          </button>
        </div>

        <div className="erp-row">
          <label>
            Record Status Filter:
            <select
              value={recordStatusFilter}
              onChange={(e) => setRecordStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              {RECORD_STATUS_OPTIONS.filter(Boolean).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label>
            Search:
            <input
              value={recordQueryFilter}
              onChange={(e) => setRecordQueryFilter(e.target.value)}
              placeholder="name, external ID, container..."
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setRecordStatusFilter('');
              setRecordQueryFilter('');
            }}
          >
            Clear Filters
          </button>
        </div>

        <div className="erp-row">
          <label>
            Selected Record:
            <select value={selectedRecordId} onChange={(e) => setSelectedRecordId(e.target.value)}>
              <option value="">Select record</option>
              {records.map((record) => (
                <option key={record.id} value={record.id}>
                  {(record.recordName ?? record.externalRecordId ?? shortId(record.id)).trim()} ({record.publishStatus ??
                    'NEW'})
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => runRecordAction('check')} disabled={!selectedRecordId}>
            Check
          </button>
          <button type="button" onClick={() => runRecordAction('compact')} disabled={!selectedRecordId}>
            Compact
          </button>
          <button type="button" onClick={() => runRecordAction('zip')} disabled={!selectedRecordId}>
            Zip
          </button>
          <button type="button" onClick={() => runRecordAction('unzip')} disabled={!selectedRecordId}>
            Unzip
          </button>
          <button type="button" onClick={() => publishSelected(true)} disabled={!selectedRecordId}>
            Dry-Run Publish
          </button>
          <button type="button" onClick={() => publishSelected(false)} disabled={!selectedRecordId}>
            Publish
          </button>
        </div>

        {unzipPreview && <textarea className="erp-content-input" value={unzipPreview} readOnly />}
      </section>

      <section className="analytics-section">
        <h3>Publish Jobs & Sync</h3>
        <div className="erp-row">
          <label>
            Job Status Filter:
            <select value={jobStatusFilter} onChange={(e) => setJobStatusFilter(e.target.value)}>
              <option value="">All</option>
              {JOB_STATUS_OPTIONS.filter(Boolean).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={refreshSync} disabled={!selectedIntegrationId}>
            Refresh Sync State
          </button>
          <button type="button" onClick={runDiagnostics} disabled={!selectedIntegrationId}>
            CLI Diagnostics
          </button>
        </div>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Job</th>
              <th>Record</th>
              <th>Status</th>
              <th>Exit</th>
              <th>Tx</th>
              <th>Synced Item</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr>
                <td colSpan={7} className="analytics-muted">
                  No jobs yet.
                </td>
              </tr>
            )}
            {jobs.map((job) => (
              <tr key={job.id}>
                <td title={job.id}>{shortId(job.id, 8, 4)}</td>
                <td title={job.recordId}>{shortId(job.recordId, 8, 4)}</td>
                <td>{job.status ?? '-'}</td>
                <td>{typeof job.cliExitCode === 'number' ? job.cliExitCode : '-'}</td>
                <td title={job.txDigest}>{shortId(job.txDigest, 12, 4)}</td>
                <td title={job.resultDataItemId}>{shortId(job.resultDataItemId, 12, 4)}</td>
                <td className="erp-actions-cell">
                  <button type="button" onClick={() => syncCheckJob(job.id)}>
                    Sync Check
                  </button>
                  <button type="button" onClick={() => retryJob(job.id)}>
                    Retry
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="analytics-section">
        <h3>Potential Verifications</h3>
        <div className="erp-row">
          <label>
            Candidate Status Filter:
            <select
              value={candidateStatusFilter}
              onChange={(e) => setCandidateStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              {CANDIDATE_STATUS_OPTIONS.filter(Boolean).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={refreshCandidates} disabled={!selectedIntegrationId}>
            Refresh Candidates
          </button>
        </div>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Data Item</th>
              <th>Status</th>
              <th>Reason</th>
              <th>Suggested Recipients</th>
              <th>Existing Verifications</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {candidates.length === 0 && (
              <tr>
                <td colSpan={7} className="analytics-muted">
                  No candidates.
                </td>
              </tr>
            )}
            {candidates.map((candidate) => (
              <tr key={candidate.id}>
                <td title={candidate.id}>{shortId(candidate.id, 8, 4)}</td>
                <td title={candidate.dataItemId}>{shortId(candidate.dataItemId, 12, 4)}</td>
                <td>{candidate.status ?? '-'}</td>
                <td title={candidate.reason}>{candidate.reason ?? '-'}</td>
                <td title={candidate.suggestedRecipientsCsv}>{candidate.suggestedRecipientsCsv ?? '-'}</td>
                <td title={candidate.existingVerificationIdsCsv}>{candidate.existingVerificationIdsCsv ?? '-'}</td>
                <td className="erp-actions-cell">
                  <button type="button" onClick={() => updateCandidateStatus(candidate.id, 'OPEN')}>
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCandidateStatus(candidate.id, 'RESOLVED')}
                  >
                    Resolve
                  </button>
                  <button type="button" onClick={() => updateCandidateStatus(candidate.id, 'IGNORED')}>
                    Ignore
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
