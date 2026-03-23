// File: App.tsx
import { useCurrentAccount, useDisconnectWallet } from '@iota/dapp-kit';
import axios from 'axios';
import { useState, useEffect } from 'react';

import { SelectionProvider, useSelection } from './context/SelectionContext.tsx';
import { Navbar, Footer, CookieConsent } from './layout';
import { SidebarPanel } from './panels/SidebarPanel.tsx';
import { MainPanel } from './panels/MainPanel.tsx';
import { Introduction } from './panels/Introduction.tsx';

import './style/Index.css';
import {
  AddOwnerForm,
  AttachChildForm,
  CreateContainerForm,
  CreateDataTypeForm,
  PublishDataItemForm,
  PublishDataItemVerificationForm,
  RemoveOwnerForm,
  UpdateContainerForm,
  UpdateDataTypeForm,
} from './move/forms';

import { API_BASE } from './Config.ts';

import type { PrimarySelection } from './menus/PrimarySelection';

export default function App() {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();

  const [containers, setContainers] = useState<string[]>([]);
  const [dataTypes, setDataTypes] = useState<string[]>([]);
  const [primaryMenuSelection, setPrimaryMenuSelection] =
    useState<PrimarySelection>('items');

  useEffect(() => {
    if (!account) return;

    axios
      .post(`${API_BASE}api/user/${account.address}/update`)
      .catch(console.error);

    fetchUserObjects();
  }, [account]);

  const fetchUserObjects = () => {
    if (!account) return;

    axios
      .get(`${API_BASE}api/user/${account.address}/objects`)
      .then((res) => {
        const objs = res.data;

        setContainers(
          objs
            .filter((o: any) => o.objectType?.code === 'container')
            .map((o: any) => o.objectId)
        );

        setDataTypes(
          objs
            .filter((o: any) => o.objectType?.code === 'data_type')
            .map((o: any) => o.objectId)
        );
      })
      .catch(console.error);
  };

  return (
    <SelectionProvider>
      <AppInner
        account={account}
        disconnect={disconnect}
        containers={containers}
        dataTypes={dataTypes}
        primaryMenuSelection={primaryMenuSelection}
        setPrimaryMenuSelection={setPrimaryMenuSelection}
        fetchUserObjects={fetchUserObjects}
      />
    </SelectionProvider>
  );
}

function AppInner({
  account,
  disconnect,
  primaryMenuSelection,
  setPrimaryMenuSelection,
  fetchUserObjects,
}: any) {
  const {
    selectedContainerId,
    selectedDataTypeId,
    setSelectedContainerId,
    setSelectedDataTypeId,
  } = useSelection();

  const [followedContainers, setFollowedContainers] = useState<string[]>([]);

  return (
    <div className="app-container">
      <Navbar
        account={account}
        disconnect={disconnect}
        refreshObjects={fetchUserObjects}
      />

      <div className="app-body">
        {!account && <Introduction account={account} />}

        {account && (
          <div className="app-content">
            <SidebarPanel
              selectedContainerId={selectedContainerId ?? undefined}
              selectedDataTypeId={selectedDataTypeId ?? undefined}
              setSelectedContainerId={setSelectedContainerId}
              setSelectedDataTypeId={setSelectedDataTypeId}
              primaryMenuSelection={primaryMenuSelection}
              setPrimaryMenuSelection={setPrimaryMenuSelection}
              followedContainers={followedContainers}
              setFollowedContainers={setFollowedContainers}
            />

            <main className="main-panel">
              {primaryMenuSelection === 'createContainer' && (
                <CreateContainerForm address={account.address} />
              )}

              {primaryMenuSelection === 'updateContainer' &&
                selectedContainerId && <UpdateContainerForm />}

              {primaryMenuSelection === 'addDataType' && (
                <CreateDataTypeForm address={account.address} />
              )}

              {primaryMenuSelection === 'updateDataType' &&
                selectedDataTypeId && (
                  <UpdateDataTypeForm address={account.address} />
                )}

              {primaryMenuSelection === 'addDataItem' &&
                selectedDataTypeId && (
                  <PublishDataItemForm address={account.address} />
                )}

              {primaryMenuSelection === 'publishDataItemVerification' &&
                selectedContainerId &&
                selectedDataTypeId && (
                  <PublishDataItemVerificationForm
                    address={account.address}
                  />
                )}

              {primaryMenuSelection === 'attachChild' &&
                selectedContainerId && (
                  <AttachChildForm address={account.address} />
                )}

              {primaryMenuSelection === 'addOwner' && selectedContainerId && (
                <AddOwnerForm address={account.address} />
              )}

              {primaryMenuSelection === 'removeOwner' && selectedContainerId && (
                <RemoveOwnerForm address={account.address} />
              )}

              {primaryMenuSelection === 'items' && (
                <MainPanel type="data_items" />
              )}
            </main>
          </div>
        )}
      </div>

      <Footer />

      <CookieConsent />
    </div>
  );
}
