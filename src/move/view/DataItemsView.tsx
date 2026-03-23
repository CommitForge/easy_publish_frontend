import { ItemsLoader } from './ItemsLoader.tsx';

interface DataItemsViewProps {
  containerId?: string;
  dataTypeId?: string;
}

export function DataItemsView({ containerId, dataTypeId }: DataItemsViewProps) {
  if (!containerId && !dataTypeId) {
    return <p>Select a container or data type to view data items.</p>;
  }

  return (
    <ItemsLoader
      type="data_item"
      containerId={containerId}
      dataTypeId={dataTypeId}
      fieldsToShow={[
        'dataType',
        'name',
        'description',
        'content',
        'verified',
        'creatorAddr',
        'externalId',
        'externalIndex',
      ]}
    />
  );
}
