# iZiPublisher IOTA Scripts

## Requirements

- Node.js 18+
- `@iota/iota-sdk`

Install dependencies:

```bash
npm install
```

## Quick Start (Network + Signer)

1. Copy the template:

```bash
cp .env.cli.example .env.cli
```

2. Fill these values in `.env.cli`:

- `IZIPUB_NETWORK` (or `IOTA_NETWORK`)
- signer: `IOTA_PRIVATE_KEY` or `IOTA_MNEMONIC`
- move IDs: `PACKAGE_ID`, `MODULE`, `CLOCK_ID`, `CONTAINER_CHAIN_ID`, `DATA_ITEM_CHAIN`, `DATA_ITEM_VERIFICATION_CHAIN`, `UPDATE_CHAIN_ID`

3. Run commands (auto-loads `.env.cli`, `.env.cli.local`, `.env`, `.env.production`, `.env.local` from script/cwd/parent roots):

```bash
node izipub.js --help
node izipub.js container 0x...
node izipub.js create-container --name "My Container"
```

4. Optional explicit env file:

```bash
node izipub.js create-container --name "My Container" --env-file ./.env.cli
```

5. Optional: pass write payload from JSON file:

```bash
node izipub.js publish-data-item --input-file ./payload.publish-data-item.json --private-key iotaprivkey...
```

`--input-file` works for all write commands.
CLI flags override JSON values if both are provided.
Accepted key styles in JSON:
- kebab-style flag names (for example `container-id`)
- camelCase (for example `containerId`)
- snake_case (for example `container_id`)
- optional fields can be omitted or set to `null`
- for array fields (`recipients`, `references`), `null` entries are ignored
- boolean flags can be set to `false` with `--no-<flag>` (for example `--no-event-create`)

Example payload file:

```json
{
  "containerId": "0x...",
  "dataTypeId": "0x...",
  "name": "Invoice #42",
  "description": "Monthly invoice",
  "content": "{\"total\":12345}",
  "externalIndex": 42,
  "recipients": ["0x...", "0x..."],
  "references": ["0x..."]
}
```

## JSON Payload Keys (Write Commands)

- `create-container`
  - `name` (required), `externalId`, `description`, `content`, `version`, `schemas`, `apis`, `resources`, `externalIndex`
  - booleans: `publicUpdate`, `publicAttach`, `publicCreateType`, `publicPublish`, `eventCreate`, `eventPublish`, `eventAttach`, `eventAdd`, `eventRemove`, `eventUpdate`
- `update-container`
  - `containerId` (required), `externalId`, `name`, `description`, `content`, `version`, `schemas`, `apis`, `resources`, `externalIndex`
- `create-data-type`
  - `containerId` (required), `name` (required), `externalId`, `description`, `content`, `version`, `schemas`, `apis`, `resources`, `externalIndex`
- `update-data-type`
  - `containerId` (required), `dataTypeId` (required), `externalId`, `name`, `description`, `content`, `version`, `schemas`, `apis`, `resources`, `externalIndex`
- `publish-data-item`
  - `containerId` (required), `dataTypeId` (required), `name` (required), `description` (required), `content` (required)
  - optional: `externalId`, `externalIndex`, `recipients` (addresses), `references` (object IDs), `reference` (alias)
- `publish-data-item-verification`
  - `containerId` (required), `dataItemId` (required), `name` (required), `description` (required), `content` (required)
  - optional: `externalId`, `externalIndex`, `recipients` (addresses), `references` (object IDs), `reference` (alias), `verified`
- `attach-child`
  - `parentId` (required), `childId` (required), `name` (required), `externalId`, `description`, `content`, `externalIndex`
- `update-child-link`
  - `linkId` (required), `parentId` (required), `childId` (required), `externalId`, `name`, `description`, `content`, `externalIndex`
- `add-owner`
  - `containerId` (required), `owner` (required), `role`
- `remove-owner`
  - `containerId` (required), `owner` (required)
- `recount-owners-active`
  - `containerId` (required)

## Main CLI

```bash
node izipub.js --help
```

Examples:

```bash
node izipub.js object 0xabc123
node izipub.js container 0xabc123
node izipub.js container-links 0xabc123 -n 20
node izipub.js container-types 0xabc123 -n 10 -s null
node izipub.js data-type-items 0xabc123 -n 10
node izipub.js data-item-verifications 0xabc123 -n 10
node izipub.js container-data-item-verifications 0xabc123 -n 50

node izipub.js create-container --name "My Container" --private-key iotaprivkey...
node izipub.js update-container --container-id 0x... --name "Updated" --private-key iotaprivkey...
node izipub.js create-data-type --container-id 0x... --name "Invoice" --private-key iotaprivkey...
node izipub.js update-data-type --container-id 0x... --data-type-id 0x... --name "Invoice v2" --private-key iotaprivkey...
node izipub.js publish-data-item --container-id 0x... --data-type-id 0x... --name "Item A" --description "..." --content "..." --private-key iotaprivkey...
node izipub.js publish-data-item-verification --container-id 0x... --data-item-id 0x... --name "Check A" --description "..." --content "..." --recipients 0x...,0x... --references 0x...,0x... --verified true --private-key iotaprivkey...
node izipub.js publish-data-item --input-file ./payload.publish-data-item.json --private-key iotaprivkey...
node izipub.js update-container --input-file ./payload.update-container.json --private-key iotaprivkey...
node izipub.js attach-child --parent-id 0x... --child-id 0x... --name "Link A" --private-key iotaprivkey...
node izipub.js update-child-link --link-id 0x... --parent-id 0x... --child-id 0x... --name "Link A v2" --private-key iotaprivkey...
node izipub.js add-owner --container-id 0x... --owner 0x... --role "editor" --private-key iotaprivkey...
node izipub.js remove-owner --container-id 0x... --owner 0x... --private-key iotaprivkey...
node izipub.js recount-owners-active --container-id 0x... --private-key iotaprivkey...
```

## Logging

Logs go to **stderr** so JSON output on **stdout** stays clean.

Use:

- `-v`, `--verbose` for debug logs
- `-q`, `--quiet` for errors only

## Write Command Requirements

- signer via `--private-key` / `IOTA_PRIVATE_KEY` (also `IZIPUB_PRIVATE_KEY`)
- or signer via `--mnemonic` / `IOTA_MNEMONIC` (optional `IOTA_DERIVATION_PATH`)
- write payload file via `--input-file <path>` (JSON object; CLI flags override file values)
- move config IDs from env:
  - preferred CLI names:
    - `PACKAGE_ID`, `MODULE`, `CLOCK_ID`
    - `CONTAINER_CHAIN_ID`, `DATA_ITEM_CHAIN`, `DATA_ITEM_VERIFICATION_CHAIN`, `UPDATE_CHAIN_ID`
  - also supported for app compatibility:
    - `VITE_PACKAGE_ID`, `VITE_MODULE`, `VITE_CLOCK_ID`
    - `VITE_CONTAINER_CHAIN_ID`, `VITE_DATA_ITEM_CHAIN`, `VITE_DATA_ITEM_VERIFICATION_CHAIN`, `VITE_UPDATE_CHAIN_ID`
- network can be set via `--network`, `IOTA_NETWORK`, `IZIPUB_NETWORK`, or `VITE_IOTA_NETWORK`
- optional `--env-file <path>` to load env values from a file like `.env.cli` or `.env.production`
- auto-load scan order includes these names in script/cwd/parent roots: `.env.cli`, `.env.cli.local`, `.env`, `.env.production`, `.env.local`

## IOTA Docs

- Getting started: https://docs.iota.org/developer/getting-started
- TypeScript SDK: https://docs.iota.org/developer/ts-sdk/typescript/
- Programmable transactions: https://docs.iota.org/developer/ts-sdk/typescript/transaction-building/basics
- IOTA RPC reference: https://docs.iota.org/developer/references/iota-api

## Shell Wrapper

```bash
./cli.sh object 0xabc123
./cli.sh create-container --name "My Container" --private-key iotaprivkey...
```
