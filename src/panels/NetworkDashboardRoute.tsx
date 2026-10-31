import { useMemo, useState, useEffect, useRef } from 'react';
import { API_BASE } from '../Config.ts';
import { NetworkDashboardContent } from './NetworkDashboardContent.tsx';

export function NetworkDashboardRoute() {
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [mode, setMode] = useState<'full' | 'aggregated'>('aggregated');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const jsonHref = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const apiBase = new URL(API_BASE, origin);
    const url = new URL('api/network-dashboard/gui', apiBase);
    url.searchParams.set('mode', mode);
    return url.toString();
  }, [mode]);

  const onRefresh = () => setRefreshNonce(Date.now());

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (autoRefresh) {
      autoTimerRef.current = setInterval(onRefresh, 30000);
    } else {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, [autoRefresh]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #f6f9ff 0%, #f2fff8 100%)',
        color: '#122131',
        padding: 16,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gap: 12 }}>
        {/* Header */}
        <section
          style={{
            background: '#fff',
            border: '1px solid #dbe7f4',
            borderRadius: 14,
            padding: 16,
            boxShadow: '0 6px 20px rgba(18, 33, 49, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.4rem' }}>IOTA Network Dashboard</h1>
              <div style={{ marginTop: 4, color: '#4f6174', fontSize: '0.85rem' }}>
                mainnet · auto-generated from public ledger data
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Mode toggle */}
              <div
                style={{
                  display: 'flex',
                  background: '#f1f5f9',
                  borderRadius: 8,
                  padding: 3,
                  gap: 2,
                }}
              >
                <button
                  type="button"
                  onClick={() => setMode('full')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: 'none',
                    background: mode === 'full' ? '#fff' : 'transparent',
                    color: mode === 'full' ? '#0d6e4b' : '#6b7f92',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    boxShadow: mode === 'full' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  Full
                </button>
                <button
                  type="button"
                  onClick={() => setMode('aggregated')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: 'none',
                    background: mode === 'aggregated' ? '#fff' : 'transparent',
                    color: mode === 'aggregated' ? '#0d6e4b' : '#6b7f92',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    boxShadow: mode === 'aggregated' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  Aggregated
                </button>
              </div>

              {/* Auto-refresh toggle */}
              <button
                type="button"
                onClick={() => setAutoRefresh((p) => !p)}
                title="Auto-refresh every 30 seconds"
                style={{
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: autoRefresh ? '2px solid #0d6e4b' : '1px solid #dbe7f4',
                  background: autoRefresh ? '#e8f5ef' : '#f8fafc',
                  color: autoRefresh ? '#0d6e4b' : '#6b7f92',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                {autoRefresh ? '⏺ Auto' : '⏸ Auto'}
              </button>

              <button
                type="button"
                onClick={onRefresh}
                style={{
                  padding: '7px 18px',
                  background: '#0d6e4b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                }}
              >
                Refresh
              </button>

              <a
                href={jsonHref}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '7px 14px',
                  background: '#f8fafc',
                  border: '1px solid #dbe7f4',
                  borderRadius: 8,
                  color: '#122131',
                  textDecoration: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                }}
              >
                JSON
              </a>

              <a
                href="/"
                style={{
                  color: '#0d6e4b',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  marginLeft: 4,
                }}
              >
                ← App
              </a>
            </div>
          </div>

          {/* Info bar: explains how counts work */}
          <div
            style={{
              marginTop: 10,
              fontSize: '0.75rem',
              color: '#6b7f92',
              background: '#f8fafc',
              borderRadius: 8,
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              lineHeight: 1.5,
            }}
          >
            <strong>How counts work:</strong> Each "kind" or "sender" shows how many transactions of that type were found.
            For <strong>Programmable Transactions by Key</strong>, each key shows how many times that specific
            <code> package::module::function</code> was called across all transactions. A count of 7 means that
            operation appeared in 7 different transactions. The backend refreshes data every 2 minutes and keeps
            the last 1,000 snapshots in memory.
          </div>
        </section>

        {/* Dashboard content */}
        <section
          style={{
            background: '#fff',
            border: '1px solid #dbe7f4',
            borderRadius: 14,
            padding: 16,
            boxShadow: '0 6px 20px rgba(18, 33, 49, 0.06)',
          }}
        >
          <NetworkDashboardContent
            key={refreshNonce}
            jsonUrl={jsonHref}
            onRetry={onRefresh}
          />
        </section>
      </div>
    </div>
  );
}