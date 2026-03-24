import type { Item } from '../move/types';

/**
 * Extracts flattened UI records from the nested backend tree structure.
 * Handles different item types (container, data_type, data_item) with type-specific logic.
 *
 * @param tree - The nested tree structure from the API
 * @param type - The type of items to extract
 * @param effectiveContainerId - The selected container ID (for data_type and data_item)
 * @param effectiveDataTypeId - The selected data type ID (for data_item)
 * @returns Array of flattened Item objects for UI display
 */
export function extractItemsFromTree(
  tree: any,
  type: 'container' | 'data_type' | 'data_item',
  effectiveContainerId?: string,
  effectiveDataTypeId?: string
): Item[] {
  if (!tree?.containers) return [];

  if (type === 'container') {
    return tree.containers.map((c: any) => ({
      object_id: c.container.id,
      fields: {
        name: c.container.name,
        description: c.container.description,
        content: c.container.content,
        creatorAddr: c.container.creator?.creatorAddr ?? '',
      },
    }));
  }

  // Find the container node for data_type and data_item
  const containerNode = tree.containers.find(
    (c: any) => c.container.id === effectiveContainerId
  );
  if (!containerNode) return [];

  if (type === 'data_type') {
    return (containerNode.dataTypes ?? []).map((dt: any) => ({
      object_id: dt.dataType.id,
      fields: {
        name: dt.dataType.name,
        description: dt.dataType.description,
        content: dt.dataType.content,
        externalId: dt.dataType.externalId,
        creatorAddr: dt.dataType.creator?.creatorAddr ?? '',
      },
    }));
  }

  if (type === 'data_item') {
    const rows: Item[] = [];
    (containerNode.dataTypes ?? []).forEach((dt: any) => {
      const dtId = dt.dataType.id;
      // Filter by dataTypeId if specified
      if (effectiveDataTypeId && dtId !== effectiveDataTypeId) return;

      const dataTypeName = dt.dataType.name;

      (dt.dataItems ?? []).forEach((di: any) => {
        rows.push({
          object_id: di.dataItem.id,
          fields: {
            dataType: dataTypeName,
            name: di.dataItem.name,
            description: di.dataItem.description,
            content: di.dataItem.content,
            externalId: di.dataItem.externalId,
            containerId: di.dataItem.containerId,
            dataTypeId: di.dataItem.dataTypeId,
            verified:
              di.dataItem.verified == null
                ? ''
                : di.dataItem.verified
                ? 'true'
                : 'false',
            creatorAddr: di.dataItem.creator?.creatorAddr ?? '',
            externalIndex: di.dataItem.externalIndex ?? '',
          },
        });
      });
    });
    return rows;
  }

  return [];
}
