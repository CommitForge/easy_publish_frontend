# Items API (Beta)

This document describes the `/api/items` endpoint used by the frontend for
container, data type, data item, and data item verification tree loading.

## Beta Notice

This API contract is currently **beta**.

- URL structure and parameter names may evolve.
- The API path may move to an explicit versioned form in the future
  (for example, `/api/v1/items`), but not limited to that approach.
- Consumers should avoid hard-coding assumptions beyond the documented
  response keys used by the UI.

## Base URL

Use the configured backend base and append `api/items`.

Examples:

- `https://<host>/izipublish/api/items`
- `/api/items` (when running behind a proxy at root)

## Query Parameters

| Param | Required | Description |
|---|---|---|
| `userAddress` | Yes | Address used for accessible-container scope. |
| `include` | No | CSV include set: `CONTAINER,DATA_TYPE,DATA_ITEM,DATA_ITEM_VERIFICATION`. |
| `containerId` | No | Single-container mode. |
| `dataTypeId` | No | Restrict to a specific data type. |
| `dataItemId` | No | Restrict to a specific data item. |
| `dataItemVerificationId` | No | Restrict verifications by verification ID. |
| `dataItemVerificationVerified` | No | Verification status filter: `true` or `false`. |
| `dataItemQuery` | No | Data-item text search string (item mode). |
| `dataItemSearchFields` | No | CSV search fields: `name,description,content,externalId,externalIndex,objectId,dataType,creatorAddr`. |
| `dataItemVerified` | No | Data-item `verified` filter (`true` or `false`). |
| `dataItemHasRevisions` | No | Filter items by revisions presence (`true` or `false`). |
| `dataItemHasVerifications` | No | Filter items by attached verifications presence (`true` or `false`). |
| `dataItemDataType` | No | Filter by data type name (exact, case-insensitive). |
| `dataItemSortBy` | No | Item sort key: `created`, `name`, `external_index`, `external_id`. |
| `dataItemSortDirection` | No | Sort direction: `asc` or `desc`. |
| `domain` | No | Optional publish-domain scope. |
| `page` | No | 0-based page index. |
| `pageSize` | No | Page size (server may clamp). |

Default data-item sort is `dataItemSortBy=created&dataItemSortDirection=desc`
(latest on-chain sequence index first).

Legacy aliases can still appear in integrations:

- `verificationId` -> `dataItemVerificationId`
- `verificationVerified` -> `dataItemVerificationVerified`

## Include Values

Supported include values:

- `CONTAINER`
- `DATA_TYPE`
- `DATA_ITEM`
- `DATA_ITEM_VERIFICATION`

Frontend defaults:

- Container list: `CONTAINER`
- Data type list: `CONTAINER,DATA_TYPE`
- Data item list: `CONTAINER,DATA_TYPE,DATA_ITEM,DATA_ITEM_VERIFICATION`

## Pagination Behavior

Pagination level is selected by backend mode and returned in `meta.paginationLevel`:

- No `containerId`: pagination at `container` level.
- `containerId` + type-level browsing: pagination at `data_type` level.
- `containerId` + item browsing: pagination at `data_item` level.

Use:

- `meta.hasNext` for next-page button behavior.
- `meta.totalPages` for page count display.

## Request Examples

Browse containers:

```http
GET /izipublish/api/items?userAddress=0x...&include=CONTAINER&page=0&pageSize=20
```

Browse data types in one container:

```http
GET /izipublish/api/items?userAddress=0x...&containerId=0xcontainer123&include=CONTAINER,DATA_TYPE&page=0&pageSize=20
```

Browse data items and verifications:

```http
GET /izipublish/api/items?userAddress=0x...&containerId=0xcontainer123&include=CONTAINER,DATA_TYPE,DATA_ITEM,DATA_ITEM_VERIFICATION&page=0&pageSize=20
```

Search data items server-side and keep latest-first order:

```http
GET /izipublish/api/items?userAddress=0x...&containerId=0xcontainer123&include=CONTAINER,DATA_TYPE,DATA_ITEM,DATA_ITEM_VERIFICATION&dataItemQuery=oil%20change&dataItemSearchFields=name,description,content,externalId,externalIndex&dataItemSortBy=created&dataItemSortDirection=desc&page=0&pageSize=20
```

Only verified data item verifications:

```http
GET /izipublish/api/items?userAddress=0x...&containerId=0xcontainer123&include=CONTAINER,DATA_TYPE,DATA_ITEM,DATA_ITEM_VERIFICATION&dataItemVerificationVerified=true&page=0&pageSize=20
```

Only failed data item verifications:

```http
GET /izipublish/api/items?userAddress=0x...&containerId=0xcontainer123&include=CONTAINER,DATA_TYPE,DATA_ITEM,DATA_ITEM_VERIFICATION&dataItemVerificationVerified=false&page=0&pageSize=20
```

## Sample Response

```json
{
  "containers": [
    {
      "container": {
        "id": "0xcontainer123",
        "name": "Vehicle Records",
        "description": "Main vehicle container"
      },
      "dataTypes": [
        {
          "dataType": {
            "id": "0xtype001",
            "containerId": "0xcontainer123",
            "name": "Maintenance",
            "description": "Service history"
          },
          "dataItems": [
            {
              "dataItem": {
                "id": "0xitem001",
                "containerId": "0xcontainer123",
                "dataTypeId": "0xtype001",
                "name": "Oil Change 2026-03-01",
                "description": "Filter + oil replaced",
                "verified": false
              },
              "dataItemVerifications": [
                {
                  "id": "0xverif001",
                  "containerId": "0xcontainer123",
                  "dataItemId": "0xitem001",
                  "name": "Garage Verification",
                  "verified": true
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "meta": {
    "paginationLevel": "data_item",
    "page": 0,
    "pageSize": 20,
    "totalPages": 1,
    "hasNext": false,
    "includes": [
      "CONTAINER",
      "DATA_TYPE",
      "DATA_ITEM",
      "DATA_ITEM_VERIFICATION"
    ],
    "filters": {
      "containerId": "0xcontainer123",
      "dataTypeId": null,
      "dataItemId": null,
      "dataItemVerificationId": null,
      "dataItemVerificationVerified": null,
      "dataItemQuery": null,
      "dataItemSearchFields": "name,description,content,externalId,externalIndex",
      "dataItemVerified": null,
      "dataItemHasRevisions": null,
      "dataItemHasVerifications": null,
      "dataItemDataType": null,
      "dataItemSortBy": "created",
      "dataItemSortDirection": "desc",
      "domain": null
    },
    "availableDataTypes": ["Maintenance", "Insurance"]
  }
}
```

## Frontend Notes

- Data items are rendered from `containers -> dataTypes -> dataItems`.
- If `dataItemVerifications` exist for a data item, the UI can render a nested
  master-detail verification table.
- Data-item search/filter/sort runs backend-side before pagination. Use
  `meta.totalDataItems` as the total for the active filter set.
- Revision UI (nested `Revisions` table) is driven by `easy_publish.revisions`
  in `dataItem.content` and requires `enabled: true` in object form.
- Transaction `reference/references` fields are not used to derive revisions.
- Revision rows are shown only when the referenced previous data item is inside
  the same container as the current row (container-local revision policy).
