#!/usr/bin/env bash
# One-script server deploy for easy_publish frontend.
# Reads settings from a properties file, locates/unpacks the zip,
# then deploys to one or more target app directories.
#
# Usage:
#   ./deploy-server.sh [options] [zip_path]
#
# Options:
#   -h, --help
#   -c, --config <file>     Properties file path
#   -z, --zip <file>        Explicit zip path
#   -v, --version <value>   Select only dist-easy_publish_frontend-<value>.zip
#   -t, --targets <csv>     Override TARGETS from config
#       --dry-run           Print resolved values and exit

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CONFIG_FILE="${DEPLOY_CONFIG:-$SCRIPT_DIR/deploy-server.properties}"
ZIP_PATH=""
VERSION_FILTER="${ARTIFACT_VERSION:-}"
TARGETS_OVERRIDE=""
DRY_RUN=0
SHOW_HELP=0
POSITIONAL_ARGS=()

UNPACK_DIR=""
LOCK_FILES=()
BUILD_DIR=""
TARGETS_RAW=""
TARGETS_LIST=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      SHOW_HELP=1
      shift
      ;;
    -c|--config)
      [[ $# -ge 2 ]] || { echo "ERROR: --config requires a value." >&2; exit 1; }
      CONFIG_FILE="$2"
      shift 2
      ;;
    --config=*)
      CONFIG_FILE="${1#*=}"
      shift
      ;;
    -z|--zip)
      [[ $# -ge 2 ]] || { echo "ERROR: --zip requires a value." >&2; exit 1; }
      ZIP_PATH="$2"
      shift 2
      ;;
    --zip=*)
      ZIP_PATH="${1#*=}"
      shift
      ;;
    -v|--version)
      [[ $# -ge 2 ]] || { echo "ERROR: --version requires a value." >&2; exit 1; }
      VERSION_FILTER="$2"
      shift 2
      ;;
    --version=*)
      VERSION_FILTER="${1#*=}"
      shift
      ;;
    -t|--targets)
      [[ $# -ge 2 ]] || { echo "ERROR: --targets requires a value." >&2; exit 1; }
      TARGETS_OVERRIDE="$2"
      shift 2
      ;;
    --targets=*)
      TARGETS_OVERRIDE="${1#*=}"
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --)
      shift
      while [[ $# -gt 0 ]]; do
        POSITIONAL_ARGS+=("$1")
        shift
      done
      ;;
    -*)
      echo "ERROR: unknown option: $1" >&2
      exit 1
      ;;
    *)
      POSITIONAL_ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ -z "$ZIP_PATH" && ${#POSITIONAL_ARGS[@]} -gt 0 ]]; then
  ZIP_PATH="${POSITIONAL_ARGS[0]}"
fi

trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

is_true() {
  case "${1,,}" in
    1|true|yes|y|on) return 0 ;;
    *) return 1 ;;
  esac
}

mtime() {
  local path="$1"
  stat -c %Y "$path" 2>/dev/null || stat -f %m "$path" 2>/dev/null || echo 0
}

has_index() {
  local dir="$1"
  [[ -d "$dir" && -f "$dir/index.html" ]]
}

locate_cmd() {
  if command -v locate >/dev/null 2>&1; then
    command -v locate
  elif command -v mlocate >/dev/null 2>&1; then
    command -v mlocate
  else
    echo ""
  fi
}

zip_matches_filter() {
  local file_name="$1"
  if [[ -n "$VERSION_FILTER" ]]; then
    [[ "$file_name" == "${ARTIFACT_BASE}-${VERSION_FILTER}.zip" ]]
    return
  fi
  [[ "$file_name" == "${ARTIFACT_BASE}.zip" || "$file_name" == ${ARTIFACT_BASE}-*.zip ]]
}

dir_matches_filter() {
  local dir_name="$1"
  if [[ -n "$VERSION_FILTER" ]]; then
    [[ "$dir_name" == "${ARTIFACT_BASE}-${VERSION_FILTER}" ]]
    return
  fi
  [[ "$dir_name" == "$ARTIFACT_BASE" || "$dir_name" == ${ARTIFACT_BASE}-* ]]
}

pick_latest_file() {
  local best=""
  local best_mtime=-1
  local candidate ts

  for candidate in "$@"; do
    [[ -f "$candidate" ]] || continue
    ts="$(mtime "$candidate")"
    [[ "$ts" =~ ^[0-9]+$ ]] || continue
    if (( ts > best_mtime )); then
      best="$candidate"
      best_mtime="$ts"
    fi
  done

  [[ -n "$best" ]] && echo "$best"
}

pick_latest_dir() {
  local best=""
  local best_mtime=-1
  local candidate ts

  for candidate in "$@"; do
    has_index "$candidate" || continue
    ts="$(mtime "$candidate")"
    [[ "$ts" =~ ^[0-9]+$ ]] || continue
    if (( ts > best_mtime )); then
      best="$candidate"
      best_mtime="$ts"
    fi
  done

  [[ -n "$best" ]] && echo "$best"
}

cleanup() {
  local lock
  for lock in "${LOCK_FILES[@]}"; do
    [[ -n "$lock" ]] && rm -f "$lock"
  done

  if [[ -n "$UNPACK_DIR" && -d "$UNPACK_DIR" ]]; then
    if is_true "$KEEP_UNPACKED"; then
      echo "KEEP_UNPACKED=1, keeping $UNPACK_DIR"
    else
      rm -rf "$UNPACK_DIR"
    fi
  fi
}

load_config() {
  if [[ ! -f "$CONFIG_FILE" ]]; then
    [[ "$SHOW_HELP" -eq 1 ]] && return 0
    echo "ERROR: config file not found: $CONFIG_FILE" >&2
    exit 1
  fi

  set -a
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
  set +a

  ARTIFACT_BASE="${ARTIFACT_BASE:-dist-easy_publish_frontend}"
  WORK_DIR_BASE="${WORK_DIR_BASE:-/tmp/easy_publish_deploy}"
  KEEP_RELEASES="${KEEP_RELEASES:-5}"
  KEEP_UNPACKED="${KEEP_UNPACKED:-0}"
  TARGETS="${TARGETS:-/var/www/izipublish.com,/var/www/cars.izipublish.com}"
  OWNER_GROUP="${OWNER_GROUP:-www-data:www-data}"
  DIR_MODE="${DIR_MODE:-755}"
  FILE_MODE="${FILE_MODE:-644}"
  COPY_IMAGES="${COPY_IMAGES:-1}"
  COPY_HTACCESS="${COPY_HTACCESS:-1}"

  if [[ -n "$TARGETS_OVERRIDE" ]]; then
    TARGETS="$TARGETS_OVERRIDE"
  fi

  TARGETS_RAW="$TARGETS"
  TARGETS_LIST=()

  local raw_target trimmed_target
  IFS=',' read -r -a raw_targets <<< "$TARGETS_RAW"
  for raw_target in "${raw_targets[@]}"; do
    trimmed_target="$(trim "$raw_target")"
    [[ -n "$trimmed_target" ]] && TARGETS_LIST+=("$trimmed_target")
  done

  if [[ ${#TARGETS_LIST[@]} -eq 0 ]]; then
    echo "ERROR: TARGETS is empty in config/override." >&2
    exit 1
  fi
}

print_help() {
  echo "One-script server deploy."
  echo
  echo "Usage:"
  echo "  $(basename "$0") [options] [zip_path]"
  echo
  echo "Options:"
  echo "  -h, --help"
  echo "  -c, --config <file>"
  echo "  -z, --zip <file>"
  echo "  -v, --version <value>"
  echo "  -t, --targets <csv>"
  echo "      --dry-run"
  echo
  echo "Config file:"
  echo "  $CONFIG_FILE"
  echo
  echo "Example:"
  echo "  ./$(basename "$0")"
  echo "  ./$(basename "$0") --version 2026.04.03"
  echo "  ./$(basename "$0") --zip /var/www/dist-easy_publish_frontend.zip"
}

resolve_zip_path() {
  if [[ -n "$ZIP_PATH" ]]; then
    [[ -f "$ZIP_PATH" ]] || { echo "ERROR: zip not found: $ZIP_PATH" >&2; return 1; }
    echo "$ZIP_PATH"
    return 0
  fi

  local locate_bin
  locate_bin="$(locate_cmd)"

  local candidates=()
  local candidate

  if [[ -n "$locate_bin" ]]; then
    while IFS= read -r candidate; do
      [[ -f "$candidate" ]] || continue
      zip_matches_filter "$(basename "$candidate")" || continue
      candidates+=("$candidate")
    done < <("$locate_bin" "$ARTIFACT_BASE" 2>/dev/null)
  fi

  local roots=("$(pwd)" "/var/www" "/tmp")
  [[ -n "${HOME:-}" ]] && roots+=("$HOME")

  local root
  for root in "${roots[@]}"; do
    [[ -d "$root" ]] || continue
    while IFS= read -r candidate; do
      zip_matches_filter "$(basename "$candidate")" || continue
      candidates+=("$candidate")
    done < <(find "$root" -maxdepth 6 -type f \( -name "${ARTIFACT_BASE}.zip" -o -name "${ARTIFACT_BASE}-*.zip" \) 2>/dev/null)
  done

  local selected_zip
  selected_zip="$(pick_latest_file "${candidates[@]}" || true)"
  if [[ -z "$selected_zip" ]]; then
    echo "ERROR: no matching zip found." >&2
    echo "Expected ${ARTIFACT_BASE}.zip or ${ARTIFACT_BASE}-<version>.zip" >&2
    return 1
  fi

  echo "$selected_zip"
}

resolve_build_dir_from_unpack() {
  local unpack_dir="$1"
  local candidates=()
  local dir_name
  local candidate

  while IFS= read -r candidate; do
    dir_name="$(basename "$candidate")"
    dir_matches_filter "$dir_name" || continue
    has_index "$candidate" || continue
    candidates+=("$candidate")
  done < <(find "$unpack_dir" -mindepth 1 -maxdepth 6 -type d \( -name "$ARTIFACT_BASE" -o -name "${ARTIFACT_BASE}-*" \) 2>/dev/null)

  local selected_dir
  selected_dir="$(pick_latest_dir "${candidates[@]}" || true)"
  if [[ -n "$selected_dir" ]]; then
    echo "$selected_dir"
    return 0
  fi

  if [[ -z "$VERSION_FILTER" ]]; then
    if has_index "$unpack_dir/dist"; then
      echo "$unpack_dir/dist"
      return 0
    fi

    local legacy_dist
    legacy_dist="$(find "$unpack_dir" -mindepth 2 -maxdepth 6 -type d -name dist 2>/dev/null | head -n 1 || true)"
    if [[ -n "$legacy_dist" ]] && has_index "$legacy_dist"; then
      echo "$legacy_dist"
      return 0
    fi

    if has_index "$unpack_dir"; then
      echo "$unpack_dir"
      return 0
    fi
  fi

  echo "ERROR: no valid extracted build directory with index.html." >&2
  return 1
}

deploy_target() {
  local app_dir="$1"
  local releases_dir="$app_dir/releases"
  local current_link="$app_dir/current"
  local app_slug
  app_slug="$(basename "$app_dir" | tr -cs 'A-Za-z0-9._-' '_')"
  local lock_file="/tmp/deploy.${app_slug}.lock"

  if [[ -f "$lock_file" ]]; then
    echo "ERROR: deploy already running for $app_dir (lock: $lock_file)" >&2
    return 1
  fi

  touch "$lock_file"
  LOCK_FILES+=("$lock_file")

  local timestamp
  timestamp="$(date +"%Y%m%d_%H%M%S")"
  local new_release="$releases_dir/$timestamp"

  echo "----- Deploying to $app_dir -----"
  mkdir -p "$releases_dir" "$new_release"
  cp -a "$BUILD_DIR"/. "$new_release"/

  [[ -f "$new_release/index.html" ]] || {
    echo "ERROR: release missing index.html: $new_release" >&2
    return 1
  }

  if is_true "$COPY_IMAGES" && [[ -d "$app_dir/images" ]]; then
    cp -rp "$app_dir/images" "$new_release/"
  fi

  if is_true "$COPY_HTACCESS" && [[ -f "$app_dir/.htaccess" ]]; then
    cp -p "$app_dir/.htaccess" "$new_release/"
  fi

  if [[ -n "$OWNER_GROUP" ]]; then
    chown -R "$OWNER_GROUP" "$new_release"
  fi
  find "$new_release" -type d -exec chmod "$DIR_MODE" {} \;
  find "$new_release" -type f -exec chmod "$FILE_MODE" {} \;

  ln -sfn "$new_release" "$current_link"
  echo "Activated: $new_release"

  if [[ "$KEEP_RELEASES" =~ ^[0-9]+$ ]]; then
    ls -dt "$releases_dir"/* 2>/dev/null | tail -n "+$((KEEP_RELEASES + 1))" | xargs -r rm -rf
  fi
}

load_config

if [[ "$SHOW_HELP" -eq 1 ]]; then
  print_help
  exit 0
fi

trap cleanup EXIT

RESOLVED_ZIP="$(resolve_zip_path)"
mkdir -p "$WORK_DIR_BASE"
UNPACK_DIR="$(mktemp -d "$WORK_DIR_BASE/unpack.XXXXXX")"

echo "Using zip: $RESOLVED_ZIP"
echo "Extracting to: $UNPACK_DIR"
unzip -q -o "$RESOLVED_ZIP" -d "$UNPACK_DIR"

BUILD_DIR="$(resolve_build_dir_from_unpack "$UNPACK_DIR")"
echo "Resolved build dir: $BUILD_DIR"
echo "Targets: ${TARGETS_LIST[*]}"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry run complete. No deployment executed."
  exit 0
fi

for target in "${TARGETS_LIST[@]}"; do
  deploy_target "$target"
done

echo "===== Deploy successful for all targets ====="
