import { useEffect, useState } from "react";

export default function AnswerPanel({ answer, nodeCount, edgeCount }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (answer) {
      setTimeout(() => setVisible(true), 300);
    } else {
      setVisible(false);
    }
  }, [answer]);

  if (!answer) return null;

  return (
    <div style={{
      position: "absolute",
      bottom: 70,
      left: "50%",
      transform: `translateX(-50%) translateY(${visible ? "0" : "20px"})`,
      opacity: visible ? 1 : 0,
      transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
      width: "min(600px, 90vw)",
      zIndex: 20,
      pointerEvents: visible ? "auto" : "none",
    }}>
      <div style={{
        background: "rgba(10,10,18,0.96)",
        border: "1px solid rgba(167,139,250,0.3)",
        borderRadius: 16,
        padding: "20px 24px",
        backdropFilter: "blur(20px)",
        boxShadow: "0 0 40px rgba(124,58,237,0.15), 0 20px 60px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          marginBottom: 14,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "#a78bfa",
            boxShadow: "0 0 8px #a78bfa",
          }} />
          <span style={{
            fontFamily: "Space Mono, monospace",
            fontSize: 10, letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(167,139,250,0.8)",
          }}>
            conclusion reached
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
            {[
              { label: "thoughts", val: nodeCount },
              { label: "connections", val: edgeCount },
            ].map(({ label, val }) => (
              <div key={label} style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: "#e8e8f0" }}>{val}</div>
                <div style={{ fontFamily: "Space Mono, monospace", fontSize: 9, color: "rgba(232,232,240,0.3)", textTransform: "uppercase" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Answer text */}
        <p style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 14,
          lineHeight: 1.7,
          color: "rgba(232,232,240,0.9)",
          margin: 0,
        }}>
          {answer}
        </p>
      </div>
    </div>
  );
}
