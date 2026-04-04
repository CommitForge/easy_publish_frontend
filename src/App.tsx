// File: App.tsx
import { useCurrentAccount, useDisconnectWallet } from '@iota/dapp-kit';
import { Suspense, lazy, useState, useEffect } from 'react';

import { SelectionProvider } from './context/SelectionContext.tsx';
import { Navbar, Footer, CookieConsent } from './layout';
import { Introduction } from './panels/Introduction.tsx';
import type { PanelMenuSelection } from './panels/SidebarPanel.tsx';

import './style/Index.css';

import { API_BASE } from './Config.ts';

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
    setPrimaryMenuSelection('dashboard');
  }, [account, hasNavigatedPrimaryMenu, primaryMenuSelection]);

  useEffect(() => {
    if (!account) return;

    void fetch(`${API_BASE}api/user/${account.address}/update`, {
      method: 'POST',
    }).catch(console.error);
  }, [account]);

  return (
    <SelectionProvider>
      <AppInner
        account={account}
        disconnect={disconnect}
        primaryMenuSelection={primaryMenuSelection}
        setPrimaryMenuSelection={handlePrimaryMenuSelection}
      />
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
