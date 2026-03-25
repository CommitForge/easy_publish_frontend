import { useState } from 'react';
import { useSelection } from '../context/SelectionContext.tsx';
import { SidebarPanel } from './SidebarPanel.tsx';
import { MainPanel } from './MainPanel.tsx';
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
} from '../move/forms';
import type { PanelMenuSelection } from './SidebarPanel.tsx';

type AccountWorkspaceProps = {
  account: any;
  primaryMenuSelection: PanelMenuSelection;
  setPrimaryMenuSelection: (value: PanelMenuSelection) => void;
};

export default function AccountWorkspace({
  account,
  primaryMenuSelection,
  setPrimaryMenuSelection,
}: AccountWorkspaceProps) {
  const {
    selectedContainerId,
    selectedDataTypeId,
    setSelectedContainerId,
    setSelectedDataTypeId,
  } = useSelection();

  const [followedContainers, setFollowedContainers] = useState<string[]>([]);

  return (
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
            <PublishDataItemVerificationForm address={account.address} />
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
  );
}
