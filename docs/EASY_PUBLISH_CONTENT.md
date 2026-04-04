# Easy Publish Content JSON

This document describes the JSON structure used inside the `content` field of
containers, data types, and data items when using the `easy_publish` format.

## Base Structure

`content` is usually a JSON string. The expected structure is:

```json
{
  "easy_publish": {
    "publish": {
      "targets": [
        {
          "domain": "example.com",
          "base_url": "https://example.com",
          "enabled": true
        }
      ]
    },
    "revisions": {
      "enabled": true,
      "replaces": [
        "0xPREVIOUS_DATA_ITEM_ID"
      ],
      "change": "Corrected mileage value from previous entry"
    }
  }
}
```

## Revisions Extension (Generic)

`easy_publish.revisions` is generic (not Cars-specific) and can be used by any
instance/page.

Recommended format:

```json
{
  "easy_publish": {
    "revisions": {
      "enabled": true,
      "replaces": [
        "0xPREVIOUS_DATA_ITEM_ID"
      ],
      "change": "Fixed typo in maintenance details"
    }
  }
}
```

Notes:

- `enabled` has the same meaning as `publish.targets[*].enabled`:
  - `true`: apply this revisions block.
  - `false`: ignore this revisions block.
  - missing `enabled` in object form: treated as `false` (explicit opt-in).
- `replaces` should contain previous data item IDs being superseded.
- `change` is an optional short human-readable description of what changed in
  this revision.
- Revisions are container-local:
  - replacement IDs in `replaces` must belong to the same container as the new
    data item.
  - cross-container revision chains are invalid and are filtered/blocked in UI.
- Revisions and transaction `references` are independent fields:
  - `easy_publish.revisions.replaces` defines revision lineage.
  - transaction `references` remains generic link metadata.

## Follow Containers Extension (Generic)

`easy_publish.follow_containers` is used for on-chain follow/unfollow updates.

Recommended format:

```json
{
  "easy_publish": {
    "follow_containers": [
      {
        "container_id": "0xCONTAINER_TO_FOLLOW",
        "enabled": true
      },
      {
        "container_id": "0xCONTAINER_TO_UNFOLLOW",
        "enabled": false
      }
    ]
  }
}
```

Notes:

- `enabled: true` means follow.
- `enabled: false` means unfollow.
- Multiple follow/unfollow updates can be submitted in one publish.
- Follow updates are applied from the **publisher address** of that data item.
- Follow updates are indexed off-chain from synced on-chain data; direct
  follow/unfollow API mutation is no longer the canonical path.

## Design Rationale

### Why `publish.targets` is per-target and `revisions` is not

- `publish.targets[]` describes multiple independent publish destinations
  (domains). Each destination can be enabled/disabled separately.
- `revisions` describes one item-level lineage statement ("this item supersedes
  previous item(s)"). That meaning is global for the current data item, not
  domain-specific.

### Why `revisions` is plural but an object

- The key name is plural for semantics/scope, not JSON container type.
- It represents a revision metadata namespace that can hold multiple fields now
  and in the future.
- It is still compatible with multiple previous IDs via `replaces: []`.

### Why no reverse-link fields in content

- Data items are immutable on-chain; older items cannot be updated later to
  point to newer ones.
- Therefore, canonical on-chain revision direction is forward only:
  newer item -> older item(s), via `revisions.replaces`.
- Reverse links (for example "superseded by") are off-chain derivations and
  are intentionally not required in `content`.

## Compatibility and Future-Proofing Rules

Follow these rules for stable long-term integration:

1. Write canonical object form
- Prefer:
  - `easy_publish.publish.targets[]` entries with explicit `enabled`.
  - `easy_publish.revisions` object with explicit `enabled` and `replaces`.
- Avoid relying on implicit defaults.

2. Keep `enabled` explicit
- `targets[*].enabled` and `revisions.enabled` are both feature toggles.
- For `revisions` object form, missing `enabled` is treated as `false`.

3. Keep revisions and references independent
- Use `easy_publish.revisions.replaces` only for revision lineage.
- Use transaction `references` only for generic links/citations.
- Do not assume one field is mirrored into the other.

4. Preserve unknown keys
- Consumers should ignore unknown `easy_publish.*` keys.
- Producers should not delete unknown keys they do not own.
- This enables safe extension without breaking older clients.

5. Use namespaced instance extensions
- Put instance-specific data under `easy_publish.<instance_key>`.
- Keep generic keys (`publish`, `revisions`) cross-instance and stable.

6. Additive evolution only
- Prefer adding optional keys over renaming/removing existing keys.
- If a breaking change is ever needed, introduce an explicit schema/version
  marker (for example `easy_publish.schema`) and support transition windows.

## Cars Extension

In Cars mode, the frontend also uses:

```json
{
  "easy_publish": {
    "publish": {
      "targets": [
        {
          "domain": "cars.izipublish.com",
          "base_url": "https://cars.izipublish.com",
          "enabled": true
        }
      ]
    },
    "cars": {
      "maintenances": [
        {
          "date": "2026-03-01",
          "distance": "185000 km",
          "service": "Oil change",
          "cost": "120 EUR",
          "parts": "Oil filter",
          "performed_by": "Garage XYZ",
          "note": "Regular service"
        }
      ]
    }
  }
}
```

## Field Notes

- `easy_publish.publish.targets`: Optional list of publishing targets.
- `easy_publish.revisions`: Generic revision metadata for data items.
- `easy_publish.<instance_key>`: Instance-specific extension area (for example
  `cars`).
- `easy_publish.cars.maintenances`: Array used by the Cars table UI.

## Encoded Content Marker (Auto Zip)

When frontend `Auto zip` is enabled, submitted content is wrapped as:

```text
EPZIP1:gzip+base64:<payload>
```

Where:

- prefix: `EPZIP1:gzip+base64:`
- payload: `Base64(gzip(UTF-8(content)))`

Backend processing behavior:

1. If content starts with `EPZIP1:gzip+base64:`, backend decodes it before
   content parsing/indexing.
2. If prefix is not present, content is treated as normal plain JSON/XML/text.

This marker is intentionally explicit so encoded content is never confused with
other archive formats (`zip`, `7z`, `tar.gz`, etc.).

## Behavior In Frontend

- If `easy_publish.cars.maintenances` exists and is an array, the items table
  renders a nested maintenance table.
- If `easy_publish.revisions` is enabled and valid, the items table renders a
  nested `Revisions` table.
- In Cars mode, superseded older data items referenced by newer revisions are
  hidden for a friendlier "latest state" view.
- In Generic mode, all data items are still shown; newer items show their
  referenced previous revisions in the nested `Revisions` table.
- If missing or invalid, the maintenance sub-table is not shown.
- Publish Data Item form includes a `Revisions (previous Data Item IDs)` input
  in both Generic and Cars mode, inside a collapsed advanced section.
- Before submit, revision `replaces` IDs are checked against indexed backend
  data (`/api/data-items/{id}`); missing IDs block submit.
- Revision IDs are not automatically merged into transaction `references`.
  References are submitted exactly as entered in the References field.
- Cars editor keeps existing JSON where possible and ensures:
  - `easy_publish` exists
  - `easy_publish.publish.targets` exists
  - `easy_publish.cars.maintenances` is updated from form values

## Recommendation For New Instances

For new domains/instances, keep this pattern:

```json
{
  "easy_publish": {
    "publish": { "targets": [] },
    "<your_instance_key>": {}
  }
}
```

Use your own instance key under `easy_publish` (for example `fleet`,
`medical`, `education`) and keep data schema stable for your UI integrations.

## Related Docs

For REST tree endpoint details and full `/api/items` examples, see:

- `docs/ITEMS_API.md`
