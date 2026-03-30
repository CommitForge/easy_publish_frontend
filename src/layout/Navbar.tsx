import { useWallets, useConnectWallet } from '@iota/dapp-kit';
import { useEffect, useState } from 'react';
import { copyToClipboard } from '../utils/clipboard';
import { useSelection } from '../context/SelectionContext.tsx';
import { API_BASE, getBrandLogoPath, t } from '../Config.ts';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { buildObjectExplorerUrl } from '../utils/explorer';
import type { PanelMenuSelection } from '../panels/SidebarPanel.tsx';
import {
  ADD_DATA_ITEM_LOAD_SELECTED_INTENT_STORAGE_KEY,
  UPDATE_CONTAINER_LOAD_SELECTED_INTENT_STORAGE_KEY,
  UPDATE_DATA_TYPE_LOAD_SELECTED_INTENT_STORAGE_KEY,
} from '../move/forms/FormUtils.tsx';

const explorerUrl = (objectId: string) => buildObjectExplorerUrl(objectId);

const shortByAddressStyle = (value: string, minLengthToShorten = 16) =>
  value.length > minLengthToShorten
    ? `${value.slice(0, 6)}...${value.slice(-4)}`
    : value;

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
}: NavbarProps) {
  const wallets = useWallets();
  const { mutate: connect } = useConnectWallet();
  const { selectedContainerId, selectedDataTypeId, selectedDataItemId } = useSelection();
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
        <div className="sync-status-card">
          <div className="sync-status-title">Sync Status</div>

          <div className={splash ? 'sync-status-splash' : ''} style={{ fontSize: 12 }}>
            {syncStatus ? (
              <>
                <div>
                  Last Sync:{' '}
                  {syncStatus.lastSyncTs
                    ? new Date(syncStatus.lastSyncTs).toLocaleTimeString()
                    : 'N/A'}{' '}
                  | Upd: {syncStatus.lastSequenceIndex} |{' '}
                  {t("item.singular")}:{' '}
                  {syncStatus.onchainLastDataItemIndex ?? 'N/A'}
                </div>

                <div>
                  Next Sync:{' '}
                  {syncStatus.nextSyncTs
                    ? new Date(syncStatus.nextSyncTs).toLocaleTimeString()
                    : 'N/A'}
                </div>

                <div>
                  {syncStatus.nextSyncTs ? (
                    <>
                      In{' '}
                      {Math.max(
                        0,
                        Math.floor(
                          (new Date(syncStatus.nextSyncTs).getTime() - Date.now()) /
                            1000
                        )
                      )}{' '}
                      sec
                    </>
                  ) : (
                    'Waiting...'
                  )}
                </div>

                <div>
                  {syncStatus.lastSyncError ? (
                    <span style={{ color: 'red' }}>Last Sync Error</span>
                  ) : (
                    <span style={{ color: 'green' }}>OK</span>
                  )}
                </div>
              </>
            ) : (
              <div>Loading...</div>
            )}
          </div>
        </div>

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
      <div className="nav-right">
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
              Connect to {wallet.name}
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
            Get IOTA Wallet to Connect
          </button>
        )}

        {account && (
          <>
            <div className="wallet-connected">
              <span>
                Connected as: {shortByAddressStyle(account.address)}
              </span>
              <i
                className="bi bi-clipboard copy-icon"
                title="Copy address"
                onClick={(e) => copyToClipboard(e, account.address)}
              />
            </div>

            <button className="btn primary" onClick={() => disconnect()}>
              Disconnect
            </button>
          </>
        )}
      </div>
    </header>
  );
}
