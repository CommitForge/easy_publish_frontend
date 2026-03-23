export const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID;
export const MODULE = import.meta.env.VITE_MODULE;
export const CLOCK_ID = import.meta.env.VITE_CLOCK_ID;
export const CONTAINER_CHAIN_ID = import.meta.env.VITE_CONTAINER_CHAIN_ID;
export const DATA_ITEM_CHAIN = import.meta.env.VITE_DATA_ITEM_CHAIN;
export const DATA_ITEM_VERIFICATION_CHAIN =
  import.meta.env.VITE_DATA_ITEM_VERIFICATION_CHAIN;
export const UPDATE_CHAIN_ID = import.meta.env.VITE_UPDATE_CHAIN_ID;

export const IOTA_EXPLORER_OBJECT =
  import.meta.env.VITE_IOTA_EXPLORER_OBJECT;
export const IOTA_EXPLORER_NETWORK =
  import.meta.env.VITE_IOTA_EXPLORER_NETWORK;
export const IOTA_EXPLORER_TXBLOCK =
  import.meta.env.VITE_IOTA_EXPLORER_TXBLOCK;

export const APP_INSTANCE_NAME = import.meta.env.VITE_APP_INSTANCE_NAME;
export const APP_INSTANCE_DOMAIN = import.meta.env.VITE_APP_INSTANCE_DOMAIN;
export const API_BASE = import.meta.env.VITE_API_BASE;
export const API_WS_BASE = import.meta.env.VITE_API_WS_BASE;

type TranslationNode = {
  [key: string]: TranslationNode | string | number | boolean | null;
};

let translations: TranslationNode | null = null;

function getTranslationValue(path: string): unknown {
  if (!translations) return undefined;

  return path
    .split('.')
    .reduce<unknown>((current, key) => {
      if (!current || typeof current !== 'object') return undefined;
      return (current as Record<string, unknown>)[key];
    }, translations);
}

export async function loadTranslations(domain: string) {
  const res = await fetch(`/config/${domain}.json`);
  translations = (await res.json()) as TranslationNode;
}

export function t(path: string): string {
  const value = getTranslationValue(path);
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return path;
  return String(value);
}

export function isCarsTranslation(): boolean {
  return t('translation') === 'cars' || t('container.singular') === 'Car';
}
