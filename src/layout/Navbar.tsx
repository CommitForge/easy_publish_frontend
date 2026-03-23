import { useEffect, useState, useRef } from 'react';
import { useWallets, useConnectWallet } from '@iota/dapp-kit';
import { copyToClipboard } from '../utils/utils.tsx';
import { useSelection } from '../context/SelectionContext.tsx';
import { IOTA_EXPLORER_OBJECT, IOTA_EXPLORER_NETWORK, API_WS_BASE, t } from '../Config.ts';
import { Client } from '@stomp/stompjs';
import type { IMessage } from '@stomp/stompjs';

const explorerUrl = (objectId: string) =>
  `${IOTA_EXPLORER_OBJECT}/${objectId}?network=${IOTA_EXPLORER_NETWORK}`;

const shortId = (id: string) => `${id.slice(0, 6)}...${id.slice(-4)}`;

interface SyncStatus {
  lastSequenceIndex: number;
  lastSyncTs: string | null;
  nextSyncTs: string | null;
  lastSyncError: boolean;
  onchainLastDataItemIndex: number | null;
  onchainLastDataItemId: string | null;
}

function SelectedObjectCard({
  title,
  objectId,
  rowStyle,
}: {
  title: string;
  objectId: string;
  rowStyle: {
    display: 'flex';
    justifyContent: 'space-between';
    alignItems: 'center';
    padding: '2px 0';
  };
}) {
  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={rowStyle}>
        <span>{shortId(objectId)}</span>
        <div>
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
    </div>
  );
}

export function Navbar({ account, disconnect }: any) {
  const wallets = useWallets();
  const { mutate: connect } = useConnectWallet();
  const { selectedContainerId, selectedDataTypeId, selectedDataItemId } = useSelection();
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [splash, setSplash] = useState(false);
  const lastSyncRef = useRef<string | null>(null);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new WebSocket(`${API_WS_BASE}/ws-sync`),
      reconnectDelay: 5000,
      debug: (msg) => console.log('STOMP:', msg),
      onConnect: () => {
        client.subscribe('/topic/sync-status', (message: IMessage) => {
          if (!message.body) return;
          try {
            const data: SyncStatus = JSON.parse(message.body);

            if (lastSyncRef.current && lastSyncRef.current !== data.lastSyncTs) {
              setSplash(true);
              setTimeout(() => setSplash(false), 800);
            }

            lastSyncRef.current = data.lastSyncTs;
            setSyncStatus(data);
          } catch (err) {
            console.error('Failed to parse sync status:', err);
          }
        });
      },
      onStompError: (frame) => console.error('STOMP error', frame),
    });

    client.activate();

    return () => {
      client.deactivate().catch((err) =>
        console.error('Error during STOMP disconnect', err)
      );
    };
  }, []);

  const infoRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '2px 0',
  } as const;

  const selectedObjects = [
    {
      key: 'container',
      title: `Selected ${t('container.singular')}`,
      objectId: selectedContainerId,
    },
    {
      key: 'type',
      title: `Selected ${t('type.singular')}`,
      objectId: selectedDataTypeId,
    },
    {
      key: 'item',
      title: `Selected ${t('item.singular')}`,
      objectId: selectedDataItemId,
    },
  ].filter(
    (
      entry
    ): entry is { key: string; title: string; objectId: string } =>
      Boolean(entry.objectId)
  );

  return (
    <header
      className="navbar"
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem' }}
    >
      {/* Logo */}
      <div className="logo">
        <img width="120px" height="120px" src="/images/logo.png" alt="Logo" />
      </div>

      {/* Top Selection Bar */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Sync Status */}
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Sync Status</div>

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
            rowStyle={infoRowStyle}
          />
        ))}
      </div>

      {/* Right-side wallet buttons */}
      <div
        className="nav-right"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        {!account &&
          wallets.length > 0 &&
          wallets.map((wallet) => (
            <button
              className="btn primary btn-neon btn-neon-right"
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
            className="btn primary btn-neon btn-neon-right"
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>
                Connected as: {shortId(account.address)}
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
