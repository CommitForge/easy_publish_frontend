// File: App.tsx
import { useCurrentAccount, useDisconnectWallet } from '@iota/dapp-kit';
import { Suspense, lazy, useState, useEffect } from 'react';

import { SelectionProvider } from './context/SelectionContext.tsx';
import { ContentDisplayProvider } from './context/ContentDisplayContext.tsx';
import { Navbar, Footer, CookieConsent } from './layout';
import { Introduction } from './panels/Introduction.tsx';
import type { PanelMenuSelection } from './panels/SidebarPanel.tsx';

import './style/Index.css';

import { API_BASE, APP_INSTANCE_DOMAIN } from './Config.ts';

const AccountWorkspace = lazy(() => import('./panels/AccountWorkspace.tsx'));

export default function App() {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();

  const [primaryMenuSelection, setPrimaryMenuSelection] =
    useState<PanelMenuSelection>('items');
  const [hasNavigatedPrimaryMenu, setHasNavigatedPrimaryMenu] = useState(false);

  const handlePrimaryMenuSelection = (value: PanelMenuSelection) => {
    setHasNavigatedPrimaryMenu(true);
    setPrimaryMenuSelection(value);
  };

  useEffect(() => {
    if (!account) return;
    if (hasNavigatedPrimaryMenu) return;
    if (primaryMenuSelection !== 'items') return;

    let cancelled = false;

    const resolveStartupPanel = async () => {
      try {
        const params = new URLSearchParams({
          userAddress: account.address,
          include: 'CONTAINER',
          page: '0',
          pageSize: '1',
          domain: APP_INSTANCE_DOMAIN ?? '',
        });

        const response = await fetch(`${API_BASE}api/items?${params.toString()}`);
        if (!response.ok) {
          if (!cancelled) setPrimaryMenuSelection('dashboard');
          return;
        }

        const payload = (await response.json()) as {
          containers?: unknown[];
          meta?: { totalContainers?: number };
        };

        const totalContainers =
          typeof payload?.meta?.totalContainers === 'number'
            ? payload.meta.totalContainers
            : null;
        const containers = Array.isArray(payload?.containers)
          ? payload.containers
          : [];
        const hasContainers =
          totalContainers !== null ? totalContainers > 0 : containers.length > 0;

        if (!cancelled) {
          setPrimaryMenuSelection(hasContainers ? 'dashboard' : 'help');
        }
      } catch {
        if (!cancelled) {
          setPrimaryMenuSelection('dashboard');
        }
      }
    };

    void resolveStartupPanel();

    return () => {
      cancelled = true;
    };
  }, [account, hasNavigatedPrimaryMenu, primaryMenuSelection]);

  useEffect(() => {
    if (!account) return;

    void fetch(`${API_BASE}api/user/${account.address}/update`, {
      method: 'POST',
    }).catch(console.error);
  }, [account]);

  return (
    <SelectionProvider>
      <ContentDisplayProvider>
        <AppInner
          account={account}
          disconnect={disconnect}
          primaryMenuSelection={primaryMenuSelection}
          setPrimaryMenuSelection={handlePrimaryMenuSelection}
        />
      </ContentDisplayProvider>
    </SelectionProvider>
  );
}

function AppInner({
  account,
  disconnect,
  primaryMenuSelection,
  setPrimaryMenuSelection,
}: {
  account: { address: string } | null | undefined;
  disconnect: () => void;
  primaryMenuSelection: PanelMenuSelection;
  setPrimaryMenuSelection: (value: PanelMenuSelection) => void;
}) {
  return (
    <div className="app-container">
      <Navbar
        account={account}
        disconnect={disconnect}
        setPrimaryMenuSelection={setPrimaryMenuSelection}
      />

      <div className="app-body">
        {!account && <Introduction account={account} />}

        {account && (
          <Suspense
            fallback={
              <div className="app-content">
                <main className="main-panel">Loading workspace...</main>
              </div>
            }
          >
            <AccountWorkspace
              account={account}
              primaryMenuSelection={primaryMenuSelection}
              setPrimaryMenuSelection={setPrimaryMenuSelection}
            />
          </Suspense>
        )}
      </div>

      <Footer />

      <CookieConsent />
    </div>
  );
}
