import { useState } from 'react';
import { t } from '../../Config.ts';
import { useSelection } from '../../context/SelectionContext.tsx';
import { PublishDataItemVerificationForm } from '../forms';
import { DEFAULT_FIELDS_BY_TYPE } from '../../utils/itemLoaderConfig';
import { ItemsLoader } from './ItemsLoader.tsx';

type ReceivedItemsViewProps = {
  address: string;
  onBrowseItemVerifications?: () => void;
};

export function ReceivedItemsView({
  address,
  onBrowseItemVerifications,
}: ReceivedItemsViewProps) {
  const {
    selectedDataItemId,
    setVerificationBrowseDataItemId,
  } = useSelection();
  const [openVerificationDialog, setOpenVerificationDialog] = useState(false);

  const selectedDataItemLabel = selectedDataItemId
    ? `${selectedDataItemId.slice(0, 10)}...${selectedDataItemId.slice(-8)}`
    : '(none)';

  return (
    <div className="bp-browse-page">
      <div className="bp-browse-actions">
        <div className="bp-browse-actions-status">
          Selected received item: <strong>{selectedDataItemLabel}</strong>
        </div>

        <div className="bp-browse-actions-row">
          <button
            type="button"
            className="bp-toolbar-btn"
            disabled={!selectedDataItemId}
            onClick={() => setOpenVerificationDialog(true)}
          >
            + {t('actions.new')} {t('itemVerification.singular')}
          </button>

          <button
            type="button"
            className="bp-toolbar-btn"
            disabled={!selectedDataItemId}
            onClick={() => {
              if (!selectedDataItemId) return;
              setVerificationBrowseDataItemId(selectedDataItemId);
              onBrowseItemVerifications?.();
            }}
          >
            Browse Verifications For Selected
          </button>
        </div>
      </div>

      <ItemsLoader
        type="received_data_item"
        fieldsToShow={DEFAULT_FIELDS_BY_TYPE.received_data_item}
      />

      {openVerificationDialog && (
        <div
          className="bp-dialog-backdrop"
          role="presentation"
          onClick={() => setOpenVerificationDialog(false)}
        >
          <div
            className="bp-dialog bp-dialog-wide"
            role="dialog"
            aria-modal="true"
            aria-label="Publish item verification"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="bp-dialog-close"
              onClick={() => setOpenVerificationDialog(false)}
              aria-label="Close"
            >
              ×
            </button>

            <PublishDataItemVerificationForm
              address={address}
              initialDataItemId={selectedDataItemId ?? undefined}
              embedded
              onSuccessfulPublish={() => setOpenVerificationDialog(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
