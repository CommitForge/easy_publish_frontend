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

5. Preview production build locally:

```bash
npm run preview
```

## Environment Variables

The app reads these from `import.meta.env` (see `src/Config.ts`):

- `VITE_PACKAGE_ID`
- `VITE_MODULE`
- `VITE_CLOCK_ID`
- `VITE_CONTAINER_CHAIN_ID`
- `VITE_DATA_ITEM_CHAIN`
- `VITE_DATA_ITEM_VERIFICATION_CHAIN`
- `VITE_UPDATE_CHAIN_ID`
- `VITE_IOTA_EXPLORER_OBJECT`
- `VITE_IOTA_EXPLORER_NETWORK`
- `VITE_IOTA_EXPLORER_TXBLOCK`
- `VITE_APP_INSTANCE_NAME` (`generic` or `cars`)
- `VITE_APP_INSTANCE_DOMAIN`
- `VITE_API_BASE`
- `VITE_API_WS_BASE`

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
- `public/scripts`: Downloadable CLI package shown in the landing page carousel

## Cookies And Embedded Media

- The frontend stores cookie-consent UI state in `localStorage` (`cookie_consent`).
- The landing page YouTube embed is **not loaded by default**.
- Users must click the explicit "Load YouTube Video" button before the iframe is rendered.
- Clicking that button indicates consent to load YouTube content, which may set YouTube cookies.

## CLI Repositories

- CLI package repo: https://github.com/CommitForge/easy_publish_cli
- MoveVM contract repo: https://github.com/CommitForge/easy_publish_movevm

`public/scripts/README.md` contains full CLI usage and payload format details.

## Security Notes

- Do not put private keys or mnemonics into frontend env files.
- Keep signer secrets in secure local CLI env files (for example `.env.cli`) and never commit them.

## License

No license file is currently included in this repository.
