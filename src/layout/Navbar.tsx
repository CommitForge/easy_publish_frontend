import { useWallets, useConnectWallet } from '@iota/dapp-kit';
import { useEffect, useState } from 'react';
import { copyToClipboard } from '../utils/clipboard';
import { useSelection } from '../context/SelectionContext.tsx';
import { useContentDisplay } from '../context/ContentDisplayContext.tsx';
import { API_BASE, getBrandLogoPath, t, type AppMode } from '../Config.ts';
import { useSyncStatus } from '../hooks/useSyncStatus';
import type { SyncStatus } from '../hooks/useSyncStatus';
import { buildObjectExplorerUrl } from '../utils/explorer';
import type { PanelMenuSelection } from '../panels/SidebarPanel.tsx';
import { InfoTooltip } from '../move/forms/FormUi.tsx';
import {
  ADD_DATA_ITEM_LOAD_SELECTED_INTENT_STORAGE_KEY,
  UPDATE_CONTAINER_LOAD_SELECTED_INTENT_STORAGE_KEY,
  UPDATE_DATA_TYPE_LOAD_SELECTED_INTENT_STORAGE_KEY,
} from '../move/forms/FormUtils.tsx';

const explorerUrl = (objectId: string) => buildObjectExplorerUrl(objectId);
const SYNC_TICK_MS = 125;
const SYNC_PROGRESS_RADIUS = 21;
const SYNC_PROGRESS_CIRCUMFERENCE = 2 * Math.PI * SYNC_PROGRESS_RADIUS;

const shortByAddressStyle = (value: string, minLengthToShorten = 16) =>
  value.length > minLengthToShorten
    ? `${value.slice(0, 6)}...${value.slice(-4)}`
    : value;

const toTimestampMs = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

const formatRemainingCompact = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h${minutes}m`;
  if (minutes > 0) return `${minutes}m${seconds}s`;
  return `${seconds}s`;
};

function SyncStatusCard({
  syncStatus,
  splash,
}: {
  syncStatus: SyncStatus | null;
  splash: boolean;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!syncStatus) return;

    const tick = window.setInterval(() => {
      setNowMs(Date.now());
    }, SYNC_TICK_MS);

    return () => {
      window.clearInterval(tick);
    };
  }, [syncStatus]);

  const lastSyncMs = toTimestampMs(syncStatus?.lastSyncTs);
  const nextSyncMs = toTimestampMs(syncStatus?.nextSyncTs);
  const hasSchedule = nextSyncMs !== null;

  const rawRemainingMs = hasSchedule ? nextSyncMs - nowMs : null;
  const remainingMs = rawRemainingMs !== null ? Math.max(0, rawRemainingMs) : null;
  const cycleMs =
    lastSyncMs !== null && nextSyncMs !== null && nextSyncMs > lastSyncMs
      ? nextSyncMs - lastSyncMs
      : hasSchedule && rawRemainingMs !== null && rawRemainingMs > 0
      ? rawRemainingMs
      : null;

  const overdueMs =
    rawRemainingMs !== null && rawRemainingMs < 0 ? Math.abs(rawRemainingMs) : 0;
  const isOverdueGrace =
    cycleMs !== null && overdueMs > 0 && overdueMs < cycleMs;
  const isOverdueStalled =
    cycleMs !== null && overdueMs >= cycleMs;

  const elapsedMs =
    cycleMs !== null && hasSchedule && remainingMs !== null
      ? Math.max(0, cycleMs - remainingMs)
      : null;

  const progress =
    cycleMs !== null && cycleMs > 0 && isOverdueGrace
      ? Math.min(1, Math.max(0, overdueMs / cycleMs))
      : isOverdueStalled
      ? 1
      : cycleMs !== null && elapsedMs !== null && cycleMs > 0
      ? Math.min(1, Math.max(0, elapsedMs / cycleMs))
      : null;

  const dashOffset =
    progress === null
      ? SYNC_PROGRESS_CIRCUMFERENCE
      : SYNC_PROGRESS_CIRCUMFERENCE * (1 - progress);

  const ringModeClass =
    progress === null
      ? 'is-indeterminate'
      : isOverdueGrace
      ? 'is-overdue'
      : isOverdueStalled
      ? 'is-overdue-stalled'
      : '';

  const ringCounterText = isOverdueGrace
    ? `+${formatRemainingCompact(overdueMs)}`
    : isOverdueStalled
    ? 'wait'
    : remainingMs !== null
    ? formatRemainingCompact(remainingMs)
    : '...';

  return (
    <div className="sync-status-card">
      <div className="sync-status-title">Sync Status</div>

      <div className={`sync-status-content ${splash ? 'sync-status-splash' : ''}`}>
        {syncStatus ? (
          <div className="sync-status-body">
            <div className="sync-progress-widget" aria-hidden="true">
              <svg className="sync-progress-ring" viewBox="0 0 54 54">
                <circle
                  className="sync-progress-ring-track"
                  cx="27"
                  cy="27"
                  r={SYNC_PROGRESS_RADIUS}
                />
                <circle
                  className={`sync-progress-ring-value ${ringModeClass}`.trim()}
                  cx="27"
                  cy="27"
                  r={SYNC_PROGRESS_RADIUS}
                  strokeDasharray={SYNC_PROGRESS_CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                />
              </svg>
              <div className={`sync-progress-core ${isOverdueGrace || isOverdueStalled ? 'is-overdue' : ''}`.trim()}>
                {ringCounterText}
              </div>
            </div>

            <div className="sync-status-lines">
              <div>
                Last Sync:{' '}
                {syncStatus.lastSyncTs
                  ? new Date(syncStatus.lastSyncTs).toLocaleTimeString()
                  : 'N/A'}
              </div>

              <div>
                Next Sync:{' '}
                {syncStatus.nextSyncTs
                  ? new Date(syncStatus.nextSyncTs).toLocaleTimeString()
                  : 'N/A'}
              </div>

              <div className="sync-status-meta">
                <span className={`sync-status-health ${syncStatus.lastSyncError ? 'is-error' : 'is-ok'}`}>
                  {syncStatus.lastSyncError ? 'Last Sync Error' : 'OK'}
                </span>
                <span className="sync-status-meta-sep">|</span>
                <span className="sync-status-meta-values">
                  Upd: {syncStatus.lastSequenceIndex} | {t('item.singular')}:{' '}
                  {syncStatus.onchainLastDataItemIndex ?? 'N/A'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div>Loading...</div>
        )}
      </div>
    </div>
  );
}

function SelectedObjectCard({
  title,
  objectId,
  objectName,
  onOpenForm,
}: {
  title: string;
  objectId: string;
  objectName: string | null;
  onOpenForm: () => void;
}) {
  const name = objectName?.trim() || 'Unnamed';

  return (
    <div className="selected-object-card">
      <div className="selected-object-title">{title}</div>
      <div className="selected-object-row">
        <span className="selected-object-id-text" title={objectId}>
          {shortByAddressStyle(objectId)}
        </span>
        <div className="selected-object-icons">
          <i
            className="bi bi-clipboard copy-icon"
            title="Copy ID"
            onClick={(e) => copyToClipboard(e, objectId)}
          />
          <a
            href={explorerUrl(objectId)}
            target="_blank"
            rel="noreferrer"
            title="Open in IOTA Explorer"
            className="explorer-icon"
          >
            <i className="bi bi-box-arrow-up-right" />
          </a>
        </div>
      </div>
      <button
        type="button"
        className="selected-object-name-btn"
        onClick={onOpenForm}
        title={`${name} (open form)`}
      >
        <span className="selected-object-name-text" title={name}>
          {shortByAddressStyle(name, 22)}
        </span>
      </button>
    </div>
  );
}

type NavbarProps = {
  account: { address: string } | null | undefined;
  disconnect: () => void;
  setPrimaryMenuSelection: (value: PanelMenuSelection) => void;
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
};

function nameFromPayload(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const candidates = [
    obj.name,
    (obj.container as Record<string, unknown> | undefined)?.name,
    (obj.dataType as Record<string, unknown> | undefined)?.name,
    (obj.dataItem as Record<string, unknown> | undefined)?.name,
    (obj.data as Record<string, unknown> | undefined)?.name,
  ];
  const first = candidates.find(
    (candidate) => typeof candidate === 'string' && candidate.trim().length > 0
  );
  return typeof first === 'string' ? first.trim() : null;
}

export function Navbar({
  account,
  disconnect,
  setPrimaryMenuSelection,
  appMode,
  setAppMode,
}: NavbarProps) {
  const wallets = useWallets();
  const { mutate: connect } = useConnectWallet();
  const { selectedContainerId, selectedDataTypeId, selectedDataItemId } = useSelection();
  const { autoUnzipContent, setAutoUnzipContent } = useContentDisplay();
  const { syncStatus, splash } = useSyncStatus();
  const logoPath = getBrandLogoPath();
  const [selectedNames, setSelectedNames] = useState<{
    container: string | null;
    type: string | null;
    item: string | null;
  }>({
    container: null,
    type: null,
    item: null,
  });

  useEffect(() => {
    if (!selectedContainerId) {
      setSelectedNames((prev) => ({ ...prev, container: null }));
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}api/containers/${selectedContainerId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
        const nextName = nameFromPayload(raw);
        if (!cancelled) {
          setSelectedNames((prev) => ({ ...prev, container: nextName }));
        }
      } catch {
        if (!cancelled) {
          setSelectedNames((prev) => ({ ...prev, container: null }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedContainerId]);

  useEffect(() => {
    if (!selectedDataTypeId) {
      setSelectedNames((prev) => ({ ...prev, type: null }));
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}api/data-types/${selectedDataTypeId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
        const nextName = nameFromPayload(raw);
        if (!cancelled) {
          setSelectedNames((prev) => ({ ...prev, type: nextName }));
        }
      } catch {
        if (!cancelled) {
          setSelectedNames((prev) => ({ ...prev, type: null }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDataTypeId]);

  useEffect(() => {
    if (!selectedDataItemId) {
      setSelectedNames((prev) => ({ ...prev, item: null }));
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}api/data-items/${selectedDataItemId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
        const nextName = nameFromPayload(raw);
        if (!cancelled) {
          setSelectedNames((prev) => ({ ...prev, item: nextName }));
        }
      } catch {
        if (!cancelled) {
          setSelectedNames((prev) => ({ ...prev, item: null }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDataItemId]);

  const openContainerForm = () => {
    localStorage.setItem(UPDATE_CONTAINER_LOAD_SELECTED_INTENT_STORAGE_KEY, '1');
    setPrimaryMenuSelection('updateContainer');
  };

  const openDataTypeForm = () => {
    localStorage.setItem(UPDATE_DATA_TYPE_LOAD_SELECTED_INTENT_STORAGE_KEY, '1');
    setPrimaryMenuSelection('updateDataType');
  };

  const openDataItemForm = () => {
    localStorage.setItem(ADD_DATA_ITEM_LOAD_SELECTED_INTENT_STORAGE_KEY, '1');
    setPrimaryMenuSelection('addDataItem');
  };

  const selectedObjects = [
    {
      key: 'container',
      title: `Selected ${t('container.singular')}`,
      objectId: selectedContainerId,
      objectName: selectedNames.container,
      onOpenForm: openContainerForm,
    },
    {
      key: 'type',
      title: `Selected ${t('type.singular')}`,
      objectId: selectedDataTypeId,
      objectName: selectedNames.type,
      onOpenForm: openDataTypeForm,
    },
    {
      key: 'item',
      title: `Selected ${t('item.singular')}`,
      objectId: selectedDataItemId,
      objectName: selectedNames.item,
      onOpenForm: openDataItemForm,
    },
  ].filter(
    (entry): entry is {
      key: string;
      title: string;
      objectId: string;
      objectName: string | null;
      onOpenForm: () => void;
    } => Boolean(entry.objectId)
  );

  return (
    <header className="navbar navbar-main">
      {/* Logo */}
      <div className="logo">
        <img width="120px" height="120px" src={logoPath} alt="IziPublish Logo" />
      </div>

      {/* Top Selection Bar */}
      <div className="navbar-info">
        {/* Sync Status */}
        <SyncStatusCard syncStatus={syncStatus} splash={splash} />

        {selectedObjects.map((entry) => (
          <SelectedObjectCard
            key={entry.key}
            title={entry.title}
            objectId={entry.objectId}
            objectName={entry.objectName}
            onOpenForm={entry.onOpenForm}
          />
        ))}
      </div>

      {/* Right-side wallet buttons */}
      <div className={`nav-right ${account ? 'is-authenticated' : ''}`.trim()}>
        <div className="wallet-mode-stack">
          <div className="app-mode-switch" role="group" aria-label="Application mode">
            <button
              type="button"
              className={`app-mode-btn ${appMode === 'generic' ? 'is-active' : ''}`.trim()}
              onClick={() => setAppMode('generic')}
              aria-pressed={appMode === 'generic'}
              title="Default mode"
            >
              Default
            </button>
            <button
              type="button"
              className={`app-mode-btn ${appMode === 'cars' ? 'is-active' : ''}`.trim()}
              onClick={() => setAppMode('cars')}
              aria-pressed={appMode === 'cars'}
              title="Cars mode"
            >
              Cars
            </button>
          </div>

          {!account &&
            wallets.length > 0 &&
            wallets.map((wallet) => (
              <button
                className="btn primary btn-neon wallet-connect-btn"
                key={wallet.name}
                onClick={() =>
                  connect({ wallet }, { onSuccess: () => console.log('connected') })
                }
              >
                <span className="wallet-connect-btn-label">Connect to {wallet.name}</span>
              </button>
            ))}

          {!account && wallets.length === 0 && (
            <button
              className="btn primary btn-neon wallet-connect-btn"
              onClick={() =>
                window.open(
                  'https://chromewebstore.google.com/detail/iota-wallet/iidjkmdceolghepehaaddojmnjnkkija?pli=1',
                  '_blank'
                )
              }
            >
              <span className="wallet-connect-btn-label">Get IOTA Wallet to Connect</span>
            </button>
          )}

          {account && (
            <button
              className="btn primary wallet-connect-btn wallet-disconnect-btn"
              onClick={() => disconnect()}
            >
              Disconnect
            </button>
          )}
        </div>

        {account && (
          <div className="wallet-connected wallet-connected-card selected-object-card">
            <div className="selected-object-title">Wallet Status</div>
            <div className="wallet-connected-meta-label">Connected as</div>
            <div className="selected-object-row wallet-connected-row">
              <span className="selected-object-id-text" title={account.address}>
                {shortByAddressStyle(account.address)}
              </span>
              <span className="selected-object-icons">
                <i
                  className="bi bi-clipboard copy-icon"
                  title="Copy address"
                  onClick={(e) => copyToClipboard(e, account.address)}
                />
              </span>
            </div>
            <label className="wallet-auto-unzip-toggle">
              <input
                type="checkbox"
                checked={autoUnzipContent}
                onChange={(event) => setAutoUnzipContent(event.target.checked)}
              />
              <span>{t('actions.autoUnzip')}</span>
              <InfoTooltip
                className="form-content-check-help form-content-help-tooltip-up"
                message={t('messages.autoUnzipHelp')}
                ariaLabel={t('labels.autoUnzipHelp')}
              />
            </label>
          </div>
        )}
      </div>
    </header>
  );
}
