# easy_publish_frontend

React + TypeScript frontend for publishing and viewing MoveVM data on IOTA.

The app supports:
- Wallet connection and transaction submission (create/update/publish forms)
- Browsing containers, data types, data items, and verifications
- Instance-specific translations (`generic`, `cars`)
- Bundled CLI package display/download from the landing page (`public/scripts`)

## Stack

- Vite
- React 19
- TypeScript
- `@iota/dapp-kit` + `@iota/iota-sdk`
- Axios

## Prerequisites

- Node.js 18+
- npm 9+
- Running backend/API endpoint (`VITE_API_BASE`)
- IOTA wallet extension (for write transactions)

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Configure environment values in `.env` (local) and/or `.env.production` (production build).

3. Start development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

   Build and create a compressed deploy artifact (`dist-easy_publish_frontend.zip`):

```bash
npm run build:zip
```

   Create only the zip from an existing `dist/`:

```bash
npm run zip:dist
```

   Create a versioned artifact (optional):

```bash
ARTIFACT_VERSION=2026.04.03 npm run zip:dist
```

5. Preview production build locally:

```bash
npm run preview
```

## Environment Variables

The app reads these from `import.meta.env` (see `src/Config.ts`):

- `VITE_PACKAGE_ID`
- `VITE_MODULE_ID` (legacy alias: `VITE_MODULE`)
- `VITE_CLOCK_ID`
- `VITE_CONTAINER_CHAIN_ID`
- `VITE_DATA_ITEM_CHAIN_ID` (legacy alias: `VITE_DATA_ITEM_CHAIN`)
- `VITE_DATA_ITEM_VERIFICATION_CHAIN_ID` (legacy alias: `VITE_DATA_ITEM_VERIFICATION_CHAIN`)
- `VITE_UPDATE_CHAIN_ID`
- `VITE_IOTA_EXPLORER_OBJECT`
- `VITE_IOTA_EXPLORER_NETWORK`
- `VITE_IOTA_EXPLORER_TXBLOCK`
- `VITE_PRIMARY_DOMAIN` (optional, used for auto instance inference from subdomains)
- `VITE_APP_INSTANCE_NAME` (instance key, for example `generic`, `cars`, or custom)
- `VITE_APP_INSTANCE_DOMAIN`
- `VITE_API_BASE`
- `VITE_API_WS_BASE`
- `VITE_API_BASE_PATH` (optional when `VITE_API_BASE=auto`, default: `/izipublish`)

For a single multi-domain build, set these to `auto` (or leave them unset):
`VITE_APP_INSTANCE_NAME`, `VITE_APP_INSTANCE_DOMAIN`, `VITE_API_BASE`, `VITE_API_WS_BASE`.
Then configure `VITE_PRIMARY_DOMAIN` (and optionally `VITE_API_BASE_PATH`) so
runtime values are inferred by hostname.

## Instance Translation

Translation files are loaded from:

- `public/config/generic.json`
- `public/config/cars.json`

`VITE_APP_INSTANCE_NAME` controls which translation file is used at runtime.

## Project Structure

- `src/move/forms`: MoveVM transaction forms and shared transaction helpers
- `src/move/view`: Data listing/table rendering logic
- `src/utils`: Shared helpers (tree transforms, clipboard, explorer URLs, item loader config)
- `src/panels`: Introduction, scripts carousel, and main panel sections
- `src/layout`: Navbar, footer, cookie consent
- `docs`: Additional project documentation (schemas, conventions)
- `public/scripts`: Downloadable CLI package shown in the landing page carousel
- `public/images`: Runtime images and favicons copied into `dist/images` during build
- `images-dev`: Source/high-resolution/future images kept in git but intentionally not shipped in `dist`

## Cookies And Embedded Media

- The frontend stores cookie-consent UI state in `localStorage` (`cookie_consent`).
- The landing page YouTube embed is **not loaded by default**.
- Users must click the explicit "Load YouTube Video" button before the iframe is rendered.
- Clicking that button indicates consent to load YouTube content, which may set YouTube cookies.

## Repository Links

- easy_publish_movevm (Move): https://github.com/CommitForge/easy_publish_movevm
- easy_publish_cli (JavaScript): https://github.com/CommitForge/easy_publish_cli
- easy_publish_frontend (TypeScript): https://github.com/CommitForge/easy_publish_frontend
- easy_publish_backend (Java): https://github.com/CommitForge/easy_publish_backend
- easy_publish_deploy (Shell): https://github.com/CommitForge/easy_publish_deploy

`public/scripts/README.md` contains full CLI usage and payload format details.

CLI assets under `public/scripts` are synced from the CLI repo during build:

```bash
npm run sync:cli
```

The build script runs this automatically before bundling.

Optional sync overrides:

- `CLI_SOURCE_REPO` (default: `CommitForge/easy_publish_cli`)
- `CLI_SOURCE_REF` (default: `main`)
- `CLI_STRIP_VITE_COMPAT` (`true` by default; set to `false` to keep upstream VITE env compatibility text/aliases)

## Deploy Scripts

This repository includes one server deploy script and one properties file:

- `scripts/deploy-server.sh`
- `scripts/deploy-server.properties`

Use it after uploading zip to server:

```bash
./scripts/deploy-server.sh
./scripts/deploy-server.sh --version 2026.04.03
./scripts/deploy-server.sh --zip /var/www/dist-easy_publish_frontend.zip
```

`deploy-server.sh` reads targets and deploy settings from
`scripts/deploy-server.properties`.
It auto-detects artifacts by newest modification date when path is not provided.
Selected build must include `index.html`.

Detailed usage is in `scripts/README.md`.

## Easy Publish Content Schema

The `content.easy_publish` JSON structure used by the frontend is documented in:

- `docs/EASY_PUBLISH_CONTENT.md`

## Items API Guide (Beta)

Comprehensive `/api/items` usage (params, include modes, pagination behavior,
request samples, and response sample) is documented in:

- `docs/ITEMS_API.md`

## Analytics Dashboard API (Beta)

Read-only aggregated dashboard endpoint contract (`/api/analytics/dashboard`) is
documented in:

- `docs/ANALYTICS_API.md`

## Security Notes

- Do not put private keys or mnemonics into frontend env files.
- Keep signer secrets in secure local CLI env files (for example `.env.cli`) and never commit them.

## License

No license file is currently included in this repository.
