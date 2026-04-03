# Deploy Scripts

Server deploy is now intentionally simple:

- One script: `deploy-server.sh`
- One config file: `deploy-server.properties`

## Usage

```bash
./scripts/deploy-server.sh
./scripts/deploy-server.sh --version 2026.04.03
./scripts/deploy-server.sh --zip /var/www/dist-easy_publish_frontend.zip
./scripts/deploy-server.sh --dry-run
```

## Config

Edit:

```bash
scripts/deploy-server.properties
```

Main fields:

- `TARGETS` (comma-separated app dirs)
- `KEEP_RELEASES`
- `ARTIFACT_BASE`
- `WORK_DIR_BASE`
- `OWNER_GROUP`, `DIR_MODE`, `FILE_MODE`
- `COPY_IMAGES`, `COPY_HTACCESS`

## Notes

- The script auto-detects zip via `locate`/`mlocate`, fallback `find`.
- Selected build must contain `index.html`.
- Deploy creates release folders and updates `current` symlink per target.
