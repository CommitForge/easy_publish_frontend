# Link Graph API (Proposed)

This document defines the backend API used by the frontend `Recipients Graph` and `References Graph` dialog.

## Endpoint

- `POST /api/link-graph`

## Request Body

```json
{
  "mode": "recipients",
  "sourceType": "data_item",
  "sourceContainerId": "0x...",
  "sourceDataItemId": "0x...",
  "seeds": ["0x...", "0x..."],
  "maxDepth": 3,
  "maxNodes": 160,
  "preventCycles": true
}
```

### Fields

- `mode`: `"recipients"` or `"references"`.
- `sourceType`: `"data_item"` or `"data_item_verification"`.
- `sourceContainerId`: Optional container context.
- `sourceDataItemId`: Optional data-item context.
- `seeds`: Root IDs/addresses from form input.
- `maxDepth`: Traversal depth limit.
- `maxNodes`: Hard node cap.
- `preventCycles`: Backend should enforce visited-set cycle prevention.

## Response Shape

```json
{
  "nodes": [
    { "id": "0x...", "label": "0x...", "level": 0, "kind": "seed" }
  ],
  "edges": [
    { "from": "0x...", "to": "0x...", "relation": "recipient_of" }
  ],
  "info": "Optional backend hint"
}
```

## Cycle/Recursion Safety

Backend traversal should include all of:

- `visited` set for node IDs.
- Depth guard (`depth > maxDepth` stop).
- Node guard (`count > maxNodes` stop).
- Optional edge cap (`<= maxNodes * 3`) to prevent oversized payloads.

When limits are hit, backend should return partial graph plus a message in `info`.
