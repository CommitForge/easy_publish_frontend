import { ItemsLoader } from './ItemsLoader.tsx';
import { DEFAULT_FIELDS_BY_TYPE } from '../../utils/itemLoaderConfig';

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
      fieldsToShow={DEFAULT_FIELDS_BY_TYPE.data_item}
    />
  );
}
