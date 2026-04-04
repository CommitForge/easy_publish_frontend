import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE } from '../../Config.ts';
import { parseDelimitedValues } from './FormUtils.tsx';

type LinkGraphMode = 'recipients' | 'references';
type LinkSourceType = 'data_item' | 'data_item_verification';

type LinkGraphLauncherProps = {
  mode: LinkGraphMode;
  rawValue: string;
  sourceType: LinkSourceType;
  sourceContainerId?: string;
  sourceDataItemId?: string;
};

type GraphNode = {
  id: string;
  label: string;
  level: number;
  kind?: string;
};

type GraphEdge = {
  from: string;
  to: string;
  relation: string;
};

type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  source: 'backend' | 'fallback';
  info?: string;
};

type GraphLayout = {
  width: number;
  height: number;
  levels: number[];
  levelNodes: Record<number, GraphNode[]>;
  positions: Record<string, { x: number; y: number }>;
};

const DEFAULT_MAX_DEPTH = 3;
const MAX_DEPTH_LIMIT = 8;
const DEFAULT_MAX_NODES = 160;
const MAX_NODES_LIMIT = 500;

export function LinkGraphLaunchButton({
  mode,
  rawValue,
  sourceType,
  sourceContainerId,
  sourceDataItemId,
}: LinkGraphLauncherProps) {
  const [open, setOpen] = useState(false);
  const seeds = useMemo(() => parseGraphSeedInput(rawValue), [rawValue]);
  const label = mode === 'recipients' ? 'Recipients Graph' : 'References Graph';

  return (
    <>
      <button
        type="button"
        className="bp-link-graph-button"
        disabled={seeds.length === 0}
        onClick={() => setOpen(true)}
        title={
          seeds.length === 0
            ? 'Select at least one ID to visualize links.'
            : `Visualize ${mode} link graph`
        }
      >
        <i className="bi bi-diagram-3" aria-hidden="true" /> {label}
      </button>

      {open && (
        <LinkGraphDialog
          mode={mode}
          seeds={seeds}
          sourceType={sourceType}
          sourceContainerId={sourceContainerId}
          sourceDataItemId={sourceDataItemId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

type LinkGraphDialogProps = {
  mode: LinkGraphMode;
  seeds: string[];
  sourceType: LinkSourceType;
  sourceContainerId?: string;
  sourceDataItemId?: string;
  onClose: () => void;
};

function LinkGraphDialog({
  mode,
  seeds,
  sourceType,
  sourceContainerId,
  sourceDataItemId,
  onClose,
}: LinkGraphDialogProps) {
  const [maxDepth, setMaxDepth] = useState(DEFAULT_MAX_DEPTH);
  const [maxNodes, setMaxNodes] = useState(DEFAULT_MAX_NODES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [graph, setGraph] = useState<GraphData>(() =>
    createFallbackGraphData(mode, seeds, maxNodes)
  );

  const loadGraph = useCallback(async () => {
    const normalizedDepth = Math.min(Math.max(maxDepth, 1), MAX_DEPTH_LIMIT);
    const normalizedMaxNodes = Math.min(
      Math.max(maxNodes, seeds.length || 1),
      MAX_NODES_LIMIT
    );

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}api/link-graph`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          sourceType,
          sourceContainerId: sourceContainerId?.trim() || undefined,
          sourceDataItemId: sourceDataItemId?.trim() || undefined,
          seeds,
          maxDepth: normalizedDepth,
          maxNodes: normalizedMaxNodes,
          preventCycles: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Graph endpoint returned HTTP ${response.status}`);
      }

      const payload = (await response.json()) as Record<string, unknown>;
      const nextGraph = normalizeGraphPayload(
        mode,
        seeds,
        payload,
        normalizedDepth,
        normalizedMaxNodes
      );
      setGraph(nextGraph);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Failed to load graph from backend.';
      setError(
        `${message} Showing a local fallback map (seed nodes only).`
      );
      setGraph(
        createFallbackGraphData(
          mode,
          seeds,
          normalizedMaxNodes
        )
      );
    } finally {
      setLoading(false);
    }
  }, [
    maxDepth,
    maxNodes,
    mode,
    seeds,
    sourceType,
    sourceContainerId,
    sourceDataItemId,
  ]);

  const layout = useMemo(() => buildGraphLayout(graph), [graph]);

  useEffect(() => {
    if (loadedOnce) return;
    setLoadedOnce(true);
    void loadGraph();
  }, [loadGraph, loadedOnce]);

  return (
    <div className="bp-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="bp-dialog bp-dialog-graph"
        role="dialog"
        aria-modal="true"
        aria-label={`${mode} graph visualization`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="bp-dialog-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="bp-link-graph-header">
          <h4 className="bp-link-graph-title">
            {mode === 'recipients' ? 'Recipients Link Graph' : 'References Link Graph'}
          </h4>
          <div className="bp-link-graph-subtitle">
            Seeds: {seeds.length} · Nodes: {graph.nodes.length} · Edges: {graph.edges.length}
          </div>
        </div>

        <div className="bp-link-graph-controls">
          <label className="bp-link-graph-control">
            <span>Max depth</span>
            <input
              type="number"
              min={1}
              max={MAX_DEPTH_LIMIT}
              value={maxDepth}
              onChange={(event) => setMaxDepth(Number(event.target.value))}
            />
          </label>

          <label className="bp-link-graph-control">
            <span>Max nodes</span>
            <input
              type="number"
              min={Math.max(1, seeds.length)}
              max={MAX_NODES_LIMIT}
              value={maxNodes}
              onChange={(event) => setMaxNodes(Number(event.target.value))}
            />
          </label>

          <button
            type="button"
            className="bp-toolbar-btn bp-data-item-filter-apply"
            onClick={() => {
              void loadGraph();
            }}
            disabled={loading || seeds.length === 0}
          >
            {loading ? 'Loading…' : 'Refresh Graph'}
          </button>
        </div>

        {error && <div className="bp-link-graph-message is-error">{error}</div>}
        {graph.info && <div className="bp-link-graph-message">{graph.info}</div>}

        <div className="bp-link-graph-canvas">
          {graph.nodes.length === 0 ? (
            <div className="bp-link-graph-empty">No linkable values found.</div>
          ) : (
            <svg
              className="bp-link-graph-svg"
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              role="img"
              aria-label="Link graph"
            >
              {graph.edges.map((edge) => {
                const from = layout.positions[edge.from];
                const to = layout.positions[edge.to];
                if (!from || !to) return null;
                const edgeKey = `${edge.from}->${edge.to}:${edge.relation}`;
                return (
                  <g key={edgeKey}>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      className="bp-link-graph-edge"
                    />
                  </g>
                );
              })}

              {layout.levels.map((level) => {
                const levelLabelX = 30 + level * 230;
                return (
                  <text
                    key={`level-${level}`}
                    x={levelLabelX}
                    y={24}
                    className="bp-link-graph-level-label"
                  >
                    Level {level}
                  </text>
                );
              })}

              {graph.nodes.map((node) => {
                const position = layout.positions[node.id];
                if (!position) return null;
                return (
                  <g key={node.id}>
                    <circle
                      cx={position.x}
                      cy={position.y}
                      r={18}
                      className="bp-link-graph-node"
                    />
                    <text
                      x={position.x}
                      y={position.y + 34}
                      textAnchor="middle"
                      className="bp-link-graph-node-label"
                    >
                      {truncateNodeLabel(node.label)}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        <div className="bp-link-graph-footnote">
          Source: {graph.source === 'backend' ? 'Backend graph API' : 'Fallback (frontend seed view)'}
          {' · '}
          Cycle prevention uses visited-node tracking and depth/node limits.
        </div>
      </div>
    </div>
  );
}

function parseGraphSeedInput(rawValue: string): string[] {
  return Array.from(new Set(parseDelimitedValues(rawValue)));
}

function normalizeGraphPayload(
  mode: LinkGraphMode,
  seeds: string[],
  payload: Record<string, unknown>,
  maxDepth: number,
  maxNodes: number
): GraphData {
  const rawNodes = Array.isArray(payload.nodes) ? payload.nodes : [];
  const rawEdges = Array.isArray(payload.edges) ? payload.edges : [];
  const nodeMap = new Map<string, GraphNode>();
  const edgeMap = new Map<string, GraphEdge>();

  const addNode = (value: unknown, defaultLevel: number, kind?: string) => {
    if (!value || typeof value !== 'object') return;
    const node = value as Record<string, unknown>;
    const idRaw = node.id ?? node.value ?? node.objectId ?? node.address;
    if (typeof idRaw !== 'string') return;
    const id = idRaw.trim();
    if (!id) return;
    if (nodeMap.size >= maxNodes && !nodeMap.has(id)) return;

    const labelRaw = node.label ?? node.name ?? id;
    const levelRaw = node.level;
    const explicitLevel =
      typeof levelRaw === 'number' && Number.isFinite(levelRaw)
        ? Math.max(0, Math.min(levelRaw, maxDepth))
        : defaultLevel;
    const existing = nodeMap.get(id);

    nodeMap.set(id, {
      id,
      label: typeof labelRaw === 'string' && labelRaw.trim() ? labelRaw : id,
      level:
        existing && existing.level < explicitLevel ? existing.level : explicitLevel,
      kind:
        typeof node.kind === 'string'
          ? node.kind
          : existing?.kind ?? kind,
    });
  };

  seeds.forEach((seed) => addNode({ id: seed, label: seed }, 0, 'seed'));
  rawNodes.forEach((node) => addNode(node, 1));

  rawEdges.forEach((edge) => {
    if (!edge || typeof edge !== 'object') return;
    const raw = edge as Record<string, unknown>;
    const from = raw.from ?? raw.source ?? raw.src;
    const to = raw.to ?? raw.target ?? raw.dst;
    if (typeof from !== 'string' || typeof to !== 'string') return;
    const normalizedFrom = from.trim();
    const normalizedTo = to.trim();
    if (!normalizedFrom || !normalizedTo) return;

    addNode({ id: normalizedFrom, label: normalizedFrom }, 0);
    addNode({ id: normalizedTo, label: normalizedTo }, 1);

    if (!nodeMap.has(normalizedFrom) || !nodeMap.has(normalizedTo)) return;
    const relationRaw = raw.relation ?? raw.kind ?? mode;
    const relation =
      typeof relationRaw === 'string' && relationRaw.trim()
        ? relationRaw.trim()
        : mode;
    const key = `${normalizedFrom}->${normalizedTo}:${relation}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, {
        from: normalizedFrom,
        to: normalizedTo,
        relation,
      });
    }
  });

  const leveledNodes = inferLevels(
    Array.from(nodeMap.values()),
    Array.from(edgeMap.values()),
    seeds,
    maxDepth
  );
  const payloadInfo =
    typeof payload.info === 'string' && payload.info.trim()
      ? payload.info.trim()
      : undefined;
  const inferredInfo = inferGraphInfo(payload, nodeMap.size, edgeMap.size, maxNodes);
  const info = [payloadInfo, inferredInfo].filter(Boolean).join(' · ') || undefined;

  return {
    nodes: leveledNodes.slice(0, maxNodes),
    edges: Array.from(edgeMap.values()).slice(0, maxNodes * 3),
    source: 'backend',
    info,
  };
}

function createFallbackGraphData(
  mode: LinkGraphMode,
  seeds: string[],
  maxNodes: number
): GraphData {
  const nodes = seeds.slice(0, maxNodes).map((seed) => ({
    id: seed,
    label: seed,
    level: 0,
    kind: 'seed',
  }));
  return {
    nodes,
    edges: [],
    source: 'fallback',
    info:
      seeds.length > 0
        ? `Backend graph API unavailable. ${mode} seeds rendered locally.`
        : `No ${mode} values provided.`,
  };
}

function inferLevels(
  nodes: GraphNode[],
  edges: GraphEdge[],
  seeds: string[],
  maxDepth: number
): GraphNode[] {
  const nodeMap = new Map(nodes.map((node) => [node.id, { ...node }]));
  const outgoing = new Map<string, string[]>();

  edges.forEach((edge) => {
    if (!outgoing.has(edge.from)) {
      outgoing.set(edge.from, []);
    }
    outgoing.get(edge.from)?.push(edge.to);
  });

  const queue: Array<{ id: string; level: number }> = [];
  const visited = new Set<string>();

  seeds.forEach((seed) => {
    if (!nodeMap.has(seed)) return;
    queue.push({ id: seed, level: 0 });
    visited.add(seed);
    const seedNode = nodeMap.get(seed);
    if (seedNode) seedNode.level = 0;
  });

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    if (current.level >= maxDepth) continue;

    const nextNodes = outgoing.get(current.id) ?? [];
    nextNodes.forEach((nextId) => {
      const nextNode = nodeMap.get(nextId);
      if (!nextNode) return;
      const nextLevel = current.level + 1;
      if (nextNode.level > nextLevel) {
        nextNode.level = nextLevel;
      }
      if (!visited.has(nextId)) {
        visited.add(nextId);
        queue.push({ id: nextId, level: nextLevel });
      }
    });
  }

  return Array.from(nodeMap.values()).map((node) => ({
    ...node,
    level: Math.max(0, Math.min(node.level, maxDepth)),
  }));
}

function buildGraphLayout(graph: GraphData): GraphLayout {
  const levelNodes: Record<number, GraphNode[]> = {};
  graph.nodes.forEach((node) => {
    if (!levelNodes[node.level]) {
      levelNodes[node.level] = [];
    }
    levelNodes[node.level].push(node);
  });

  const levels = Object.keys(levelNodes)
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry))
    .sort((left, right) => left - right);

  const maxRows = levels.reduce((max, level) => {
    const count = levelNodes[level]?.length ?? 0;
    return Math.max(max, count);
  }, 1);

  const width = Math.max(560, levels.length * 230 + 90);
  const height = Math.max(300, maxRows * 92 + 80);
  const positions: Record<string, { x: number; y: number }> = {};

  levels.forEach((level) => {
    const nodes = levelNodes[level] ?? [];
    const levelX = 54 + level * 230;
    const rowSpacing =
      nodes.length <= 1
        ? 0
        : Math.max(72, (height - 110) / Math.max(1, nodes.length - 1));

    nodes.forEach((node, index) => {
      positions[node.id] = {
        x: levelX,
        y: nodes.length <= 1 ? height / 2 : 56 + index * rowSpacing,
      };
    });
  });

  return {
    width,
    height,
    levels,
    levelNodes,
    positions,
  };
}

function truncateNodeLabel(value: string): string {
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-7)}`;
}

function inferGraphInfo(
  payload: Record<string, unknown>,
  nodeCount: number,
  edgeCount: number,
  maxNodes: number
): string | undefined {
  const notes: string[] = [];
  const edgeCap = maxNodes * 3;

  if (payload.truncated === true) {
    notes.push('Graph output is truncated by backend limits.');
  }
  if (
    payload.maxDepthReached === true ||
    payload.depthLimitReached === true ||
    payload.reachedDepthLimit === true
  ) {
    notes.push('Traversal hit depth limit.');
  }
  if (
    payload.maxNodesReached === true ||
    payload.nodeLimitReached === true ||
    payload.reachedNodeLimit === true
  ) {
    notes.push('Traversal hit node limit.');
  }
  if (nodeCount >= maxNodes) {
    notes.push('Rendered node cap reached.');
  }
  if (edgeCount >= edgeCap) {
    notes.push('Rendered edge cap reached.');
  }

  return notes.length > 0 ? Array.from(new Set(notes)).join(' ') : undefined;
}
