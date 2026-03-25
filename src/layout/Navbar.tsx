import { useWallets, useConnectWallet } from '@iota/dapp-kit';
import { copyToClipboard } from '../utils/clipboard';
import { useSelection } from '../context/SelectionContext.tsx';
import { t } from '../Config.ts';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { buildObjectExplorerUrl } from '../utils/explorer';

const explorerUrl = (objectId: string) => buildObjectExplorerUrl(objectId);

const shortId = (id: string) => `${id.slice(0, 6)}...${id.slice(-4)}`;

function SelectedObjectCard({
  title,
  objectId,
}: {
  title: string;
  objectId: string;
}) {
  return (
    <div className="selected-object-card">
      <div className="selected-object-title">{title}</div>
      <div className="selected-object-row">
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
  const { syncStatus, splash } = useSyncStatus();

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
    <header className="navbar navbar-main">
      {/* Logo */}
      <div className="logo">
        <img width="120px" height="120px" src="/images/logo.png" alt="Logo" />
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
