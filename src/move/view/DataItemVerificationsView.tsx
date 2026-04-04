import { useSelection } from '../../context/SelectionContext.tsx';
import { DEFAULT_FIELDS_BY_TYPE } from '../../utils/itemLoaderConfig';
import { ItemsLoader } from './ItemsLoader.tsx';
import type { ItemType } from '../../utils/itemLoaderConfig';

type DataItemVerificationsViewProps = {
  onBrowseItems?: () => void;
  titlePrefix?: string;
  loaderType?: ItemType;
};

export function DataItemVerificationsView({
  onBrowseItems,
  titlePrefix = 'Selected verification',
  loaderType = 'data_item_verification',
}: DataItemVerificationsViewProps) {
  const {
    selectedDataItemVerificationId,
    selectedDataItemId,
    verificationBrowseDataItemId,
    setVerificationBrowseDataItemId,
  } = useSelection();

  const selectedVerificationLabel = selectedDataItemVerificationId
    ? `${selectedDataItemVerificationId.slice(0, 10)}...${selectedDataItemVerificationId.slice(-8)}`
    : '(none)';

  const selectedDataItemLabel = selectedDataItemId
    ? `${selectedDataItemId.slice(0, 10)}...${selectedDataItemId.slice(-8)}`
    : '(none)';

  return (
    <div className="bp-browse-page">
      <div className="bp-browse-actions">
        <div className="bp-browse-actions-status">
          {titlePrefix}: <strong>{selectedVerificationLabel}</strong>
          {' · '}
          Related item: <strong>{selectedDataItemLabel}</strong>
        </div>

        <div className="bp-browse-actions-row">
          <button
            type="button"
            className="bp-toolbar-btn"
            disabled={!selectedDataItemId}
            onClick={() => onBrowseItems?.()}
          >
            Open Related Item
          </button>

          <button
            type="button"
            className="bp-toolbar-btn"
            disabled={!verificationBrowseDataItemId}
            onClick={() => setVerificationBrowseDataItemId(null)}
          >
            Clear Item Drill-down
          </button>
        </div>
      </div>

      <ItemsLoader
        type={loaderType}
        dataItemId={verificationBrowseDataItemId ?? undefined}
        fieldsToShow={
          loaderType === 'received_data_item_verification'
            ? DEFAULT_FIELDS_BY_TYPE.received_data_item_verification
            : DEFAULT_FIELDS_BY_TYPE.data_item_verification
        }
      />
    </div>
  );
}
