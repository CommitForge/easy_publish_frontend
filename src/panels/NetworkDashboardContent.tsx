import { useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

interface FetchState {
  loading: boolean;
  error: string | null;
  data: JsonValue | null;
}

interface LeaderboardEntry {
  rank: number;
  key: string;
  count: number;
  sharePct: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isObject(v: unknown): v is Record<string, JsonValue> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function formatValue(v: JsonValue): string {
  if (v === null) return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return v.toLocaleString();
  return String(v);
}

function labelify(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/_/g, ' ')
    .trim();
}

/** Format a duration in ms to "X days Y hours Z minutes" */
function formatDuration(ms: number): string {
  if (ms <= 0) return '0 minutes';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(' ');
}

/** Fields to skip when rendering the raw JSON tree */
const SKIP_SECTIONS = new Set([
  'meta', 'leaderboards', 'transactionsSample', 'daily',
  '_bufferSize', '_bufferCapacity', '_warning',
]);

const SKIP_META_FIELDS = new Set([
  'generatedAt', 'startedAt', 'params', 'totals',
]);

/* ------------------------------------------------------------------ */
/*  Extract leaderboard arrays from JSON data                          */
/* ------------------------------------------------------------------ */

function extractLeaderboard(
  data: Record<string, JsonValue>,
  groupBy: string,
): LeaderboardEntry[] {
  const leaderboards = data['leaderboards'];
  if (!leaderboards || !isObject(leaderboards)) return [];

  const key = groupBy === 'sender' ? 'sendersTotal' : 'kindsTotal';
  const arr = leaderboards[key];
  if (!Array.isArray(arr)) return [];

  return arr
    .filter((item): item is Record<string, JsonValue> => isObject(item))
    .map((item) => ({
      rank: typeof item['rank'] === 'number' ? item['rank'] : 0,
      key: typeof item['key'] === 'string' ? item['key'] : '',
      count: typeof item['count'] === 'number' ? item['count'] : 0,
      sharePct: typeof item['sharePct'] === 'number' ? item['sharePct'] : 0,
    }));
}

function extractMoveCallsLeaderboard(
  data: Record<string, JsonValue>,
): LeaderboardEntry[] {
  const leaderboards = data['leaderboards'];
  if (!leaderboards || !isObject(leaderboards)) return [];

  const arr = leaderboards['moveCallsTotal'];
  if (!Array.isArray(arr)) return [];

  return arr
    .filter((item): item is Record<string, JsonValue> => isObject(item))
    .map((item) => ({
      rank: typeof item['rank'] === 'number' ? item['rank'] : 0,
      key: typeof item['key'] === 'string' ? item['key'] : '',
      count: typeof item['count'] === 'number' ? item['count'] : 0,
      sharePct: typeof item['sharePct'] === 'number' ? item['sharePct'] : 0,
    }));
}

/* ------------------------------------------------------------------ */
/*  Bar chart for leaderboard data                                     */
/* ------------------------------------------------------------------ */

function GroupByBarChart({
  data,
  groupBy,
}: {
  data: LeaderboardEntry[];
  groupBy: string;
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  if (!data || data.length === 0) {
    return (
      <div style={{ color: '#8a9aa8', fontSize: '0.85rem', padding: '12px 0' }}>
        No {groupBy} data available.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
      {data.map((entry) => {
        const pct = (entry.count / maxCount) * 100;
        const label =
          groupBy === 'sender'
            ? `${entry.key.slice(0, 10)}...${entry.key.slice(-6)}`
            : entry.key;
        return (
          <div key={entry.rank}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{ minWidth: 28, fontSize: '0.75rem', color: '#6b7f92', textAlign: 'right', fontWeight: 500 }}>
                #{entry.rank}
              </span>
              <span style={{ flex: 1, fontSize: '0.8rem', color: '#1a2b3c', fontWeight: 500, wordBreak: 'break-all', lineHeight: 1.3 }} title={entry.key}>
                {label}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#4f6174', fontWeight: 600, minWidth: 50, textAlign: 'right' }}>
                {entry.count.toLocaleString()}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#8a9aa8', minWidth: 40, textAlign: 'right' }}>
                {entry.sharePct.toFixed(1)}%
              </span>
            </div>
            <div style={{ paddingLeft: 36 }}>
              <div
                style={{
                  height: 20,
                  width: `${Math.max(pct, 2)}%`,
                  background: groupBy === 'sender' ? 'linear-gradient(90deg, #3b82f6, #60a5fa)' : 'linear-gradient(90deg, #0d6e4b, #34d399)',
                  borderRadius: 4,
                  minWidth: 4,
                  transition: 'width 0.3s ease',
                }}
                title={`${entry.key} (${entry.count})`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Move Calls breakdown by key                                        */
/* ------------------------------------------------------------------ */

function MoveCallsChart({ moveCallsTotal }: { moveCallsTotal: LeaderboardEntry[] }) {
  if (moveCallsTotal.length === 0) return null;

  const totalCount = moveCallsTotal.reduce((sum, e) => sum + e.count, 0);
  const sorted = [...moveCallsTotal]
    .sort((a, b) => b.count - a.count)
    .map((e, i) => ({ ...e, rank: i + 1, sharePct: totalCount > 0 ? (e.count / totalCount) * 100 : 0 }));

  const maxCount = Math.max(...sorted.map((d) => d.count), 1);

  return (
    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 16, boxShadow: '0 4px 14px rgba(18, 33, 49, 0.05)' }}>
      <h2 style={{ margin: '0 0 12px 0', fontSize: '1.05rem', color: '#92400e', borderBottom: '2px solid #fde68a', paddingBottom: 8 }}>
        Programmable Transactions by Key
      </h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0 4px 36px', fontSize: '0.7rem', color: '#b45309', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        <span style={{ flex: 1 }}>Key (package::module::function)</span>
        <span style={{ minWidth: 50, textAlign: 'right' }}>Count</span>
        <span style={{ minWidth: 40, textAlign: 'right' }}>Share</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
        {sorted.map((entry) => {
          const pct = (entry.count / maxCount) * 100;
          return (
            <div key={entry.rank}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ minWidth: 28, fontSize: '0.75rem', color: '#92400e', textAlign: 'right', fontWeight: 500 }}>#{entry.rank}</span>
                <span style={{ flex: 1, fontSize: '0.78rem', color: '#92400e', fontWeight: 500, wordBreak: 'break-all', lineHeight: 1.3 }} title={entry.key}>
                  {entry.key}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 600, minWidth: 50, textAlign: 'right' }}>{entry.count.toLocaleString()}</span>
                <span style={{ fontSize: '0.75rem', color: '#b45309', minWidth: 40, textAlign: 'right' }}>{entry.sharePct.toFixed(1)}%</span>
              </div>
              <div style={{ paddingLeft: 36 }}>
                <div style={{ height: 18, width: `${Math.max(pct, 2)}%`, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderRadius: 4, minWidth: 4, transition: 'width 0.3s ease' }} title={`${entry.key} (${entry.count})`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Simple recursive renderer – safe for any JSON shape               */
/* ------------------------------------------------------------------ */

function JsonTree({ value, depth = 0 }: { value: JsonValue; depth?: number }) {
  if (value === null || typeof value !== 'object') {
    return <span>{formatValue(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span style={{ color: '#8a9aa8' }}>[]</span>;
    return (
      <div style={{ paddingLeft: depth > 0 ? 16 : 0 }}>
        {value.map((item, i) => (
          <div key={i} style={{ marginTop: depth > 0 && i > 0 ? 6 : 0 }}>
            <JsonTree value={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  const entries = Object.entries(value);
  if (entries.length === 0) return <span style={{ color: '#8a9aa8' }}>{'{}'}</span>;

  return (
    <div style={{ paddingLeft: depth > 0 ? 16 : 0 }}>
      {entries.map(([k, v]) => {
        const isLeaf = v === null || typeof v !== 'object';
        return (
          <div key={k} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: depth < 2 ? '1px solid #edf2f7' : 'none', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: isLeaf ? 500 : 600, color: isLeaf ? '#1a2b3c' : '#0d6e4b', minWidth: 140, flexShrink: 0 }}>
              {labelify(k)}
            </span>
            <span style={{ color: '#2d4055', wordBreak: 'break-word' }}>
              {isLeaf ? formatValue(v) : <JsonTree value={v} depth={depth + 1} />}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary cards — only show meaningful fields                        */
/* ------------------------------------------------------------------ */

function SummaryCards({ data }: { data: Record<string, JsonValue> }) {
  const summary = data['summary'];
  if (!isObject(summary)) return null;

  const cards: { label: string; value: string }[] = [];

  const totalTx = summary['totalTransactions'];
  if (typeof totalTx === 'number') cards.push({ label: 'Transactions', value: totalTx.toLocaleString() });

  const progTx = summary['programmableTxTotal'];
  if (typeof progTx === 'number') cards.push({ label: 'Programmable TX', value: progTx.toLocaleString() });

  const uniqueSenders = summary['uniqueSendersTotal'];
  if (typeof uniqueSenders === 'number') cards.push({ label: 'Unique Senders', value: uniqueSenders.toLocaleString() });

  // Coverage info
  const meta = data['meta'];
  if (isObject(meta)) {
    const coverage = meta['coverage'];
    if (isObject(coverage)) {
      const oldest = typeof coverage['oldestIso'] === 'string' ? coverage['oldestIso'] : null;
      const newest = typeof coverage['newestIso'] === 'string' ? coverage['newestIso'] : null;
      if (oldest && newest) {
        const spanMs = new Date(newest).getTime() - new Date(oldest).getTime();
        cards.push({ label: 'Data Span', value: formatDuration(spanMs) });
      }
      if (oldest) {
        const d = new Date(oldest);
        cards.push({ label: 'From', value: d.toLocaleString() });
      }
      if (newest) {
        const d = new Date(newest);
        cards.push({ label: 'To', value: d.toLocaleString() });
      }
    }
  }

  // Buffer info
  const bufSize = data['_bufferSize'];
  const bufCap = data['_bufferCapacity'];
  if (typeof bufSize === 'number' && typeof bufCap === 'number') {
    cards.push({ label: 'In Memory', value: `${bufSize} / ${bufCap} snapshots` });
  }

  if (cards.length === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
      {cards.map((c) => (
        <div key={c.label} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7f92', marginBottom: 2 }}>{c.label}</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#122131' }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Ignored kinds info                                                 */
/* ------------------------------------------------------------------ */

function IgnoredKindsBadge({ data }: { data: Record<string, JsonValue> }) {
  const meta = data['meta'];
  if (!isObject(meta)) return null;
  const ignored = meta['ignoredKinds'];
  if (!Array.isArray(ignored) || ignored.length === 0) return null;

  return (
    <div style={{ fontSize: '0.75rem', color: '#8a9aa8', padding: '4px 0' }}>
      Ignored kinds: {ignored.map(String).join(', ')}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function NetworkDashboardContent({
  jsonUrl,
  onRetry,
}: {
  jsonUrl: string;
  onRetry: () => void;
}) {
  const [state, setState] = useState<FetchState>({ loading: true, error: null, data: null });
  const [groupBy, setGroupBy] = useState<string>('kind');
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setState({ loading: true, error: null, data: null });

    fetch(jsonUrl, { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
        }
        return res.json() as Promise<JsonValue>;
      })
      .then((json) => {
        if (!ctrl.signal.aborted) setState({ loading: false, error: null, data: json });
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        const msg = err instanceof Error ? err.message : 'Failed to load dashboard data';
        setState({ loading: false, error: msg, data: null });
      });

    return () => ctrl.abort();
  }, [jsonUrl]);

  if (state.loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: '#4f6174', fontSize: '0.95rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #dbe7f4', borderTopColor: '#0d6e4b', borderRadius: '50%', animation: 'nd-spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Loading dashboard data…
          <style>{`@keyframes nd-spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div style={{ textAlign: 'center', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 12, padding: '24px 32px', maxWidth: 480 }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⚠️</div>
          <div style={{ fontWeight: 600, color: '#991b1b', marginBottom: 6 }}>Dashboard Unavailable</div>
          <div style={{ color: '#7f1d1d', fontSize: '0.85rem', marginBottom: 14, wordBreak: 'break-word' }}>{state.error}</div>
          <button type="button" onClick={onRetry} style={{ padding: '8px 20px', background: '#0d6e4b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (state.data === null) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: '#8a9aa8' }}>No data returned from the dashboard API.</div>;
  }

  const root = state.data;
  const allEntries = isObject(root) ? extractLeaderboard(root, groupBy) : [];
  const moveCallsTotal = isObject(root) ? extractMoveCallsLeaderboard(root) : [];

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Summary cards — clean, meaningful info */}
      {isObject(root) && <SummaryCards data={root} />}

      {/* Ignored kinds badge */}
      {isObject(root) && <IgnoredKindsBadge data={root} />}

      {/* Collapsible leaderboard — collapsed by default */}
      {isObject(root) && (
        <div style={{ background: '#fff', border: '1px solid #dbe7f4', borderRadius: 14, padding: 16, boxShadow: '0 4px 14px rgba(18, 33, 49, 0.05)' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setLeaderboardOpen((p) => !p)}
          >
            <h2 style={{ margin: 0, fontSize: '1.05rem', color: '#0d6e4b' }}>
              {leaderboardOpen ? '▼' : '▶'} Leaderboard by {groupBy}
            </h2>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #dbe7f4', background: '#f8fafc', fontSize: '0.85rem', color: '#122131', fontWeight: 500, cursor: 'pointer', outline: 'none' }}
            >
              <option value="kind">Kind</option>
              <option value="sender">Sender</option>
            </select>
          </div>
          {leaderboardOpen && <div style={{ marginTop: 12 }}><GroupByBarChart data={allEntries} groupBy={groupBy} /></div>}
        </div>
      )}

      {/* Move calls breakdown */}
      {groupBy === 'kind' && <MoveCallsChart moveCallsTotal={moveCallsTotal} />}

      {/* Raw JSON sections — skip noisy fields */}
      {isObject(root) && Object.entries(root)
        .filter(([key]) => !SKIP_SECTIONS.has(key))
        .filter(([, v]) => v !== null && typeof v === 'object')
        .map(([key, val]) => {
          // For meta section, skip internal fields
          if (key === 'meta' && isObject(val)) {
            const filtered = Object.fromEntries(
              Object.entries(val).filter(([k]) => !SKIP_META_FIELDS.has(k))
            );
            if (Object.keys(filtered).length === 0) return null;
            return (
              <div key={key} style={{ background: '#fff', border: '1px solid #dbe7f4', borderRadius: 14, padding: 16, boxShadow: '0 4px 14px rgba(18, 33, 49, 0.05)' }}>
                <h2 style={{ margin: '0 0 12px 0', fontSize: '1.05rem', color: '#0d6e4b', borderBottom: '2px solid #e2f0e8', paddingBottom: 8 }}>{labelify(key)}</h2>
                <JsonTree value={filtered as JsonValue} depth={0} />
              </div>
            );
          }
          return (
            <div key={key} style={{ background: '#fff', border: '1px solid #dbe7f4', borderRadius: 14, padding: 16, boxShadow: '0 4px 14px rgba(18, 33, 49, 0.05)' }}>
              <h2 style={{ margin: '0 0 12px 0', fontSize: '1.05rem', color: '#0d6e4b', borderBottom: '2px solid #e2f0e8', paddingBottom: 8 }}>{labelify(key)}</h2>
              <JsonTree value={val} depth={0} />
            </div>
          );
        })
        .filter(Boolean)
      }
    </div>
  );
}