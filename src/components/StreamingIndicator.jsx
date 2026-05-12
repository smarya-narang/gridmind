import { useEffect, useState } from "react";

const THINKING_LABELS = [
  "parsing problem space",
  "identifying branches",
  "forming connections",
  "detecting conflicts",
  "synthesising insights",
  "reaching conclusion",
];

export default function StreamingIndicator({ isStreaming, tokenCount, nodeCount }) {
  const [labelIdx, setLabelIdx] = useState(0);

  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      setLabelIdx(i => (i + 1) % THINKING_LABELS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isStreaming]);

  if (!isStreaming) return null;

  return (
    <div style={{
      position: "absolute",
      top: 70,
      right: 20,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 6,
      zIndex: 20,
      pointerEvents: "none",
    }}>
      {/* Pulse + label */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(13,13,20,0.85)",
        border: "1px solid rgba(0,255,136,0.2)",
        borderRadius: 999,
        padding: "5px 12px",
        backdropFilter: "blur(8px)",
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "#00ff88",
          boxShadow: "0 0 8px #00ff88",
          animation: "pulse 1s infinite",
        }} />
        <span style={{
          fontFamily: "Space Mono, monospace",
          fontSize: 10, color: "rgba(0,255,136,0.8)",
          letterSpacing: "0.06em",
          textTransform: "lowercase",
        }}>
          {THINKING_LABELS[labelIdx]}
        </span>
      </div>

      {/* Stats */}
      <div style={{
        display: "flex", gap: 8,
      }}>
        {[
          { val: nodeCount, label: "nodes" },
          { val: tokenCount, label: "tokens" },
        ].map(({ val, label }) => (
          <div key={label} style={{
            background: "rgba(13,13,20,0.8)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 8,
            padding: "4px 10px",
            textAlign: "center",
            backdropFilter: "blur(8px)",
          }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 15, color: "#e8e8f0" }}>{val}</div>
            <div style={{ fontFamily: "Space Mono, monospace", fontSize: 9, color: "rgba(232,232,240,0.3)", textTransform: "uppercase" }}>{label}</div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
