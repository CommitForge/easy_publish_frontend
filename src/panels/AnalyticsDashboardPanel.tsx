import { useEffect, useMemo, useState } from 'react';
import { API_BASE, t } from '../Config.ts';

type AnalyticsGranularity = 'day' | 'month' | 'year';
type TrendMetric = 'containers' | 'dataTypes' | 'dataItems' | 'verifications' | 'activeAddresses';
type DrilldownDimension = 'container' | 'dataType' | 'address';

type ScopeMode = 'visible' | 'selectedContainer';

type DrilldownSelection = {
  dimension: DrilldownDimension;
  key: string;
  label: string;
};

type AnalyticsTotals = {
  containers?: number;
  dataTypes?: number;
  dataItems?: number;
  verifications?: number;
  activeAddresses?: number;
  followedContainers?: number;
};

type AnalyticsTimeBucket = {
  bucket?: string;
  label?: string;
  containers?: number;
  dataTypes?: number;
  dataItems?: number;
  verifications?: number;
  activeAddresses?: number;
};

type AnalyticsTopDataType = {
  dataTypeId?: string;
  dataTypeName?: string;
  containerId?: string;
  containerName?: string;
  dataItems?: number;
  verifications?: number;
};

type AnalyticsTopContainer = {
  containerId?: string;
  containerName?: string;
  dataTypes?: number;
  dataItems?: number;
  verifications?: number;
};

type AnalyticsTopAddress = {
  address?: string;
  count?: number;
  dataItems?: number;
  verifications?: number;
};

type AnalyticsTopAddresses = {
  dataItems?: AnalyticsTopAddress[];
  verifications?: AnalyticsTopAddress[];
};

type AnalyticsDrilldown = {
  dimension?: string;
  key?: string;
  label?: string;
  totals?: AnalyticsTotals;
  timeSeries?: AnalyticsTimeBucket[];
};

type AnalyticsGraphNodeRaw = {
  id?: string;
  label?: string;
  level?: number;
  kind?: string;
};

type AnalyticsGraphEdgeRaw = {
  from?: string;
  to?: string;
  relation?: string;
};

type AnalyticsLatestPublishedGraph = {
  limit?: number;
  windowDataItems?: number;
  totalScopedDataItems?: number;
  nodes?: AnalyticsGraphNodeRaw[];
  edges?: AnalyticsGraphEdgeRaw[];
  summary?: {
    containers?: number;
    dataTypes?: number;
    dataItems?: number;
    verifications?: number;
  };
  info?: string;
};

type AnalyticsDashboardResponse = {
  meta?: {
    generatedAt?: string;
    timezone?: string;
    from?: string;
    to?: string;
    granularity?: string;
  };
  totals?: AnalyticsTotals;
  timeSeries?: AnalyticsTimeBucket[];
  topDataTypes?: AnalyticsTopDataType[];
  topContainers?: AnalyticsTopContainer[];
  topAddresses?: AnalyticsTopAddresses;
  drilldown?: AnalyticsDrilldown;
  latestPublishedGraph?: AnalyticsLatestPublishedGraph;
};

type AnalyticsGraphNode = {
  id: string;
  label: string;
  level: number;
  kind: string;
};

type AnalyticsGraphEdge = {
  from: string;
  to: string;
  relation: string;
};

type AnalyticsGraphLayout = {
  width: number;
  height: number;
  levels: number[];
  positions: Record<string, { x: number; y: number }>;
};

type VerificationReadinessBreakdown = {
  totalDataItems: number;
  noRecipients: number;
  recipientsNoVerifications: number;
  recipientsFailedVerifications: number;
  recipientsSuccessfulVerifications: number;
};

type AnalyticsDashboardPanelProps = {
  accountAddress: string;
  selectedContainerId?: string | null;
  selectedDataTypeId?: string | null;
};

const TOP_N_MIN = 1;
const TOP_N_MAX = 200;
const DEFAULT_TOP_N = 8;
const VERIFICATION_BREAKDOWN_PAGE_SIZE = 200;
const VERIFICATION_BREAKDOWN_MAX_PAGES = 40;
const QUICK_RANGES = ['30d', '90d', '365d', 'all'] as const;
type QuickRange = (typeof QUICK_RANGES)[number];

const TREND_METRIC_LABEL: Record<TrendMetric, string> = {
  containers: 'Containers',
  dataTypes: 'Types',
  dataItems: 'Items',
  verifications: 'Verifications',
  activeAddresses: 'Active Addresses',
};

function toIsoDateInput(value: Date): string {
  const normalized = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return normalized.toISOString().slice(0, 10);
}

function todayIsoDateInput(): string {
  return toIsoDateInput(new Date());
}

function daysAgoIsoDateInput(daysAgo: number): string {
  const base = new Date();
  base.setDate(base.getDate() - daysAgo);
  return toIsoDateInput(base);
}

function toSafeArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function toSafeNumber(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return value;
}

function formatCount(value: number | undefined): string {
  return new Intl.NumberFormat().format(toSafeNumber(value));
}

function shortenId(value: string): string {
  if (value.length <= 20) return value;
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function describeHttpError(status: number): string {
  if (status === 404) {
    return 'Analytics endpoint not found. Backend should expose GET /api/analytics/dashboard.';
  }

  if (status >= 500) {
    return `Analytics backend error (HTTP ${status}).`;
  }

  return `Failed to load analytics (HTTP ${status}).`;
}

function getBucketMetricValue(bucket: AnalyticsTimeBucket, metric: TrendMetric): number {
  switch (metric) {
    case 'containers':
      return toSafeNumber(bucket.containers);
    case 'dataTypes':
      return toSafeNumber(bucket.dataTypes);
    case 'dataItems':
      return toSafeNumber(bucket.dataItems);
    case 'verifications':
      return toSafeNumber(bucket.verifications);
    case 'activeAddresses':
      return toSafeNumber(bucket.activeAddresses);
    default:
      return 0;
  }
}

function normalizeGraphNodeId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeLatestPublishedGraph(graphRaw: AnalyticsLatestPublishedGraph | undefined): {
  limit: number;
  windowDataItems: number;
  totalScopedDataItems: number;
  summary: {
    containers: number;
    dataTypes: number;
    dataItems: number;
    verifications: number;
  };
  info?: string;
  nodes: AnalyticsGraphNode[];
  edges: AnalyticsGraphEdge[];
} {
  const nodesById = new Map<string, AnalyticsGraphNode>();

  toSafeArray(graphRaw?.nodes).forEach((rawNode) => {
    const id = normalizeGraphNodeId(rawNode.id);
    if (!id) return;
    const key = id.toLowerCase();
    const level =
      typeof rawNode.level === 'number' && Number.isFinite(rawNode.level)
        ? Math.max(0, Math.min(8, Math.round(rawNode.level)))
        : 0;
    const label = typeof rawNode.label === 'string' && rawNode.label.trim() ? rawNode.label.trim() : id;
    const kind = typeof rawNode.kind === 'string' && rawNode.kind.trim() ? rawNode.kind.trim() : 'node';
    if (!nodesById.has(key)) {
      nodesById.set(key, { id, label, level, kind });
    }
  });

  const edgesByKey = new Map<string, AnalyticsGraphEdge>();
  toSafeArray(graphRaw?.edges).forEach((rawEdge) => {
    const from = normalizeGraphNodeId(rawEdge.from);
    const to = normalizeGraphNodeId(rawEdge.to);
    if (!from || !to) return;

    if (!nodesById.has(from.toLowerCase()) || !nodesById.has(to.toLowerCase())) {
      return;
    }

    const relation =
      typeof rawEdge.relation === 'string' && rawEdge.relation.trim()
        ? rawEdge.relation.trim()
        : 'connected';
    const key = `${from.toLowerCase()}->${to.toLowerCase()}:${relation}`;
    if (!edgesByKey.has(key)) {
      edgesByKey.set(key, { from, to, relation });
    }
  });

  return {
    limit: toSafeNumber(graphRaw?.limit),
    windowDataItems: toSafeNumber(graphRaw?.windowDataItems),
    totalScopedDataItems: toSafeNumber(graphRaw?.totalScopedDataItems),
    summary: {
      containers: toSafeNumber(graphRaw?.summary?.containers),
      dataTypes: toSafeNumber(graphRaw?.summary?.dataTypes),
      dataItems: toSafeNumber(graphRaw?.summary?.dataItems),
      verifications: toSafeNumber(graphRaw?.summary?.verifications),
    },
    info:
      typeof graphRaw?.info === 'string' && graphRaw.info.trim() ? graphRaw.info.trim() : undefined,
    nodes: Array.from(nodesById.values()),
    edges: Array.from(edgesByKey.values()),
  };
}

function buildAnalyticsGraphLayout(nodes: AnalyticsGraphNode[]): AnalyticsGraphLayout {
  const byLevel: Record<number, AnalyticsGraphNode[]> = {};
  nodes.forEach((node) => {
    const level = Math.max(0, node.level);
    if (!byLevel[level]) {
      byLevel[level] = [];
    }
    byLevel[level].push(node);
  });

  const levels = Object.keys(byLevel)
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry))
    .sort((a, b) => a - b);

  const maxRows = levels.reduce((maxRowsValue, level) => {
    const count = byLevel[level]?.length ?? 0;
    return Math.max(maxRowsValue, count);
  }, 1);

  const width = Math.max(760, levels.length * 240 + 120);
  const height = Math.max(320, maxRows * 92 + 96);
  const positions: Record<string, { x: number; y: number }> = {};

  levels.forEach((level) => {
    const levelNodes = byLevel[level] ?? [];
    const levelX = 64 + level * 240;
    const rowSpacing =
      levelNodes.length <= 1
        ? 0
        : Math.max(72, (height - 120) / Math.max(1, levelNodes.length - 1));

    levelNodes.forEach((node, index) => {
      const position = {
        x: levelX,
        y: levelNodes.length <= 1 ? height / 2 : 60 + index * rowSpacing,
      };
      positions[node.id] = position;
      positions[node.id.toLowerCase()] = position;
    });
  });

  return { width, height, levels, positions };
}

function truncateGraphLabel(value: string): string {
  if (value.length <= 22) return value;
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function graphLevelLabel(level: number): string {
  switch (level) {
    case 0:
      return 'Containers';
    case 1:
      return 'Types';
    case 2:
      return 'Items';
    case 3:
      return 'Verifications';
    default:
      return `Level ${level}`;
  }
}

function toTimestampMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 1e17) return Math.round(value / 1e6);
    if (value > 1e14) return Math.round(value / 1e3);
    if (value < 1e12 && value > 0) return Math.round(value * 1000);
    return Math.round(value);
  }

  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return toTimestampMs(Number(trimmed));
  }

  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function dateInputToBoundaryMs(dateInput: string, endOfDay: boolean): number | null {
  if (!dateInput) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return endOfDay
    ? new Date(year, month, day, 23, 59, 59, 999).getTime()
    : new Date(year, month, day, 0, 0, 0, 0).getTime();
}

function toBooleanLike(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return null;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function collectAddressLikeStrings(value: unknown): string[] {
  if (value == null) return [];

  if (Array.isArray(value)) {
    return uniqueStrings(value.flatMap((entry) => collectAddressLikeStrings(entry)));
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return uniqueStrings(
      [
        obj.address,
        obj.value,
        obj.recipient,
        obj.recipients,
        obj.recipientAddress,
        obj.recipientAddresses,
        obj.recipient_address,
        obj.recipient_addresses,
      ].flatMap((entry) => collectAddressLikeStrings(entry))
    );
  }

  return [];
}

function extractRecipients(dataItemRaw: Record<string, unknown>, wrapperRaw: Record<string, unknown>): string[] {
  return uniqueStrings(
    [
      dataItemRaw.recipients,
      dataItemRaw.recipient,
      dataItemRaw.recipientAddress,
      dataItemRaw.recipientAddresses,
      dataItemRaw.recipient_address,
      dataItemRaw.recipient_addresses,
      wrapperRaw.recipients,
      wrapperRaw.recipient,
      wrapperRaw.recipientAddress,
      wrapperRaw.recipientAddresses,
      wrapperRaw.recipient_address,
      wrapperRaw.recipient_addresses,
    ].flatMap((entry) => collectAddressLikeStrings(entry))
  );
}

function extractVerificationNodes(wrapperRaw: Record<string, unknown>): Record<string, unknown>[] {
  const candidates = [
    wrapperRaw.dataItemVerifications,
    wrapperRaw.verifications,
    wrapperRaw.data_item_verifications,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
        .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object');
    }
  }

  return [];
}

function verificationIsSuccessful(rawNode: Record<string, unknown>): boolean {
  const node =
    (rawNode.dataItemVerification as Record<string, unknown> | undefined) ??
    (rawNode.verification as Record<string, unknown> | undefined) ??
    rawNode;

  const explicit =
    toBooleanLike(node.verified) ??
    toBooleanLike(node.success) ??
    toBooleanLike(node.isVerified);
  if (explicit != null) return explicit;

  if (typeof node.status === 'string') {
    const status = node.status.trim().toLowerCase();
    if (['verified', 'success', 'succeeded', 'passed', 'ok'].includes(status)) return true;
    if (['failed', 'error', 'rejected', 'invalid'].includes(status)) return false;
  }

  return false;
}

function resolveDataItemCreatedMs(
  dataItemRaw: Record<string, unknown>,
  wrapperRaw: Record<string, unknown>
): number | null {
  const candidates = [
    dataItemRaw.createdOnChain,
    dataItemRaw.created_on_chain,
    dataItemRaw.createdOnChainMs,
    dataItemRaw.created_on_chain_ms,
    dataItemRaw.createdAt,
    dataItemRaw.created_at,
    dataItemRaw.createdTimestamp,
    dataItemRaw.created_timestamp,
    dataItemRaw.timestamp,
    wrapperRaw.createdOnChain,
    wrapperRaw.created_on_chain,
    wrapperRaw.createdOnChainMs,
    wrapperRaw.created_on_chain_ms,
    wrapperRaw.createdAt,
    wrapperRaw.created_at,
    wrapperRaw.createdTimestamp,
    wrapperRaw.created_timestamp,
    wrapperRaw.timestamp,
  ];

  for (const candidate of candidates) {
    const parsed = toTimestampMs(candidate);
    if (parsed != null) return parsed;
  }

  return null;
}

function isWithinDateRange(timestampMs: number | null, fromMs: number | null, toMs: number | null): boolean {
  if (timestampMs == null) return true;
  if (fromMs != null && timestampMs < fromMs) return false;
  if (toMs != null && timestampMs > toMs) return false;
  return true;
}

function createEmptyVerificationReadinessBreakdown(): VerificationReadinessBreakdown {
  return {
    totalDataItems: 0,
    noRecipients: 0,
    recipientsNoVerifications: 0,
    recipientsFailedVerifications: 0,
    recipientsSuccessfulVerifications: 0,
  };
}

export function AnalyticsDashboardPanel({
  accountAddress,
  selectedContainerId,
  selectedDataTypeId,
}: AnalyticsDashboardPanelProps) {
  const [granularity, setGranularity] = useState<AnalyticsGranularity>('month');
  const [fromDate, setFromDate] = useState<string>(() => daysAgoIsoDateInput(89));
  const [toDate, setToDate] = useState<string>(() => todayIsoDateInput());
  const [topN, setTopN] = useState<number>(DEFAULT_TOP_N);
  const [scopeMode, setScopeMode] = useState<ScopeMode>('visible');
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('dataItems');
  const [drilldown, setDrilldown] = useState<DrilldownSelection | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [data, setData] = useState<AnalyticsDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationReadiness, setVerificationReadiness] =
    useState<VerificationReadinessBreakdown>(createEmptyVerificationReadinessBreakdown);
  const [verificationReadinessLoading, setVerificationReadinessLoading] =
    useState(false);
  const [verificationReadinessError, setVerificationReadinessError] =
    useState<string | null>(null);

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    []
  );

  useEffect(() => {
    if (scopeMode === 'selectedContainer' && !selectedContainerId) {
      setScopeMode('visible');
    }
  }, [scopeMode, selectedContainerId]);

  useEffect(() => {
    let cancelled = false;

    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          userAddress: accountAddress,
          granularity,
          timezone,
          topN: String(Math.min(Math.max(topN, TOP_N_MIN), TOP_N_MAX)),
        });

        if (fromDate) params.set('from', fromDate);
        if (toDate) params.set('to', toDate);

        if (scopeMode === 'selectedContainer' && selectedContainerId) {
          params.set('containerId', selectedContainerId);
          if (selectedDataTypeId) {
            params.set('dataTypeId', selectedDataTypeId);
          }
        }

        if (drilldown) {
          params.set('drilldownDimension', drilldown.dimension);
          params.set('drilldownKey', drilldown.key);
        }

        const response = await fetch(`${API_BASE}api/analytics/dashboard?${params.toString()}`);
        if (!response.ok) {
          throw new Error(describeHttpError(response.status));
        }

        const payload = (await response.json()) as AnalyticsDashboardResponse;
        if (cancelled) return;

        setData(payload);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load analytics.';
        setError(message);
        setData(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [
    accountAddress,
    granularity,
    fromDate,
    toDate,
    topN,
    scopeMode,
    selectedContainerId,
    selectedDataTypeId,
    drilldown,
    timezone,
    refreshKey,
  ]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadVerificationReadiness = async () => {
      setVerificationReadinessLoading(true);
      setVerificationReadinessError(null);

      try {
        let page = 0;
        let hasNext = true;
        let processedPages = 0;
        const fromMs = dateInputToBoundaryMs(fromDate, false);
        const toMs = dateInputToBoundaryMs(toDate, true);
        const nextBreakdown = createEmptyVerificationReadinessBreakdown();

        while (hasNext && processedPages < VERIFICATION_BREAKDOWN_MAX_PAGES) {
          const params = new URLSearchParams({
            userAddress: accountAddress,
            include: 'CONTAINER,DATA_TYPE,DATA_ITEM,DATA_ITEM_VERIFICATION',
            page: String(page),
            pageSize: String(VERIFICATION_BREAKDOWN_PAGE_SIZE),
          });

          if (scopeMode === 'selectedContainer' && selectedContainerId) {
            params.set('containerId', selectedContainerId);
            if (selectedDataTypeId) {
              params.set('dataTypeId', selectedDataTypeId);
            }
          }

          const response = await fetch(`${API_BASE}api/items?${params.toString()}`, {
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`Failed to load verification readiness (HTTP ${response.status}).`);
          }

          const payload = (await response.json()) as Record<string, unknown>;
          const containers = Array.isArray(payload.containers) ? payload.containers : [];

          containers.forEach((containerNode) => {
            if (!containerNode || typeof containerNode !== 'object') return;
            const dataTypes = Array.isArray((containerNode as Record<string, unknown>).dataTypes)
              ? ((containerNode as Record<string, unknown>).dataTypes as unknown[])
              : [];

            dataTypes.forEach((dataTypeNode) => {
              if (!dataTypeNode || typeof dataTypeNode !== 'object') return;
              const dataItems = Array.isArray((dataTypeNode as Record<string, unknown>).dataItems)
                ? ((dataTypeNode as Record<string, unknown>).dataItems as unknown[])
                : [];

              dataItems.forEach((dataItemWrapper) => {
                if (!dataItemWrapper || typeof dataItemWrapper !== 'object') return;
                const wrapperRaw = dataItemWrapper as Record<string, unknown>;
                const dataItemRaw = (wrapperRaw.dataItem as Record<string, unknown> | undefined) ?? wrapperRaw;

                const createdMs = resolveDataItemCreatedMs(dataItemRaw, wrapperRaw);
                if (!isWithinDateRange(createdMs, fromMs, toMs)) return;

                nextBreakdown.totalDataItems += 1;
                const recipients = extractRecipients(dataItemRaw, wrapperRaw);
                const hasRecipients = recipients.length > 0;

                if (!hasRecipients) {
                  nextBreakdown.noRecipients += 1;
                  return;
                }

                const verifications = extractVerificationNodes(wrapperRaw);
                if (verifications.length === 0) {
                  nextBreakdown.recipientsNoVerifications += 1;
                  return;
                }

                const hasSuccessfulVerification = verifications.some(verificationIsSuccessful);
                if (hasSuccessfulVerification) {
                  nextBreakdown.recipientsSuccessfulVerifications += 1;
                } else {
                  nextBreakdown.recipientsFailedVerifications += 1;
                }
              });
            });
          });

          const meta = (payload.meta as Record<string, unknown> | undefined) ?? {};
          hasNext = meta.hasNext === true;
          page += 1;
          processedPages += 1;
        }

        if (cancelled) return;
        setVerificationReadiness(nextBreakdown);

        if (hasNext) {
          setVerificationReadinessError(
            `Verification readiness limited to first ${
              VERIFICATION_BREAKDOWN_MAX_PAGES * VERIFICATION_BREAKDOWN_PAGE_SIZE
            } items.`
          );
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to load verification readiness.';
        setVerificationReadinessError(message);
        setVerificationReadiness(createEmptyVerificationReadinessBreakdown());
      } finally {
        if (!cancelled) {
          setVerificationReadinessLoading(false);
        }
      }
    };

    void loadVerificationReadiness();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    accountAddress,
    fromDate,
    toDate,
    scopeMode,
    selectedContainerId,
    selectedDataTypeId,
    refreshKey,
  ]);

  const totals = data?.totals;
  const timeSeries = toSafeArray(data?.timeSeries);
  const topDataTypes = toSafeArray(data?.topDataTypes);
  const topContainers = toSafeArray(data?.topContainers);
  const topAddressItems = toSafeArray(data?.topAddresses?.dataItems);
  const topAddressVerifications = toSafeArray(data?.topAddresses?.verifications);
  const drilldownSeries = toSafeArray(data?.drilldown?.timeSeries);
  const drilldownTotals = data?.drilldown?.totals;
  const latestPublishedGraph = useMemo(
    () => normalizeLatestPublishedGraph(data?.latestPublishedGraph),
    [data?.latestPublishedGraph]
  );
  const latestPublishedGraphLayout = useMemo(
    () => buildAnalyticsGraphLayout(latestPublishedGraph.nodes),
    [latestPublishedGraph.nodes]
  );

  const maxTrendValue = useMemo(() => {
    if (timeSeries.length === 0) return 0;

    return timeSeries.reduce((maxValue, bucket) => {
      const value = getBucketMetricValue(bucket, trendMetric);
      return value > maxValue ? value : maxValue;
    }, 0);
  }, [timeSeries, trendMetric]);

  const verificationRate = useMemo(() => {
    const itemCount = toSafeNumber(totals?.dataItems);
    if (itemCount <= 0) return null;

    return ((toSafeNumber(totals?.verifications) / itemCount) * 100).toFixed(1);
  }, [totals?.dataItems, totals?.verifications]);

  const topPoster = topAddressItems[0]?.address;
  const topVerifier = topAddressVerifications[0]?.address;
  const verifiableItemsTotal =
    verificationReadiness.recipientsNoVerifications +
    verificationReadiness.recipientsFailedVerifications +
    verificationReadiness.recipientsSuccessfulVerifications;

  const applyQuickRange = (range: QuickRange) => {
    if (range === 'all') {
      setFromDate('');
      setToDate('');
      return;
    }

    if (range === '30d') {
      setFromDate(daysAgoIsoDateInput(29));
      setToDate(todayIsoDateInput());
      return;
    }

    if (range === '90d') {
      setFromDate(daysAgoIsoDateInput(89));
      setToDate(todayIsoDateInput());
      return;
    }

    setFromDate(daysAgoIsoDateInput(364));
    setToDate(todayIsoDateInput());
  };

  const hasSelectedContainer = Boolean(selectedContainerId);

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <h2>Dashboard</h2>
        <div className="analytics-muted">
          Read-only indexer analytics for visible containers (owned + followed).
        </div>
      </div>

      <div className="analytics-toolbar">
        <label className="analytics-control">
          <span>View</span>
          <select
            value={granularity}
            onChange={(event) => setGranularity(event.target.value as AnalyticsGranularity)}
          >
            <option value="day">Day</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </label>

        <label className="analytics-control">
          <span>From</span>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </label>

        <label className="analytics-control">
          <span>To</span>
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </label>

        <label className="analytics-control analytics-control--small">
          <span>Top Rows</span>
          <input
            type="number"
            min={TOP_N_MIN}
            max={TOP_N_MAX}
            value={topN}
            onChange={(event) => {
              const parsed = Number.parseInt(event.target.value, 10);
              setTopN(Number.isNaN(parsed) ? DEFAULT_TOP_N : parsed);
            }}
          />
        </label>

        <label className="analytics-control">
          <span>Scope</span>
          <select
            value={scopeMode}
            onChange={(event) => setScopeMode(event.target.value as ScopeMode)}
          >
            <option value="visible">All Visible Containers</option>
            <option value="selectedContainer" disabled={!hasSelectedContainer}>
              Selected Container
            </option>
          </select>
        </label>

        <button
          type="button"
          className="analytics-refresh-btn"
          onClick={() => setRefreshKey((prev) => prev + 1)}
        >
          Refresh
        </button>
      </div>

      <div className="analytics-quick-range">
        {QUICK_RANGES.map((range) => (
          <button key={range} type="button" onClick={() => applyQuickRange(range)}>
            {range === 'all' ? 'All' : range}
          </button>
        ))}

        <button type="button" onClick={() => setDrilldown(null)} disabled={!drilldown}>
          Clear Drilldown
        </button>
      </div>

      <div className="analytics-meta analytics-muted">
        {data?.meta?.generatedAt ? `Generated: ${data.meta.generatedAt}` : 'Generated: n/a'}
        {' • '}
        {data?.meta?.timezone ? `Timezone: ${data.meta.timezone}` : `Timezone: ${timezone}`}
      </div>

      {error && <div className="analytics-error">{error}</div>}
      {loading && <div className="analytics-muted">Loading analytics...</div>}

      {!loading && !error && (
        <>
          <div className="analytics-kpi-grid">
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">{t('container.plural')}</div>
              <div className="analytics-kpi-value">{formatCount(totals?.containers)}</div>
            </div>
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">{t('type.plural')}</div>
              <div className="analytics-kpi-value">{formatCount(totals?.dataTypes)}</div>
            </div>
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">{t('item.plural')}</div>
              <div className="analytics-kpi-value">{formatCount(totals?.dataItems)}</div>
            </div>
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">{t('itemVerification.plural')}</div>
              <div className="analytics-kpi-value">{formatCount(totals?.verifications)}</div>
            </div>
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">Active Addresses</div>
              <div className="analytics-kpi-value">{formatCount(totals?.activeAddresses)}</div>
            </div>
            <div className="analytics-kpi-card">
              <div className="analytics-kpi-label">Followed {t('container.plural')}</div>
              <div className="analytics-kpi-value">{formatCount(totals?.followedContainers)}</div>
            </div>
          </div>

          <section className="analytics-section">
            <h3>Verification Readiness</h3>
            {verificationReadinessLoading ? (
              <div className="analytics-muted">Loading verification readiness...</div>
            ) : (
              <>
                <div className="analytics-kpi-grid analytics-kpi-grid--compact">
                  <div className="analytics-kpi-card">
                    <div className="analytics-kpi-label">
                      No Recipients (Not Intended for Verification)
                    </div>
                    <div className="analytics-kpi-value">
                      {formatCount(verificationReadiness.noRecipients)}
                    </div>
                  </div>
                  <div className="analytics-kpi-card">
                    <div className="analytics-kpi-label">
                      Recipients Set, No Verifications
                    </div>
                    <div className="analytics-kpi-value">
                      {formatCount(verificationReadiness.recipientsNoVerifications)}
                    </div>
                  </div>
                  <div className="analytics-kpi-card">
                    <div className="analytics-kpi-label">
                      Recipients Set, Failed Verifications
                    </div>
                    <div className="analytics-kpi-value">
                      {formatCount(verificationReadiness.recipientsFailedVerifications)}
                    </div>
                  </div>
                  <div className="analytics-kpi-card">
                    <div className="analytics-kpi-label">
                      Recipients Set, Successful Verifications
                    </div>
                    <div className="analytics-kpi-value">
                      {formatCount(verificationReadiness.recipientsSuccessfulVerifications)}
                    </div>
                  </div>
                </div>

                <div className="analytics-muted">
                  Verifiable items in range: {formatCount(verifiableItemsTotal)} /{' '}
                  {formatCount(verificationReadiness.totalDataItems)}
                </div>
              </>
            )}

            {verificationReadinessError ? (
              <div className="analytics-muted">{verificationReadinessError}</div>
            ) : null}
          </section>

          <section className="analytics-section">
            <h3>Latest Published Graph</h3>
            <div className="analytics-muted">
              Window: {formatCount(latestPublishedGraph.windowDataItems)} /{' '}
              {formatCount(latestPublishedGraph.totalScopedDataItems)} items (limit:{' '}
              {formatCount(latestPublishedGraph.limit || 100)}).
            </div>

            <div className="analytics-kpi-grid analytics-kpi-grid--compact analytics-published-graph-summary">
              <div className="analytics-kpi-card">
                <div className="analytics-kpi-label">{t('container.plural')} In Graph</div>
                <div className="analytics-kpi-value">
                  {formatCount(latestPublishedGraph.summary.containers)}
                </div>
              </div>
              <div className="analytics-kpi-card">
                <div className="analytics-kpi-label">{t('type.plural')} In Graph</div>
                <div className="analytics-kpi-value">
                  {formatCount(latestPublishedGraph.summary.dataTypes)}
                </div>
              </div>
              <div className="analytics-kpi-card">
                <div className="analytics-kpi-label">{t('item.plural')} In Graph</div>
                <div className="analytics-kpi-value">
                  {formatCount(latestPublishedGraph.summary.dataItems)}
                </div>
              </div>
              <div className="analytics-kpi-card">
                <div className="analytics-kpi-label">{t('itemVerification.plural')} In Graph</div>
                <div className="analytics-kpi-value">
                  {formatCount(latestPublishedGraph.summary.verifications)}
                </div>
              </div>
            </div>

            {latestPublishedGraph.info ? (
              <div className="analytics-muted">{latestPublishedGraph.info}</div>
            ) : null}

            <div className="analytics-published-graph-shell bp-link-graph-canvas">
              {latestPublishedGraph.nodes.length === 0 ? (
                <div className="bp-link-graph-empty">No graph rows for current scope and date range.</div>
              ) : (
                <svg
                  className="bp-link-graph-svg"
                  viewBox={`0 0 ${latestPublishedGraphLayout.width} ${latestPublishedGraphLayout.height}`}
                  role="img"
                  aria-label="Latest published graph"
                >
                  {latestPublishedGraph.edges.map((edge) => {
                    const from =
                      latestPublishedGraphLayout.positions[edge.from] ??
                      latestPublishedGraphLayout.positions[edge.from.toLowerCase()];
                    const to =
                      latestPublishedGraphLayout.positions[edge.to] ??
                      latestPublishedGraphLayout.positions[edge.to.toLowerCase()];
                    if (!from || !to) return null;

                    return (
                      <line
                        key={`${edge.from}->${edge.to}:${edge.relation}`}
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        className="bp-link-graph-edge analytics-published-graph-edge"
                      />
                    );
                  })}

                  {latestPublishedGraphLayout.levels.map((level) => {
                    const x = 38 + level * 240;
                    return (
                      <text
                        key={`published-graph-level-${level}`}
                        x={x}
                        y={24}
                        className="bp-link-graph-level-label"
                      >
                        {graphLevelLabel(level)}
                      </text>
                    );
                  })}

                  {latestPublishedGraph.nodes.map((node) => {
                    const position =
                      latestPublishedGraphLayout.positions[node.id] ??
                      latestPublishedGraphLayout.positions[node.id.toLowerCase()];
                    if (!position) return null;
                    const nodeKindClass = `analytics-published-graph-node--${node.kind
                      .toLowerCase()
                      .replace(/[^a-z0-9_-]/g, '-')}`;
                    return (
                      <g key={node.id}>
                        <circle
                          cx={position.x}
                          cy={position.y}
                          r={17}
                          className={`bp-link-graph-node analytics-published-graph-node ${nodeKindClass}`}
                        />
                        <text
                          x={position.x}
                          y={position.y + 33}
                          textAnchor="middle"
                          className="bp-link-graph-node-label analytics-published-graph-node-label"
                        >
                          {truncateGraphLabel(node.label)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </section>

          <section className="analytics-section">
            <div className="analytics-section-head">
              <h3>Trend</h3>
              <label className="analytics-control analytics-control--inline">
                <span>Metric</span>
                <select
                  value={trendMetric}
                  onChange={(event) => setTrendMetric(event.target.value as TrendMetric)}
                >
                  <option value="dataItems">Items</option>
                  <option value="verifications">Verifications</option>
                  <option value="dataTypes">Types</option>
                  <option value="containers">Containers</option>
                  <option value="activeAddresses">Active Addresses</option>
                </select>
              </label>
            </div>

            {timeSeries.length === 0 ? (
              <div className="analytics-muted">No timeline data in selected range.</div>
            ) : (
              <div className="analytics-trend-list">
                {timeSeries.map((bucket, index) => {
                  const value = getBucketMetricValue(bucket, trendMetric);
                  const widthPercent =
                    maxTrendValue > 0 ? Math.max(4, (value / maxTrendValue) * 100) : 0;
                  const key = bucket.bucket ?? `${index}`;

                  return (
                    <div key={key} className="analytics-trend-row">
                      <div className="analytics-trend-label">{bucket.label ?? bucket.bucket ?? key}</div>
                      <div className="analytics-trend-bar-wrap">
                        <div
                          className="analytics-trend-bar"
                          style={{ width: `${widthPercent}%` }}
                          title={`${TREND_METRIC_LABEL[trendMetric]}: ${formatCount(value)}`}
                        />
                      </div>
                      <div className="analytics-trend-value">{formatCount(value)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <div className="analytics-grid-2">
            <section className="analytics-section">
              <h3>Top Types by Items (Top {topN})</h3>
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Container</th>
                    <th>Items</th>
                    <th>Verifications</th>
                  </tr>
                </thead>
                <tbody>
                  {topDataTypes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="analytics-muted">
                        No type aggregates.
                      </td>
                    </tr>
                  )}

                  {topDataTypes.map((entry, index) => {
                    const drilldownKey = entry.dataTypeId ?? entry.dataTypeName;
                    const typeLabel = entry.dataTypeName ?? entry.dataTypeId ?? `Type ${index + 1}`;
                    const containerLabel = entry.containerName ?? entry.containerId ?? '-';

                    return (
                      <tr
                        key={`${typeLabel}-${index}`}
                        className={drilldownKey ? 'analytics-row-clickable' : ''}
                        onClick={() => {
                          if (!drilldownKey) return;
                          setDrilldown({
                            dimension: 'dataType',
                            key: drilldownKey,
                            label: typeLabel,
                          });
                        }}
                      >
                        <td title={typeLabel}>{typeLabel}</td>
                        <td title={containerLabel}>{containerLabel}</td>
                        <td>{formatCount(entry.dataItems)}</td>
                        <td>{formatCount(entry.verifications)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            <section className="analytics-section">
              <h3>Top Containers by Items (Top {topN})</h3>
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Container</th>
                    <th>Types</th>
                    <th>Items</th>
                    <th>Verifications</th>
                  </tr>
                </thead>
                <tbody>
                  {topContainers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="analytics-muted">
                        No container aggregates.
                      </td>
                    </tr>
                  )}

                  {topContainers.map((entry, index) => {
                    const drilldownKey = entry.containerId ?? entry.containerName;
                    const containerLabel =
                      entry.containerName ?? entry.containerId ?? `Container ${index + 1}`;

                    return (
                      <tr
                        key={`${containerLabel}-${index}`}
                        className={drilldownKey ? 'analytics-row-clickable' : ''}
                        onClick={() => {
                          if (!drilldownKey) return;
                          setDrilldown({
                            dimension: 'container',
                            key: drilldownKey,
                            label: containerLabel,
                          });
                        }}
                      >
                        <td title={containerLabel}>{containerLabel}</td>
                        <td>{formatCount(entry.dataTypes)}</td>
                        <td>{formatCount(entry.dataItems)}</td>
                        <td>{formatCount(entry.verifications)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            <section className="analytics-section">
              <h3>Top Item Posters (Top {topN})</h3>
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Address</th>
                    <th>Items</th>
                  </tr>
                </thead>
                <tbody>
                  {topAddressItems.length === 0 && (
                    <tr>
                      <td colSpan={2} className="analytics-muted">
                        No posting aggregates.
                      </td>
                    </tr>
                  )}

                  {topAddressItems.map((entry, index) => {
                    const address = entry.address ?? `Address ${index + 1}`;
                    const value = entry.dataItems ?? entry.count;

                    return (
                      <tr
                        key={`${address}-${index}`}
                        className={entry.address ? 'analytics-row-clickable' : ''}
                        onClick={() => {
                          if (!entry.address) return;
                          setDrilldown({
                            dimension: 'address',
                            key: entry.address,
                            label: shortenId(entry.address),
                          });
                        }}
                      >
                        <td title={address}>{entry.address ? shortenId(address) : address}</td>
                        <td>{formatCount(value)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            <section className="analytics-section">
              <h3>Top Verification Posters (Top {topN})</h3>
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Address</th>
                    <th>Verifications</th>
                  </tr>
                </thead>
                <tbody>
                  {topAddressVerifications.length === 0 && (
                    <tr>
                      <td colSpan={2} className="analytics-muted">
                        No verification aggregates.
                      </td>
                    </tr>
                  )}

                  {topAddressVerifications.map((entry, index) => {
                    const address = entry.address ?? `Address ${index + 1}`;
                    const value = entry.verifications ?? entry.count;

                    return (
                      <tr
                        key={`${address}-${index}`}
                        className={entry.address ? 'analytics-row-clickable' : ''}
                        onClick={() => {
                          if (!entry.address) return;
                          setDrilldown({
                            dimension: 'address',
                            key: entry.address,
                            label: shortenId(entry.address),
                          });
                        }}
                      >
                        <td title={address}>{entry.address ? shortenId(address) : address}</td>
                        <td>{formatCount(value)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </div>

          <section className="analytics-section">
            <h3>Drilldown</h3>
            {drilldown ? (
              <>
                <div className="analytics-drilldown-heading">
                  <strong>{drilldown.label}</strong>
                  <span className="analytics-muted">({drilldown.dimension})</span>
                </div>

                <div className="analytics-kpi-grid analytics-kpi-grid--compact">
                  <div className="analytics-kpi-card">
                    <div className="analytics-kpi-label">Items</div>
                    <div className="analytics-kpi-value">{formatCount(drilldownTotals?.dataItems)}</div>
                  </div>
                  <div className="analytics-kpi-card">
                    <div className="analytics-kpi-label">Verifications</div>
                    <div className="analytics-kpi-value">
                      {formatCount(drilldownTotals?.verifications)}
                    </div>
                  </div>
                  <div className="analytics-kpi-card">
                    <div className="analytics-kpi-label">Types</div>
                    <div className="analytics-kpi-value">{formatCount(drilldownTotals?.dataTypes)}</div>
                  </div>
                </div>

                {drilldownSeries.length === 0 ? (
                  <div className="analytics-muted">No drilldown timeline returned.</div>
                ) : (
                  <div className="analytics-trend-list">
                    {drilldownSeries.map((bucket, index) => (
                      <div key={`${bucket.bucket ?? index}`} className="analytics-trend-row">
                        <div className="analytics-trend-label">{bucket.label ?? bucket.bucket ?? `#${index + 1}`}</div>
                        <div className="analytics-trend-bar-wrap">
                          <div
                            className="analytics-trend-bar analytics-trend-bar--drilldown"
                            style={{
                              width: `${Math.max(
                                4,
                                (toSafeNumber(bucket.dataItems) /
                                  Math.max(
                                    1,
                                    ...drilldownSeries.map((entry) => toSafeNumber(entry.dataItems))
                                  )) *
                                  100
                              )}%`,
                            }}
                            title={`Items: ${formatCount(bucket.dataItems)}`}
                          />
                        </div>
                        <div className="analytics-trend-value">{formatCount(bucket.dataItems)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="analytics-muted">
                Click a top type, container, or address row to drill down.
              </div>
            )}
          </section>

          <section className="analytics-section">
            <h3>ERP / Kibana Style Checks</h3>
            <ul className="analytics-insights">
              <li>
                Verification coverage: {verificationRate ? `${verificationRate}%` : 'n/a'}
              </li>
              <li>
                Highest item poster: {topPoster ? shortenId(topPoster) : 'n/a'}
              </li>
              <li>
                Highest verification poster: {topVerifier ? shortenId(topVerifier) : 'n/a'}
              </li>
              <li>
                Recommended next backend additions: weekly anomaly flags, median verification delay,
                and CSV export endpoint for BI.
              </li>
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
