# Analytics Dashboard API (Beta)

This document describes the read-only analytics endpoint intended for the
frontend `Dashboard` panel.

The goal is to return aggregated data from the local Postgres indexer, without
full-tree payloads.

## Endpoint

```http
GET /api/analytics/dashboard
```

## Query Parameters

| Param | Required | Description |
|---|---|---|
| `userAddress` | Yes | Wallet address used for visibility scope. |
| `granularity` | No | `day`, `month`, or `year` (default: `month`). |
| `from` | No | Inclusive date (`YYYY-MM-DD`). |
| `to` | No | Inclusive date (`YYYY-MM-DD`). |
| `timezone` | No | IANA timezone (default: `UTC`). |
| `topN` | No | Size of top lists (default: `8`, max: `25`). |
| `containerId` | No | Optional scope to one container. |
| `dataTypeId` | No | Optional scope to one data type. |
| `drilldownDimension` | No | `container`, `dataType`, or `address`. |
| `drilldownKey` | No | Identifier for drilldown (ID or address). |
| `domain` | No | Optional domain-specific scope (same behavior as `/api/items`). |

## Scope Rule

Scope should include all containers visible to the user in frontend views:

- owned/accessible containers
- followed containers

That makes dashboard numbers align with what users can browse in UI.

## Response Shape

```json
{
  "meta": {
    "generatedAt": "2026-04-03T07:55:10.000Z",
    "timezone": "Europe/Ljubljana",
    "from": "2026-01-01",
    "to": "2026-04-03",
    "granularity": "month"
  },
  "totals": {
    "containers": 23,
    "dataTypes": 74,
    "dataItems": 1820,
    "verifications": 641,
    "activeAddresses": 51,
    "followedContainers": 12
  },
  "timeSeries": [
    {
      "bucket": "2026-01-01",
      "label": "2026-01",
      "containers": 18,
      "dataTypes": 63,
      "dataItems": 441,
      "verifications": 156,
      "activeAddresses": 39
    }
  ],
  "topDataTypes": [
    {
      "dataTypeId": "0x...",
      "dataTypeName": "Maintenance",
      "containerId": "0x...",
      "containerName": "Vehicle Records",
      "dataItems": 304,
      "verifications": 120
    }
  ],
  "topContainers": [
    {
      "containerId": "0x...",
      "containerName": "Vehicle Records",
      "dataTypes": 8,
      "dataItems": 490,
      "verifications": 173
    }
  ],
  "topAddresses": {
    "dataItems": [
      { "address": "0x...", "count": 212 }
    ],
    "verifications": [
      { "address": "0x...", "count": 74 }
    ]
  },
  "drilldown": {
    "dimension": "container",
    "key": "0x...",
    "label": "Vehicle Records",
    "totals": {
      "dataTypes": 8,
      "dataItems": 490,
      "verifications": 173
    },
    "timeSeries": [
      {
        "bucket": "2026-03-01",
        "label": "2026-03",
        "dataItems": 71,
        "verifications": 28
      }
    ]
  }
}
```

## Suggested SQL Pattern (PostgreSQL)

Use CTEs and `date_trunc` so the API executes compact aggregate queries.

```sql
WITH visible_containers AS (
  SELECT DISTINCT c.id
  FROM containers c
  LEFT JOIN container_owners co ON co.container_id = c.id
  LEFT JOIN followed_containers fc ON fc.container_id = c.id
  WHERE co.owner_address = :user_address
     OR fc.user_address = :user_address
),
scoped_items AS (
  SELECT di.id,
         di.container_id,
         di.data_type_id,
         di.creator_addr,
         di.created_on_chain
  FROM data_items di
  JOIN visible_containers vc ON vc.id = di.container_id
  WHERE (:container_id IS NULL OR di.container_id = :container_id)
    AND (:data_type_id IS NULL OR di.data_type_id = :data_type_id)
    AND (:from_ts IS NULL OR di.created_on_chain >= :from_ts)
    AND (:to_ts IS NULL OR di.created_on_chain < :to_ts)
),
scoped_verifications AS (
  SELECT dv.id,
         dv.data_item_id,
         dv.creator_addr,
         dv.created_on_chain
  FROM data_item_verifications dv
  JOIN scoped_items si ON si.id = dv.data_item_id
  WHERE (:from_ts IS NULL OR dv.created_on_chain >= :from_ts)
    AND (:to_ts IS NULL OR dv.created_on_chain < :to_ts)
)
SELECT 1;
```

Then run focused aggregates over these CTEs:

- totals (`COUNT(*)`, `COUNT(DISTINCT ...)`)
- time-series (`date_trunc(:granularity, created_on_chain)`)
- top types/containers/addresses (`GROUP BY ... ORDER BY count DESC LIMIT :top_n`)
- optional drilldown with one extra `WHERE` predicate

## Indexing Recommendations

To keep this endpoint fast on larger indexers, add or verify indexes:

- `data_items(container_id, created_on_chain)`
- `data_items(data_type_id, created_on_chain)`
- `data_items(creator_addr, created_on_chain)`
- `data_item_verifications(data_item_id, created_on_chain)`
- `data_item_verifications(creator_addr, created_on_chain)`
- `followed_containers(user_address, container_id)`

## Notes

- Keep endpoint read-only.
- Keep payload aggregate-focused; avoid returning full item rows.
- Clamp date windows and `topN` to prevent heavy scans.
- Frontend already handles missing fields as optional for safe rollout.
