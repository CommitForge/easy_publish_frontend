# ERP Integration Module (Practical Guide + API Reference)

This guide explains how the ERP module fits into real workflows, how to use it safely in production, and exactly which parameters are available.

Base path:

```http
/api/erp/*
```

The ERP module is isolated from core app tables and uses only `erp_*` tables.

## What This Module Is For

Use ERP integration when you want to:

- keep ERP records in backend staging (`erp_record`), even if some records are never published on-chain
- publish selected ERP records to chain through the Easy Publish CLI
- track sync state after publish
- get suggested verification follow-up items

In short: **ERP system -> ERP API -> ERP staging/jobs -> CLI publish -> sync -> verification candidates**.

## Module Boundaries (Important)

ERP module tables:

- `erp_integration`: connector config, defaults, auth key, CLI config
- `erp_record`: ERP record staging (publishable and non-publishable)
- `erp_blob`: compressed record payload artifacts
- `erp_publish_job`: publish execution and sync tracking
- `erp_sync_cursor`: integration-level sync checkpoints
- `erp_verification_candidate`: suggested verification follow-up items

No existing non-ERP tables are modified by ERP staging operations.

## Enablement

ERP API is disabled by default.

```properties
app.erp.api.enabled=true
app.erp.api.allow-owner-address-auth=false
```

Without this, `/api/erp/*` endpoints are not active.
With `app.erp.api.allow-owner-address-auth=false` (default), integration-scoped endpoints require `X-ERP-API-KEY`.

## Authentication Model

### Owner-driven endpoints

- `POST /api/erp/integrations`
- `GET /api/erp/integrations`

These use `ownerAddress` directly.

### Integration-scoped endpoints

For all other ERP endpoints, provide one of:

- query param: `ownerAddress`
- header: `X-ERP-API-KEY`

If both are sent, API key takes precedence.
Security default: ownerAddress auth is disabled unless explicitly enabled with `app.erp.api.allow-owner-address-auth=true`.

## First Practical Run (Recommended Order)

### 1) Create an ERP integration

Create once per ERP connector/system.

```bash
curl -sS -X POST "$BASE/api/erp/integrations" \
  -H "Content-Type: application/json" \
  -d '{
    "ownerAddress": "'$OWNER'",
    "name": "ERP Connector - Main",
    "description": "Primary ERP connector",
    "defaultContainerId": "'$CONTAINER_ID'",
    "defaultDataTypeId": "'$DATA_TYPE_ID'",
    "cliBinary": "node",
    "cliScript": "'$CLI_SCRIPT'",
    "cliWorkingDirectory": ".",
    "cliNetwork": "mainnet",
    "cliPrivateKeyEnvVar": "IOTA_PRIVATE_KEY"
  }'
```

Save:

- `id` as `integrationId`
- returned `apiKey` (shown only when secret is included)

### 2) Stage record(s) from ERP

```bash
curl -sS -X POST "$BASE/api/erp/records" \
  -H "Content-Type: application/json" \
  -H "X-ERP-API-KEY: $ERP_API_KEY" \
  -d '{
    "integrationId": "'$INTEGRATION_ID'",
    "externalRecordId": "ERP-INV-100045",
    "recordName": "Invoice INV-100045",
    "recordDescription": "Customer invoice",
    "contentRaw": "{\"invoiceNo\":\"INV-100045\",\"amount\":1250}",
    "metadataJson": "{\"source\":\"erp\",\"module\":\"billing\"}",
    "recipientsCsv": "rms1...,rms2...",
    "referencesCsv": "PO-9921",
    "tagsCsv": "invoice,finance",
    "shouldPublish": true
  }'
```

Tip: `externalRecordId` should be stable and unique in ERP. Sync matching uses it.

### 3) Validate and optionally optimize payload

```bash
curl -sS -X POST "$BASE/api/erp/records/$RECORD_ID/check?integrationId=$INTEGRATION_ID" \
  -H "X-ERP-API-KEY: $ERP_API_KEY"

curl -sS -X POST "$BASE/api/erp/records/$RECORD_ID/compact?integrationId=$INTEGRATION_ID" \
  -H "X-ERP-API-KEY: $ERP_API_KEY"

curl -sS -X POST "$BASE/api/erp/records/$RECORD_ID/zip?integrationId=$INTEGRATION_ID" \
  -H "X-ERP-API-KEY: $ERP_API_KEY"
```

### 4) Dry-run publish first

```bash
curl -sS -X POST "$BASE/api/erp/jobs/publish" \
  -H "Content-Type: application/json" \
  -H "X-ERP-API-KEY: $ERP_API_KEY" \
  -d '{
    "integrationId": "'$INTEGRATION_ID'",
    "recordIds": ["'$RECORD_ID'"],
    "dryRun": true
  }'
```

Then execute real publish with `"dryRun": false`.

### 5) Track sync

```bash
curl -sS "$BASE/api/erp/jobs?integrationId=$INTEGRATION_ID" \
  -H "X-ERP-API-KEY: $ERP_API_KEY"

curl -sS -X POST "$BASE/api/erp/jobs/sync-refresh?integrationId=$INTEGRATION_ID" \
  -H "X-ERP-API-KEY: $ERP_API_KEY"
```

### 6) Refresh verification candidates

```bash
curl -sS -X POST "$BASE/api/erp/verifications/candidates/refresh?integrationId=$INTEGRATION_ID" \
  -H "X-ERP-API-KEY: $ERP_API_KEY"
```

## Parameter Selection Guide (How To Choose Values)

### Integration config

| Parameter | How to choose | Typical value |
|---|---|---|
| `ownerAddress` | Wallet/address owning this connector | Your account address |
| `name` | Human-readable connector identity | `ERP Connector - Main` |
| `defaultContainerId` | Default container for records that omit container | existing container ID |
| `defaultDataTypeId` | Default type for records that omit type | existing type ID |
| `cliBinary` | Binary used to run CLI script | `node` |
| `cliScript` | Script/entrypoint for Easy Publish CLI | absolute script path |
| `cliWorkingDirectory` | Directory where CLI runs | `.` or service directory |
| `cliNetwork` | Target chain profile | `mainnet` / `testnet` |
| `cliPrivateKeyEnvVar` | Env var name that stores private key | `IOTA_PRIVATE_KEY` |

### Record payload

| Parameter | How to choose | Notes |
|---|---|---|
| `externalRecordId` | Stable ERP primary key | required for robust sync matching |
| `recordName` | Human-friendly title | checked by `/check` |
| `containerId` | Explicit container per record | optional if integration default exists |
| `dataTypeId` | Explicit type per record | optional if integration default exists |
| `contentRaw` | Canonical payload to publish/store | required for publish/zip |
| `metadataJson` | Extra metadata (JSON string) | validated as JSON by `/check` |
| `recipientsCsv` | Comma-separated recipients | optional |
| `referencesCsv` | Comma-separated references | optional |
| `tagsCsv` | Comma-separated tags | optional |
| `shouldPublish` | Publish on-chain or keep ERP-only | `false` keeps off-chain only |

## State Machines

### Integration status

- `ACTIVE`
- `PAUSED`
- `INACTIVE`

### Record validation status

- `NOT_CHECKED`
- `VALID`
- `INVALID`

### Record publish status

- `NEW`
- `CHECKED`
- `WAITING_SYNC`
- `PUBLISHED`
- `FAILED`
- `SKIPPED`

### Publish job status

- `RUNNING_CLI`
- `VALIDATION_FAILED`
- `CLI_FAILED`
- `DRY_RUN_OK`
- `WAITING_SYNC`
- `SYNCED`
- `SKIPPED`

### Verification candidate status

- `OPEN`
- `RESOLVED`
- `IGNORED`

## Endpoint Reference

All endpoints below are under `/api/erp`.

### Integrations

#### `POST /integrations`
Create integration.

Body:

- `ownerAddress` (required)
- `name` (required)
- `description` (optional)
- `webhookUrl` (optional)
- `defaultContainerId` (optional)
- `defaultDataTypeId` (optional)
- `cliBinary` (optional)
- `cliScript` (optional)
- `cliWorkingDirectory` (optional)
- `cliNetwork` (optional)
- `cliPrivateKeyEnvVar` (optional)

#### `GET /integrations?ownerAddress=...`
List integrations for owner.

Response is intentionally summary-focused (does not include CLI path configuration fields).

Query params:

- `ownerAddress` (required)

#### `GET /integrations/{integrationId}`
Get integration details.

Path params:

- `integrationId` (required)

Query params:

- `includeSecret` (optional, default `false`)
- `ownerAddress` (optional, required if no API key)

Headers:

- `X-ERP-API-KEY` (optional, required if no `ownerAddress`)

#### `PATCH /integrations/{integrationId}`
Update integration.

Path params:

- `integrationId` (required)

Body (all optional, patch semantics):

- `name`
- `description`
- `status` (`ACTIVE|INACTIVE|PAUSED`)
- `webhookUrl`
- `defaultContainerId`
- `defaultDataTypeId`
- `cliBinary`
- `cliScript`
- `cliWorkingDirectory`
- `cliNetwork`
- `cliPrivateKeyEnvVar`

Auth:

- `ownerAddress` query or `X-ERP-API-KEY`

#### `POST /integrations/{integrationId}/rotate-key`
Rotate ERP API key.

Path params:

- `integrationId` (required)

Auth:

- `ownerAddress` query or `X-ERP-API-KEY`

### Records

#### `POST /records`
Upsert one record. If `externalRecordId` exists for the same integration, that row is updated.

Body:

- `integrationId` (required)
- `externalRecordId` (optional)
- `recordName` (optional but needed for successful check/publish)
- `recordDescription` (optional)
- `containerId` (optional)
- `dataTypeId` (optional)
- `contentRaw` (optional but needed for successful publish/zip)
- `metadataJson` (optional JSON string)
- `recipientsCsv` (optional)
- `referencesCsv` (optional)
- `tagsCsv` (optional)
- `shouldPublish` (optional)

Auth:

- `ownerAddress` query or `X-ERP-API-KEY`

#### `POST /records/bulk`
Upsert multiple records.

Body:

- `integrationId` (required)
- `records` (required array of `POST /records` payload objects)

Auth:

- `ownerAddress` query or `X-ERP-API-KEY`

#### `GET /records`
List records.

Query params:

- `integrationId` (required)
- `publishStatus` (optional)
- `query` (optional; search across external ID/name/description/container/type)
- `ownerAddress` (optional, required if no API key)

Headers:

- `X-ERP-API-KEY` (optional, required if no `ownerAddress`)

#### `GET /records/{recordId}`
Get one record.

Path params:

- `recordId` (required)

Query params:

- `integrationId` (required)
- `ownerAddress` (optional, required if no API key)

Headers:

- `X-ERP-API-KEY` (optional, required if no `ownerAddress`)

#### `POST /records/{recordId}/check`
Validate effective publish fields.

#### `POST /records/{recordId}/compact`
Compact `contentRaw` into `contentCompacted`.

#### `POST /records/{recordId}/zip`
Zip effective content and store artifact in `erp_blob`.

#### `POST /records/{recordId}/unzip`
Read zipped payload and return:

- `unzippedContent`
- `unzippedBase64`

For all four actions above:

Path params:

- `recordId` (required)

Query params:

- `integrationId` (required)
- `ownerAddress` (optional, required if no API key)

Headers:

- `X-ERP-API-KEY` (optional, required if no `ownerAddress`)

### Publish Jobs and Sync

#### `POST /jobs/publish`
Create one publish job per record ID.

Body:

- `integrationId` (required)
- `recordIds` (required non-empty array)
- `dryRun` (optional boolean, default false behavior)

Auth:

- `ownerAddress` query or `X-ERP-API-KEY`

#### `GET /jobs`
List jobs.

Query params:

- `integrationId` (required)
- `status` (optional)
- `ownerAddress` (optional, required if no API key)

Headers:

- `X-ERP-API-KEY` (optional, required if no `ownerAddress`)

#### `GET /jobs/{jobId}`
Get one job.

Path params:

- `jobId` (required)

Query params:

- `integrationId` (required)
- `ownerAddress` (optional, required if no API key)

Headers:

- `X-ERP-API-KEY` (optional, required if no `ownerAddress`)

#### `POST /jobs/{jobId}/retry`
Retry a prior job (re-runs publish logic for that record).

#### `POST /jobs/{jobId}/sync-check`
Re-check one job's sync state.

For both endpoints above:

Path params:

- `jobId` (required)

Query params:

- `integrationId` (required)
- `ownerAddress` (optional, required if no API key)

Headers:

- `X-ERP-API-KEY` (optional, required if no `ownerAddress`)

#### `POST /jobs/sync-refresh`
Refresh all `WAITING_SYNC` jobs for one integration.

Query params:

- `integrationId` (required)
- `ownerAddress` (optional, required if no API key)

Headers:

- `X-ERP-API-KEY` (optional, required if no `ownerAddress`)

#### `POST /jobs/diagnostics`
Run CLI diagnostics (`--help`) with integration CLI config.

Query params:

- `integrationId` (required)
- `ownerAddress` (optional, required if no API key)

Headers:

- `X-ERP-API-KEY` (optional, required if no `ownerAddress`)

### Verification Candidates

#### `POST /verifications/candidates/refresh`
Recompute candidate verification items from linked synced data items.

Query params:

- `integrationId` (required)
- `ownerAddress` (optional, required if no API key)

Headers:

- `X-ERP-API-KEY` (optional, required if no `ownerAddress`)

#### `GET /verifications/candidates`
List candidates.

Query params:

- `integrationId` (required)
- `status` (optional: `OPEN|RESOLVED|IGNORED`)
- `ownerAddress` (optional, required if no API key)

Headers:

- `X-ERP-API-KEY` (optional, required if no `ownerAddress`)

#### `PATCH /verifications/candidates/{candidateId}`
Update candidate status.

Path params:

- `candidateId` (required)

Query params:

- `integrationId` (required)
- `ownerAddress` (optional, required if no API key)

Headers:

- `X-ERP-API-KEY` (optional, required if no `ownerAddress`)

Body:

- `status` (required: `OPEN|RESOLVED|IGNORED`)

## CLI Configuration Keys (Backend)

These are backend-level defaults; integration-level values override them.

- `app.erp.cli.binary`
- `app.erp.cli.script`
- `app.erp.cli.working-directory`
- `app.erp.cli.default-network`
- `app.erp.cli.private-key-env-var`
- `app.erp.cli.timeout-ms`
- `app.node.cli-dir`

## Common Failure Cases

- `401 Provide ownerAddress query param or X-ERP-API-KEY header`
  - Missing auth on integration-scoped endpoint.
- `403 Invalid ERP api key`
  - Wrong `X-ERP-API-KEY`.
- `400 ownerAddress is required`
  - Missing owner on create/list integrations.
- `400 recordIds[] is required`
  - Publish request without record IDs.
- `400 contentRaw is empty`
  - Compact called without content.
- `400 No content available to zip`
  - Zip called before content is set.
- `400 Unsupported status`
  - Invalid integration or candidate status enum.

## Practical Recommendations

- Always set `externalRecordId` from ERP primary key.
- Always do dry-run before live publish.
- Keep integration defaults (`defaultContainerId`, `defaultDataTypeId`) set to reduce record payload noise.
- Use `shouldPublish=false` for ERP-only records that still need staging/audit trail.
- Refresh sync and verification candidates in scheduled jobs after publish batches.
