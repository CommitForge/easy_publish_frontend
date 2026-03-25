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
    }
  }
}
```

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
- `easy_publish.<instance_key>`: Instance-specific extension area (for example
  `cars`).
- `easy_publish.cars.maintenances`: Array used by the Cars table UI.

## Behavior In Frontend

- If `easy_publish.cars.maintenances` exists and is an array, the items table
  renders a nested maintenance table.
- If missing or invalid, the maintenance sub-table is not shown.
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
