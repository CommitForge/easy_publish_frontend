import { isCarsTranslation } from '../../Config.ts';

export const OBJECT_ID_REGEX = /^0x[a-fA-F0-9]{64}$/;
export const FOLLOW_CONTAINERS_DRAFT_STORAGE_KEY =
  'easy_publish.follow_containers.draft.v1';
export const FOLLOW_CONTAINERS_PUBLISH_INTENT_STORAGE_KEY =
  'easy_publish.follow_containers.publish_intent.v1';

export type FollowContainerUpdateEntry = {
  container_id: string;
  enabled: boolean;
};

export function isValidObjectId(id: string): boolean {
  return OBJECT_ID_REGEX.test(id.trim());
}

export function hasMinLen(v: string, min: number): boolean {
  return v.trim().length >= min;
}

export function hasMaxLen(v: string, max: number): boolean {
  return v.trim().length <= max;
}

export function isNonEmpty(v: string): boolean {
  return v.trim().length > 0;
}

const CARS_CONTENT_JSON = JSON.stringify(
  {
    easy_publish: {
      publish: {
        targets: [
          {
            domain: 'cars.izipublish.com',
            base_url: 'https://cars.izipublish.com',
            enabled: true,
          },
        ],
      },
    },
  },
  null,
  2
);

export function isCarsInstance(): boolean {
  return isCarsTranslation();
}

export function getCarsContentJson(): string {
  return CARS_CONTENT_JSON;
}

export function defaultContent(isCars: boolean): string {
  return isCars ? CARS_CONTENT_JSON : '';
}

export function parseAddressList(value?: string): string[] {
  return (
    value
      ?.split(',')
      .map((v) => v.trim())
      .filter((v) => OBJECT_ID_REGEX.test(v)) ?? []
  );
}

function parseJsonObject(value: string): Record<string, any> {
  try {
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeFollowContainerEntries(
  entries: FollowContainerUpdateEntry[]
): FollowContainerUpdateEntry[] {
  const byContainerId = new Map<string, boolean>();
  entries.forEach((entry) => {
    if (!OBJECT_ID_REGEX.test(entry.container_id)) return;
    byContainerId.set(entry.container_id, !!entry.enabled);
  });

  return Array.from(byContainerId.entries()).map(([container_id, enabled]) => ({
    container_id,
    enabled,
  }));
}

function objectIdFromUnknown(input: unknown): string | null {
  if (typeof input === 'string') {
    const ids = parseAddressList(input);
    return ids[0] ?? null;
  }

  if (input && typeof input === 'object') {
    const raw = input as Record<string, unknown>;
    return (
      objectIdFromUnknown(raw.container_id) ??
      objectIdFromUnknown(raw.containerId) ??
      objectIdFromUnknown(raw.id) ??
      objectIdFromUnknown(raw.object_id) ??
      objectIdFromUnknown(raw.value)
    );
  }

  return null;
}

export function extractFollowContainersFromContent(
  content: string
): FollowContainerUpdateEntry[] {
  const obj = parseJsonObject(content);
  const easyPublish = obj?.easy_publish;
  if (!easyPublish || typeof easyPublish !== 'object') return [];

  const rawDirect =
    (easyPublish as Record<string, unknown>).follow_containers ??
    (easyPublish as Record<string, unknown>).followContainers;

  const rawFollowNamespace = (easyPublish as Record<string, unknown>).follow;
  const raw =
    rawDirect ??
    (rawFollowNamespace &&
    typeof rawFollowNamespace === 'object' &&
    !Array.isArray(rawFollowNamespace)
      ? ((rawFollowNamespace as Record<string, unknown>).containers ??
        (rawFollowNamespace as Record<string, unknown>).targets)
      : null);

  if (!Array.isArray(raw)) return [];

  const parsed = raw
    .map((entry): FollowContainerUpdateEntry | null => {
      if (typeof entry === 'string') {
        const containerId = objectIdFromUnknown(entry);
        if (!containerId) return null;
        return { container_id: containerId, enabled: true };
      }

      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return null;
      }

      const mapEntry = entry as Record<string, unknown>;
      const containerId = objectIdFromUnknown(mapEntry);
      if (!containerId) return null;

      let enabled = true;
      if (typeof mapEntry.enabled === 'boolean') enabled = mapEntry.enabled;
      if (typeof mapEntry.active === 'boolean') enabled = mapEntry.active;

      return { container_id: containerId, enabled };
    })
    .filter((entry): entry is FollowContainerUpdateEntry => entry !== null);

  return normalizeFollowContainerEntries(parsed);
}

export function mergeContentWithFollowContainers(
  content: string,
  entries: FollowContainerUpdateEntry[]
): string {
  const obj = parseJsonObject(content);
  const normalizedEntries = normalizeFollowContainerEntries(entries);

  if (!obj.easy_publish || typeof obj.easy_publish !== 'object') {
    obj.easy_publish = {};
  }

  if (normalizedEntries.length > 0) {
    obj.easy_publish.follow_containers = normalizedEntries;
  } else {
    delete obj.easy_publish.follow_containers;
  }

  delete obj.easy_publish.followContainers;
  delete obj.easy_publish.revisions;

  return JSON.stringify(obj, null, 2);
}

export function buildFollowContainersTemplate(
  entries: FollowContainerUpdateEntry[] = []
): string {
  return mergeContentWithFollowContainers('{}', entries);
}

function revisionIdsFromUnknown(input: unknown): string[] {
  if (typeof input === 'string') return parseAddressList(input);
  if (Array.isArray(input)) {
    return Array.from(
      new Set(
        input.flatMap((entry) =>
          typeof entry === 'string'
            ? parseAddressList(entry)
            : revisionIdsFromUnknown(entry)
        )
      )
    );
  }
  if (input && typeof input === 'object') {
    const raw = input as Record<string, unknown>;
    return Array.from(
      new Set(
        [
          raw.replaces,
          raw.replaced,
          raw.previous,
          raw.previousIds,
          raw.previous_ids,
          raw.previousDataItemIds,
          raw.previous_data_item_ids,
          raw.of,
          raw.items,
          raw.references,
        ].flatMap((entry) => revisionIdsFromUnknown(entry))
      )
    );
  }
  return [];
}

export function extractRevisionIdsFromContent(content: string): string[] {
  const obj = parseJsonObject(content);
  const revisions = obj?.easy_publish?.revisions;
  if (revisions == null) return [];

  if (typeof revisions === 'boolean') {
    return [];
  }

  if (typeof revisions === 'string' || Array.isArray(revisions)) {
    return revisionIdsFromUnknown(revisions);
  }

  if (typeof revisions === 'object') {
    const raw = revisions as Record<string, unknown>;
    const enabled =
      typeof raw.enabled === 'boolean' ? raw.enabled : false;
    if (!enabled) return [];
    return revisionIdsFromUnknown(revisions);
  }

  return [];
}

export function extractRevisionChangeFromContent(content: string): string {
  const obj = parseJsonObject(content);
  const revisions = obj?.easy_publish?.revisions;

  if (!revisions || typeof revisions !== 'object' || Array.isArray(revisions)) {
    return '';
  }

  const raw = revisions as Record<string, unknown>;
  const enabled = typeof raw.enabled === 'boolean' ? raw.enabled : false;
  if (!enabled) return '';

  const candidates = [
    raw.change,
    raw.changeDescription,
    raw.change_description,
    raw.note,
  ];

  const change = candidates.find((value) => typeof value === 'string');
  return typeof change === 'string' ? change : '';
}

export function mergeContentWithRevisions(
  content: string,
  previousDataItemIds: string[],
  changeDescription?: string
): string {
  const uniqueIds = Array.from(new Set(previousDataItemIds.filter(Boolean)));
  const obj = parseJsonObject(content);

  if (!obj.easy_publish || typeof obj.easy_publish !== 'object') {
    obj.easy_publish = {};
  }

  if (uniqueIds.length > 0) {
    const revisionsPayload: Record<string, unknown> = {
      enabled: true,
      replaces: uniqueIds,
    };
    const trimmedChange = changeDescription?.trim();
    if (trimmedChange) {
      revisionsPayload.change = trimmedChange;
    }
    obj.easy_publish.revisions = revisionsPayload;
  } else {
    delete obj.easy_publish.revisions;
  }

  return JSON.stringify(obj, null, 2);
}
