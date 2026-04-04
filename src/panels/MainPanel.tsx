import { useSelection } from '../context/SelectionContext';
import { ItemsLoader } from '../move/view/ItemsLoader';
import { CreateContainerForm, CreateDataTypeForm } from '../move/forms';
import { DataItemsView } from '../move/view/DataItemsView';
import { ReceivedItemsView } from '../move/view/ReceivedItemsView.tsx';
import { DataItemVerificationsView } from '../move/view/DataItemVerificationsView.tsx';
import { ReceivedItemVerificationsView } from '../move/view/ReceivedItemVerificationsView.tsx';

import { t } from '../Config.ts'; // <-- import translations

interface MainPanelProps {
  type:
    | 'container'
    | 'data_type'
    | 'data_items'
    | 'received_items'
    | 'data_item_verifications'
    | 'received_item_verifications'
    | 'add';
  account?: { address: string } | null;
  primaryMenu?: 'container' | 'data_type';
  onOpenItemsView?: () => void;
  onOpenItemVerificationsView?: () => void;
}

export function MainPanel({
  type,
  account,
  primaryMenu,
  onOpenItemsView,
  onOpenItemVerificationsView,
}: MainPanelProps) {
  const { selectedContainerId, selectedDataTypeId } = useSelection();

  const renderContent = () => {
    switch (type) {
      case 'container':
        return <ItemsLoader type="container" />;

      case 'data_type':
        return <ItemsLoader type="data_type" />;

      case 'data_items':
        if (!selectedContainerId && !selectedDataTypeId) {
          return (
            <div style={{ opacity: 0.7 }}>
              {t('messages.selectContainerOrType')}
            </div>
          );
        }

        return (
          <DataItemsView
            containerId={selectedContainerId ?? undefined}
            dataTypeId={selectedDataTypeId ?? undefined}
          />
        );

      case 'received_items':
        if (!account?.address) {
          return (
            <div style={{ opacity: 0.7 }}>
              {t('messages.connectWalletToAdd')}
            </div>
          );
        }

        return (
          <ReceivedItemsView
            address={account.address}
            onBrowseItemVerifications={onOpenItemVerificationsView}
          />
        );

      case 'data_item_verifications':
        if (!selectedContainerId) {
          return (
            <div style={{ opacity: 0.7 }}>
              {t('messages.selectContainerForItemVerifications')}
            </div>
          );
        }
        return (
          <DataItemVerificationsView
            onBrowseItems={onOpenItemsView}
          />
        );

      case 'received_item_verifications':
        return (
          <ReceivedItemVerificationsView
            onBrowseItems={onOpenItemsView}
          />
        );

      case 'add':
        if (!account?.address) {
          return (
            <div style={{ opacity: 0.7 }}>
              {t('messages.connectWalletToAdd')}
            </div>
          );
        }

        if (primaryMenu === 'container') {
          return <CreateContainerForm address={account.address} />;
        }

        if (primaryMenu === 'data_type') {
          return <CreateDataTypeForm address={account.address} />;
        }

        return (
          <div style={{ opacity: 0.7 }}>
            {t('messages.selectWhatToCreate')}
          </div>
        );

      default:
        return (
          <div style={{ opacity: 0.7 }}>
            {t('messages.selectActionSidebar')}
          </div>
        );
    }
  };

  return (
    <main
      style={{
        flex: 1,
        padding: 0,
        overflowY: 'auto',
      }}
    >
      {renderContent()}
    </main>
  );
}
