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
};

type AnalyticsDashboardPanelProps = {
  accountAddress: string;
  selectedContainerId?: string | null;
  selectedDataTypeId?: string | null;
};

const TOP_N_MIN = 3;
const TOP_N_MAX = 25;
const DEFAULT_TOP_N = 8;
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

  const totals = data?.totals;
  const timeSeries = toSafeArray(data?.timeSeries);
  const topDataTypes = toSafeArray(data?.topDataTypes);
  const topContainers = toSafeArray(data?.topContainers);
  const topAddressItems = toSafeArray(data?.topAddresses?.dataItems);
  const topAddressVerifications = toSafeArray(data?.topAddresses?.verifications);
  const drilldownSeries = toSafeArray(data?.drilldown?.timeSeries);
  const drilldownTotals = data?.drilldown?.totals;

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
          <span>Top N</span>
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
              <h3>Top Types by Items</h3>
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
              <h3>Top Containers by Items</h3>
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
              <h3>Top Item Posters</h3>
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
              <h3>Top Verification Posters</h3>
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
