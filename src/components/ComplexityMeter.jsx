import { useMemo, useState } from "react";

function computeComplexity(nodes, edges) {
  if (!nodes.length) return null;

  const n = nodes.length;
  const e = edges.length;

  // Build adjacency for analysis
  const outDegree = {};
  const inDegree = {};
  nodes.forEach(node => { outDegree[node.id] = 0; inDegree[node.id] = 0; });
  edges.forEach(edge => {
    const s = typeof edge.source === "object" ? edge.source.id : edge.source;
    const t = typeof edge.target === "object" ? edge.target.id : edge.target;
    outDegree[s] = (outDegree[s] || 0) + 1;
    inDegree[t] = (inDegree[t] || 0) + 1;
  });

  // Branch points = nodes with outDegree > 1
  const branchPoints = Object.values(outDegree).filter(d => d > 1).length;

  // Merge points = nodes with inDegree > 1
  const mergePoints = Object.values(inDegree).filter(d => d > 1).length;

  // Count node types
  const typeCounts = {};
  nodes.forEach(n => { typeCounts[n.type] = (typeCounts[n.type] || 0) + 1; });
  const conflicts = typeCounts["conflict"] || 0;
  const insights = typeCounts["insight"] || 0;
  const conclusions = typeCounts["conclusion"] || 0;

  // Estimate depth via longest path (simple BFS from roots)
  const roots = nodes.filter(nd => (inDegree[nd.id] || 0) === 0).map(nd => nd.id);
  let maxDepth = 0;
  const adjList = {};
  nodes.forEach(nd => { adjList[nd.id] = []; });
  edges.forEach(edge => {
    const s = typeof edge.source === "object" ? edge.source.id : edge.source;
    const t = typeof edge.target === "object" ? edge.target.id : edge.target;
    if (adjList[s]) adjList[s].push(t);
  });

  function bfs(startId) {
    const visited = new Set();
    const queue = [[startId, 0]];
    let depth = 0;
    while (queue.length) {
      const [id, d] = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id);
      depth = Math.max(depth, d);
      (adjList[id] || []).forEach(next => queue.push([next, d + 1]));
    }
    return depth;
  }
  roots.forEach(r => { maxDepth = Math.max(maxDepth, bfs(r)); });
  if (maxDepth === 0 && nodes.length > 0) maxDepth = Math.ceil(Math.log2(nodes.length + 1));

  // Complexity score (0–10)
  const nodeScore   = Math.min(n / 14, 1) * 3;
  const edgeScore   = Math.min(e / 16, 1) * 2;
  const branchScore = Math.min(branchPoints / 3, 1) * 2;
  const conflScore  = Math.min(conflicts / 2, 1) * 1.5;
  const depthScore  = Math.min(maxDepth / 6, 1) * 1.5;
  const raw = nodeScore + edgeScore + branchScore + conflScore + depthScore;
  const score = Math.min(Math.round(raw * 10) / 10, 10);

  return { score, n, e, branchPoints, mergePoints, maxDepth, conflicts, insights, conclusions };
}

const SCORE_COLOR = (s) => {
  if (s >= 8) return "#00ff88";
  if (s >= 6) return "#f59e0b";
  if (s >= 4) return "#60a5fa";
  return "rgba(232,232,240,0.4)";
};

const SCORE_LABEL = (s) => {
  if (s >= 8) return "Deep";
  if (s >= 6) return "Rich";
  if (s >= 4) return "Moderate";
  return "Simple";
};

export default function ComplexityMeter({ nodes, edges, visible }) {
  const [expanded, setExpanded] = useState(false);
  const data = useMemo(() => computeComplexity(nodes, edges), [nodes, edges]);

  if (!visible || !data) return null;

  const color = SCORE_COLOR(data.score);
  const label = SCORE_LABEL(data.score);

  return (
    <div style={{
      position: "absolute",
      top: 70,
      left: 20,
      zIndex: 20,
      pointerEvents: "auto",
    }}>
      {/* Main pill */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(13,13,20,0.92)",
          border: `1px solid ${color}30`,
          borderRadius: 10, padding: "8px 14px",
          backdropFilter: "blur(10px)",
          cursor: "pointer",
          transition: "border-color 0.2s",
          userSelect: "none",
        }}
      >
        {/* Score ring */}
        <svg width={36} height={36}>
          <circle cx={18} cy={18} r={14}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
          <circle cx={18} cy={18} r={14}
            fill="none" stroke={color} strokeWidth={3}
            strokeDasharray={`${2 * Math.PI * 14 * data.score / 10} ${2 * Math.PI * 14}`}
            strokeLinecap="round"
            transform="rotate(-90 18 18)"
            style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: "stroke-dasharray 0.6s ease" }}
          />
          <text x={18} y={22} textAnchor="middle"
            fontSize={11} fontWeight={700}
            fill={color} fontFamily="Syne, sans-serif">
            {data.score}
          </text>
        </svg>

        <div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color, lineHeight: 1 }}>
            {label} reasoning
          </div>
          <div style={{ fontFamily: "Space Mono, monospace", fontSize: 9, color: "rgba(232,232,240,0.35)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            complexity · tap for details
          </div>
        </div>
      </div>

      {/* Expanded breakdown */}
      {expanded && (
        <div style={{
          marginTop: 6,
          background: "rgba(10,10,18,0.96)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 10, padding: "12px 14px",
          backdropFilter: "blur(12px)",
          minWidth: 200,
        }}>
          {[
            { label: "thought nodes",    val: data.n,            color: "#60a5fa" },
            { label: "connections",      val: data.e,            color: "#a78bfa" },
            { label: "branch points",    val: data.branchPoints, color: "#f59e0b" },
            { label: "merge points",     val: data.mergePoints,  color: "#34d399" },
            { label: "reasoning depth",  val: data.maxDepth,     color: "#00ff88" },
            { label: "conflicts found",  val: data.conflicts,    color: "#f87171" },
            { label: "insights formed",  val: data.insights,     color: "#00ff88" },
          ].map(({ label, val, color: c }) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 7,
            }}>
              <span style={{ fontFamily: "Space Mono, monospace", fontSize: 9, color: "rgba(232,232,240,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {label}
              </span>
              <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: c }}>
                {val}
              </span>
            </div>
          ))}

          <div style={{
            marginTop: 10, paddingTop: 8,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            fontFamily: "Space Mono, monospace", fontSize: 9,
            color: "rgba(232,232,240,0.25)", lineHeight: 1.6,
          }}>
            score = nodes + edges +<br />
            branches + conflicts + depth
          </div>
        </div>
      )}
    </div>
  );
}
