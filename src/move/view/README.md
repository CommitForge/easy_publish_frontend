# View Module

This folder is split by responsibility:

- `ItemsLoader.tsx`  
  Fetches tree data from backend, maps it into flat table rows, and syncs selection/pagination state.

- `ItemsTable.tsx`  
  Renders the generic selectable table, columns, and pagination UI.

- `DataItemsView.tsx`  
  A focused wrapper for the `data_item` view mode.

- `table/ItemsTableRow.tsx`  
  Renders one row in the generic items table.

- `table/CarMaintenanceTable.tsx`  
  Optional nested table rendered inside a row when car maintenance entries exist.

Naming intentionally reflects behavior, not backend model names.

Shared data contracts live in `src/move/types/` to avoid view -> form dependency coupling.
