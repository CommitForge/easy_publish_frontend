import { DataItemVerificationsView } from './DataItemVerificationsView.tsx';

type ReceivedItemVerificationsViewProps = {
  onBrowseItems?: () => void;
};

export function ReceivedItemVerificationsView({
  onBrowseItems,
}: ReceivedItemVerificationsViewProps) {
  return (
    <DataItemVerificationsView
      onBrowseItems={onBrowseItems}
      titlePrefix="Selected received verification"
      loaderType="received_data_item_verification"
    />
  );
}
