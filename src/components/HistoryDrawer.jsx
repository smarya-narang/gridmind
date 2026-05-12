import { useEffect, useState } from "react";

const STORAGE_KEY = "gridmind_history";
const MAX_HISTORY = 15;

export function saveToHistory(entry) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const updated = [entry, ...existing.filter(e => e.prompt !== entry.prompt)].slice(0, MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

// Mini SVG preview of a graph
function MiniGraph({ nodes, edges }) {
  if (!nodes || nodes.length === 0) return (
    <div style={{ width: 60, height: 44, background: "rgba(255,255,255,0.03)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>—</span>
    </div>
  );

  // Simple circular layout for mini preview
  const cx = 30, cy = 22, r = 16;
  const positions = nodes.slice(0, 8).map((_, i, arr) => ({
    x: cx + r * Math.cos((2 * Math.PI * i) / arr.length - Math.PI / 2),
    y: cy + r * Math.sin((2 * Math.PI * i) / arr.length - Math.PI / 2),
  }));

  const NODE_COLORS = {
    question: "#60a5fa", branch: "#f59e0b", insight: "#00ff88",
    conflict: "#f87171", conclusion: "#a78bfa", fact: "#34d399",
  };

  const idToIdx = {};
  nodes.slice(0, 8).forEach((n, i) => { idToIdx[n.id] = i; });

  return (
    <svg width={60} height={44} style={{ flexShrink: 0 }}>
      {edges.slice(0, 10).map((e, i) => {
        const si = idToIdx[typeof e.source === "object" ? e.source.id : e.source];
        const ti = idToIdx[typeof e.target === "object" ? e.target.id : e.target];
        if (si === undefined || ti === undefined) return null;
        return (
          <line key={i}
            x1={positions[si].x} y1={positions[si].y}
            x2={positions[ti].x} y2={positions[ti].y}
            stroke="rgba(255,255,255,0.15)" strokeWidth={0.8} />
        );
      })}
      {nodes.slice(0, 8).map((n, i) => (
        <circle key={n.id}
          cx={positions[i].x} cy={positions[i].y} r={4}
          fill={NODE_COLORS[n.type] || "#60a5fa"}
          opacity={0.9} />
      ))}
    </svg>
  );
}

export default function HistoryDrawer({ open, onClose, onSelect }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (open) setHistory(loadHistory());
  }, [open]);

  function handleClear() {
    clearHistory();
    setHistory([]);
  }

  const s = {
    overlay: {
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.5)",
      opacity: open ? 1 : 0,
      pointerEvents: open ? "auto" : "none",
      transition: "opacity 0.2s",
      backdropFilter: open ? "blur(4px)" : "none",
    },
    drawer: {
      position: "fixed", top: 0, right: 0, bottom: 0,
      width: 340, zIndex: 201,
      background: "#0a0a12",
      borderLeft: "1px solid rgba(255,255,255,0.07)",
      transform: open ? "translateX(0)" : "translateX(100%)",
      transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      display: "flex", flexDirection: "column",
    },
    header: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 16px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    },
    headerLeft: { display: "flex", flexDirection: "column", gap: 2 },
    headerTitle: {
      fontFamily: "Syne, sans-serif", fontWeight: 800,
      fontSize: 14, color: "#e8e8f0",
    },
    headerSub: {
      fontFamily: "Space Mono, monospace", fontSize: 9,
      color: "rgba(232,232,240,0.3)", textTransform: "uppercase",
      letterSpacing: "0.08em",
    },
    headerRight: { display: "flex", gap: 6, alignItems: "center" },
    clearBtn: {
      fontFamily: "Space Mono, monospace", fontSize: 10,
      padding: "4px 10px", borderRadius: 6,
      border: "1px solid rgba(248,113,113,0.2)",
      background: "transparent", color: "rgba(248,113,113,0.6)",
      cursor: "pointer",
    },
    closeBtn: {
      fontFamily: "Syne, sans-serif", fontSize: 16,
      background: "transparent", border: "none",
      color: "rgba(232,232,240,0.35)", cursor: "pointer",
      padding: "2px 6px",
    },
    list: { flex: 1, overflowY: "auto", padding: "10px 10px" },
    empty: {
      textAlign: "center", padding: "3rem 1rem",
      fontFamily: "Space Mono, monospace", fontSize: 11,
      color: "rgba(232,232,240,0.2)", lineHeight: 1.8,
    },
    item: {
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 10px", borderRadius: 10,
      cursor: "pointer", marginBottom: 6,
      border: "1px solid rgba(255,255,255,0.05)",
      background: "rgba(255,255,255,0.02)",
      transition: "all 0.15s",
    },
    itemText: { flex: 1, overflow: "hidden" },
    itemPrompt: {
      fontFamily: "Syne, sans-serif", fontSize: 12,
      fontWeight: 600, color: "#e8e8f0",
      whiteSpace: "nowrap", overflow: "hidden",
      textOverflow: "ellipsis", marginBottom: 3,
    },
    itemMeta: {
      fontFamily: "Space Mono, monospace", fontSize: 9,
      color: "rgba(232,232,240,0.3)",
    },
    footer: {
      padding: "10px 16px",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      fontFamily: "Space Mono, monospace", fontSize: 9,
      color: "rgba(232,232,240,0.2)", textAlign: "center",
    },
  };

  return (
    <>
      <div style={s.overlay} onClick={onClose} />
      <div style={s.drawer}>
        <div style={s.header}>
          <div style={s.headerLeft}>
            <span style={s.headerTitle}>History</span>
            <span style={s.headerSub}>{history.length} questions stored</span>
          </div>
          <div style={s.headerRight}>
            {history.length > 0 && (
              <button style={s.clearBtn} onClick={handleClear}>clear all</button>
            )}
            <button style={s.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        <div style={s.list}>
          {history.length === 0 ? (
            <div style={s.empty}>
              No questions yet.<br />
              Ask GridMind something<br />and it'll appear here.
            </div>
          ) : (
            history.map((entry, i) => (
              <div
                key={i}
                style={s.item}
                onClick={() => { onSelect(entry); onClose(); }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                }}
              >
                <MiniGraph nodes={entry.nodes} edges={entry.edges} />
                <div style={s.itemText}>
                  <div style={s.itemPrompt}>{entry.prompt}</div>
                  <div style={s.itemMeta}>
                    {entry.nodes?.length ?? 0} nodes · {entry.edges?.length ?? 0} edges · {entry.ts ? new Date(entry.ts).toLocaleDateString() : ""}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={s.footer}>
          stored locally · never leaves your browser
        </div>
      </div>
    </>
  );
}
