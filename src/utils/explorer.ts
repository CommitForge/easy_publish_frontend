import {
  APP_INSTANCE_DOMAIN,
  IOTA_EXPLORER_NETWORK,
  IOTA_EXPLORER_OBJECT,
  IOTA_EXPLORER_TXBLOCK,
} from '../Config.ts';

export function buildObjectExplorerUrl(
  objectId: string,
  domain: string | undefined = APP_INSTANCE_DOMAIN
): string {
  const base = `${IOTA_EXPLORER_OBJECT}/${objectId}?network=${IOTA_EXPLORER_NETWORK}`;
  return domain ? `${base}&domain=${encodeURIComponent(domain)}` : base;
}

export function buildTxExplorerUrl(digest: string): string {
  return `${IOTA_EXPLORER_TXBLOCK}/${digest}?network=${IOTA_EXPLORER_NETWORK}`;
}
