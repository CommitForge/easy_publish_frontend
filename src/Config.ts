const env = import.meta.env as Record<string, string | undefined>;

function envFirst(...keys: string[]): string {
  for (const key of keys) {
    const value = env[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}

export const PACKAGE_ID = envFirst('VITE_PACKAGE_ID');
export const MODULE = envFirst('VITE_MODULE_ID', 'VITE_MODULE');
export const MODULE_ID = MODULE;
export const CLOCK_ID = envFirst('VITE_CLOCK_ID');
export const CONTAINER_CHAIN_ID = envFirst('VITE_CONTAINER_CHAIN_ID');
export const DATA_ITEM_CHAIN = envFirst(
  'VITE_DATA_ITEM_CHAIN_ID',
  'VITE_DATA_ITEM_CHAIN'
);
export const DATA_ITEM_CHAIN_ID = DATA_ITEM_CHAIN;
export const DATA_ITEM_VERIFICATION_CHAIN = envFirst(
  'VITE_DATA_ITEM_VERIFICATION_CHAIN_ID',
  'VITE_DATA_ITEM_VERIFICATION_CHAIN'
);
export const DATA_ITEM_VERIFICATION_CHAIN_ID = DATA_ITEM_VERIFICATION_CHAIN;
export const UPDATE_CHAIN_ID = envFirst('VITE_UPDATE_CHAIN_ID');

export const IOTA_EXPLORER_OBJECT =
  import.meta.env.VITE_IOTA_EXPLORER_OBJECT;
export const IOTA_EXPLORER_NETWORK =
  import.meta.env.VITE_IOTA_EXPLORER_NETWORK;
export const IOTA_EXPLORER_TXBLOCK =
  import.meta.env.VITE_IOTA_EXPLORER_TXBLOCK;
export const TRANSLATION_VERSION = envFirst('VITE_TRANSLATION_VERSION');
const smartReportMaxRecordsRaw = envFirst('VITE_SMART_REPORT_MAX_RECORDS');

function parsePositiveInt(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export const SMART_REPORT_MAX_RECORDS = parsePositiveInt(
  smartReportMaxRecordsRaw,
  1000
);

const AUTO_VALUE = 'auto';
const DEFAULT_FALLBACK_INSTANCE = 'generic';
const DEFAULT_API_PATH = '/izipublish';
const APP_MODE_STORAGE_KEY = 'easy_publish.ui_mode.v1';

export type AppMode = 'generic' | 'cars';

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/^www\./, '');
}

function withLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function withTrailingSlash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

function buildApiBase(origin: string, basePath: string): string {
  return `${origin}${withTrailingSlash(withLeadingSlash(basePath))}`;
}

function buildWsBase(protocol: string, host: string, basePath: string): string {
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${host}${withLeadingSlash(basePath)}`;
}

function envOrAuto(value: string | undefined, autoValue: string): string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.toLowerCase() === AUTO_VALUE) return autoValue;
  return trimmed;
}

function inferRuntimeInstance(host: string, primaryDomain?: string): string {
  const normalizedHost = normalizeHost(host);

  const normalizedPrimary = primaryDomain ? normalizeHost(primaryDomain) : '';
  if (normalizedPrimary) {
    if (normalizedHost === normalizedPrimary) return DEFAULT_FALLBACK_INSTANCE;
    if (normalizedHost.endsWith(`.${normalizedPrimary}`)) {
      const subdomainPart = normalizedHost.slice(
        0,
        normalizedHost.length - normalizedPrimary.length - 1
      );
      const labels = subdomainPart.split('.').filter(Boolean);
      return labels.length > 0
        ? labels[labels.length - 1]
        : DEFAULT_FALLBACK_INSTANCE;
    }
  }

  const labels = normalizedHost.split('.').filter(Boolean);
  return labels.length > 0 ? labels[0] : DEFAULT_FALLBACK_INSTANCE;
}

const runtimeHost =
  typeof window !== 'undefined'
    ? normalizeHost(window.location.hostname)
    : '';

const runtimeOrigin =
  typeof window !== 'undefined'
    ? window.location.origin
    : 'https://localhost';

const runtimeProtocol =
  typeof window !== 'undefined' ? window.location.protocol : 'https:';

const primaryDomain = import.meta.env.VITE_PRIMARY_DOMAIN;
const runtimeInstance = inferRuntimeInstance(runtimeHost, primaryDomain);
const runtimeDomain = runtimeHost || normalizeHost(primaryDomain ?? '');

export const APP_INSTANCE_NAME = envOrAuto(
  import.meta.env.VITE_APP_INSTANCE_NAME,
  runtimeInstance || DEFAULT_FALLBACK_INSTANCE
);

export const APP_INSTANCE_DOMAIN = envOrAuto(
  import.meta.env.VITE_APP_INSTANCE_DOMAIN,
  runtimeDomain || normalizeHost(primaryDomain ?? '')
);

const apiPath = envOrAuto(import.meta.env.VITE_API_BASE_PATH, DEFAULT_API_PATH);

export const API_BASE = withTrailingSlash(
  envOrAuto(import.meta.env.VITE_API_BASE, buildApiBase(runtimeOrigin, apiPath))
);

export const API_WS_BASE = envOrAuto(
  import.meta.env.VITE_API_WS_BASE,
  buildWsBase(runtimeProtocol, runtimeHost, apiPath)
);

type TranslationNode = {
  [key: string]: TranslationNode | string | number | boolean | null;
};

const SUPPORTED_APP_MODES: AppMode[] = ['generic', 'cars'];
const translationsByMode: Partial<Record<AppMode, TranslationNode>> = {};

function normalizeAppMode(value?: string | null): AppMode {
  const normalized = value?.trim().toLowerCase();
  return normalized === 'cars' ? 'cars' : 'generic';
}

function defaultAppModeFromBuild(): AppMode {
  return normalizeAppMode(APP_INSTANCE_NAME);
}

function readStoredAppMode(): AppMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(APP_MODE_STORAGE_KEY);
    if (!raw) return null;
    return normalizeAppMode(raw);
  } catch {
    return null;
  }
}

function writeStoredAppMode(mode: AppMode) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(APP_MODE_STORAGE_KEY, mode);
  } catch {
    // ignore storage failures
  }
}

let activeAppMode: AppMode = readStoredAppMode() ?? defaultAppModeFromBuild();

function getTranslationValueFromNode(
  node: TranslationNode | null | undefined,
  path: string
): unknown {
  if (!node) return undefined;
  return path
    .split('.')
    .reduce<unknown>((current, key) => {
      if (!current || typeof current !== 'object') return undefined;
      return (current as Record<string, unknown>)[key] as unknown;
    }, node);
}

function getTranslationValue(path: string): unknown {
  const activeNode = translationsByMode[activeAppMode];
  const activeValue = getTranslationValueFromNode(activeNode, path);
  if (activeValue !== undefined) return activeValue;

  const fallbackNode = translationsByMode.generic;
  const fallbackValue = getTranslationValueFromNode(fallbackNode, path);
  if (fallbackValue !== undefined) return fallbackValue;

  return undefined;
}

async function loadTranslationMode(mode: AppMode): Promise<void> {
  try {
    const query = TRANSLATION_VERSION
      ? `?v=${encodeURIComponent(TRANSLATION_VERSION)}`
      : '';
    const res = await fetch(`/config/${mode}.json${query}`, {
      cache: 'no-store',
    });
    if (!res.ok) return;
    translationsByMode[mode] = (await res.json()) as TranslationNode;
  } catch {
    // continue
  }
}

export function getActiveAppMode(): AppMode {
  return activeAppMode;
}

export function setActiveAppMode(mode: AppMode) {
  const normalized = normalizeAppMode(mode);
  activeAppMode = normalized;
  writeStoredAppMode(normalized);
}

export function getAvailableAppModes(): AppMode[] {
  return [...SUPPORTED_APP_MODES];
}

export async function loadTranslations(instance: string) {
  const preferredMode = normalizeAppMode(instance);
  const defaultMode = defaultAppModeFromBuild();
  const storedMode = readStoredAppMode();
  activeAppMode = storedMode ?? preferredMode ?? defaultMode;

  const prioritizedModes = Array.from(
    new Set<AppMode>([preferredMode, 'generic', 'cars'])
  );

  await Promise.all(prioritizedModes.map((mode) => loadTranslationMode(mode)));

  if (!translationsByMode[activeAppMode]) {
    activeAppMode = translationsByMode[preferredMode]
      ? preferredMode
      : translationsByMode.generic
      ? 'generic'
      : 'cars';
  }

  writeStoredAppMode(activeAppMode);
}

export function t(path: string): string {
  const value = getTranslationValue(path);
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return path;
  return String(value);
}

export function isCarsTranslation(): boolean {
  return getActiveAppMode() === 'cars';
}

export function getBrandLogoPath(): string {
  return isCarsTranslation()
    ? '/images/logo-cars.png'
    : '/images/logo-generic.png';
}
