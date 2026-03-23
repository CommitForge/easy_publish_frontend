import { useSelection } from '../context/SelectionContext';
import { ItemsLoader } from '../move/view/ItemsLoader';
import { CreateContainerForm, CreateDataTypeForm } from '../move/forms';
import { DataItemsView } from '../move/view/DataItemsView';

import { t } from '../Config.ts'; // <-- import translations

interface MainPanelProps {
  type: 'container' | 'data_type' | 'data_items' | 'add';
  account?: { address: string } | null;
  primaryMenu?: 'container' | 'data_type';
}

export function MainPanel({
  type,
  account,
  primaryMenu,
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
        padding: 20,
        overflowY: 'auto',
      }}
    >
      {renderContent()}
    </main>
  );
}
