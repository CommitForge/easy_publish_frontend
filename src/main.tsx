import React from 'react';
import ReactDOM from 'react-dom/client';
import { IotaClientProvider, WalletProvider, createNetworkConfig } from '@iota/dapp-kit';
import { IOTA_EXPLORER_NETWORK, APP_INSTANCE_NAME, loadTranslations } from './Config.ts';
import { getFullnodeUrl } from '@iota/iota-sdk/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'bootstrap-icons/font/bootstrap-icons.css';
// Config options for the networks you want to connect to
const { networkConfig } = createNetworkConfig({
    testnet: { url: getFullnodeUrl(IOTA_EXPLORER_NETWORK) },
});

import App from './App';

async function start() {
  await loadTranslations(APP_INSTANCE_NAME);

  const queryClient = new QueryClient();

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <IotaClientProvider networks={networkConfig}>
          <WalletProvider>
            <App />
          </WalletProvider>
        </IotaClientProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

start();
