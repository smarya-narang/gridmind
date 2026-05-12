import { NODE_TYPES } from "../utils/parser.js";

export default function Legend() {
  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "10px",
      padding: "10px 16px",
      background: "rgba(13,13,20,0.9)",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      backdropFilter: "blur(8px)",
    }}>
      {Object.entries(NODE_TYPES).map(([type, { color, emoji }]) => (
        <div key={type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 22, height: 22, borderRadius: "50%",
            border: `1.5px solid ${color}`,
            background: `${color}18`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, color,
            fontFamily: "Syne, sans-serif", fontWeight: 700,
          }}>
            {emoji}
          </div>
          <span style={{
            fontSize: 10,
            fontFamily: "Space Mono, monospace",
            color: "rgba(232,232,240,0.45)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}>
            {type}
          </span>
        </div>
      ))}
      <div style={{
        marginLeft: "auto",
        fontSize: 10,
        fontFamily: "Space Mono, monospace",
        color: "rgba(232,232,240,0.25)",
        alignSelf: "center",
      }}>
        scroll to zoom · drag to pan · drag nodes
      </div>
    </div>
  );
}
