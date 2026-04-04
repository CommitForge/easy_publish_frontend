# Link Graph API (Beta)

This document defines the backend API used by frontend graph dialogs:

- `Recipients Graph`
- `References Graph`

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

- `mode`: `"recipients"` or `"references"` (default: `recipients`).
- `sourceType`: `"data_item"` or `"data_item_verification"` (default: `data_item`).
- `sourceContainerId`: Optional container context.
- `sourceDataItemId`: Optional source object ID context.
- `seeds`: Root IDs/addresses from form input.
- `maxDepth`: Traversal depth limit.
  - default: `3`
  - clamp: `1..8`
- `maxNodes`: Hard node cap.
  - default: `160`
  - clamp: `1..500`
- `preventCycles`: Enables visited-set cycle prevention (default: `true`).

Behavior notes:

- If `seeds` is empty, backend returns `nodes=[]`, `edges=[]`, and `info`.
- In `references` mode, edges can include both:
  - `references`
  - `referenced_by`
- In `recipients` mode, edges can include both:
  - `has_recipient`
  - `recipient_of`
- Backend can return partial graph with `info` when depth/node/edge limits are hit.

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

Node `kind` values can include:

- `seed`
- `data_item`
- `data_item_verification`
- `recipient`
- `reference`

## Cycle/Recursion Safety

Backend traversal includes all of:

- `visited` set for node IDs.
- Depth guard (`depth > maxDepth` stop).
- Node guard (`count > maxNodes` stop).
- Edge cap (`<= maxNodes * 3`) to prevent oversized payloads.

When limits are hit, backend returns partial graph plus a message in `info`.
