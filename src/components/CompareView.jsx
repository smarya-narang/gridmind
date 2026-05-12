import { useState, useRef, useCallback } from "react";
import MindGraph from "./MindGraph.jsx";
import { ThoughtParser, SYSTEM_PROMPT } from "../utils/parser.js";

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;

async function streamThoughts(question, onNode, onEdge, onAnswer, onChunk, signal) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST", signal,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1400,
      temperature: 0.85,
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: question },
      ],
    }),
  });
  if (!res.ok) throw new Error("API error");

  const parser = new ThoughtParser(onNode, onEdge, onAnswer, onChunk);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value).split("\n");
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") break;
      try {
        const json = JSON.parse(data);
        const chunk = json.choices?.[0]?.delta?.content || "";
        if (chunk) parser.feed(chunk);
      } catch {}
    }
  }
}

function GraphPanel({ label, nodes, edges, answer, isStreaming, tokenCount, width, height }) {
  const color = label === "A" ? "#00ff88" : "#60a5fa";
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", borderRight: label === "A" ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
      {/* Panel header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 16px",
        background: "rgba(13,13,20,0.8)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />
          <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color }}>
            Run {label}
          </span>
          {isStreaming && (
            <span style={{ fontFamily: "Space Mono, monospace", fontSize: 9, color: "rgba(232,232,240,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              thinking...
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { v: nodes.length, l: "nodes" },
            { v: edges.length, l: "edges" },
            { v: tokenCount, l: "tokens" },
          ].map(({ v, l }) => (
            <div key={l} style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color }}>{v}</div>
              <div style={{ fontFamily: "Space Mono, monospace", fontSize: 8, color: "rgba(232,232,240,0.3)", textTransform: "uppercase" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Graph */}
      <div style={{ flex: 1, position: "relative" }}>
        <MindGraph nodes={nodes} edges={edges} activeNodeId={null} width={width} height={height} />

        {/* Answer */}
        {answer && (
          <div style={{
            position: "absolute", bottom: 16, left: 12, right: 12,
            background: "rgba(10,10,18,0.95)",
            border: `1px solid ${color}25`,
            borderRadius: 10, padding: "12px 14px",
            backdropFilter: "blur(12px)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
              <span style={{ fontFamily: "Space Mono, monospace", fontSize: 9, color: `${color}90`, textTransform: "uppercase", letterSpacing: "0.08em" }}>conclusion</span>
            </div>
            <p style={{ fontFamily: "Syne, sans-serif", fontSize: 12, lineHeight: 1.6, color: "rgba(232,232,240,0.85)", margin: 0 }}>
              {answer}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CompareView({ question, onClose, dims }) {
  const [stateA, setStateA] = useState({ nodes: [], edges: [], answer: "", streaming: true, tokens: 0 });
  const [stateB, setStateB] = useState({ nodes: [], edges: [], answer: "", streaming: true, tokens: 0 });
  const abortRef = useRef(new AbortController());
  const startedRef = useRef(false);

  // Start both streams on mount
  const startCompare = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    const signal = abortRef.current.signal;

    const makeHandlers = (setter) => ({
      onNode: (node) => setter(prev => ({
        ...prev,
        nodes: prev.nodes.find(n => n.id === node.id) ? prev.nodes : [...prev.nodes, node]
      })),
      onEdge: (edge) => setter(prev => ({
        ...prev,
        edges: prev.edges.find(e => `${e.source}-${e.target}` === `${edge.source}-${edge.target}`) ? prev.edges : [...prev.edges, edge]
      })),
      onAnswer: (ans) => setter(prev => ({ ...prev, answer: ans })),
      onChunk: () => setter(prev => ({ ...prev, tokens: prev.tokens + 1 })),
    });

    const ha = makeHandlers(setStateA);
    const hb = makeHandlers(setStateB);

    // Run both in parallel
    await Promise.allSettled([
      streamThoughts(question, ha.onNode, ha.onEdge, ha.onAnswer, ha.onChunk, signal)
        .finally(() => setStateA(p => ({ ...p, streaming: false }))),
      streamThoughts(question, hb.onNode, hb.onEdge, hb.onAnswer, hb.onChunk, signal)
        .finally(() => setStateB(p => ({ ...p, streaming: false }))),
    ]);
  }, [question]);

  // Start on mount
  const hasStarted = useRef(false);
  if (!hasStarted.current) { hasStarted.current = true; startCompare(); }

  function handleClose() {
    abortRef.current.abort();
    onClose();
  }

  const panelW = Math.floor(dims.w / 2);
  const panelH = dims.h - 52 - 40; // subtract topbar + panel header

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "var(--bg)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Compare topbar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: 52,
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(5,5,8,0.95)",
        backdropFilter: "blur(12px)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 15, color: "#e8e8f0" }}>
            Compare Mode
          </span>
          <span style={{
            fontFamily: "Space Mono, monospace", fontSize: 10,
            color: "rgba(232,232,240,0.3)", letterSpacing: "0.06em",
          }}>
            same question · two different reasoning paths
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            fontFamily: "Space Mono, monospace", fontSize: 10,
            color: "rgba(232,232,240,0.4)", maxWidth: 400,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            "{question}"
          </div>
          <button
            onClick={handleClose}
            style={{
              fontFamily: "Space Mono, monospace", fontSize: 11,
              padding: "6px 14px", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent", color: "rgba(232,232,240,0.5)",
              cursor: "pointer",
            }}
          >
            ← back
          </button>
        </div>
      </div>

      {/* Side-by-side panels */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <GraphPanel label="A" {...stateA} isStreaming={stateA.streaming} tokenCount={stateA.tokens} width={panelW} height={panelH} />
        <GraphPanel label="B" {...stateB} isStreaming={stateB.streaming} tokenCount={stateB.tokens} width={panelW} height={panelH} />
      </div>

      {/* Insight bar at bottom */}
      {!stateA.streaming && !stateB.streaming && (
        <div style={{
          padding: "10px 20px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(10,10,18,0.9)",
          display: "flex", gap: 24, alignItems: "center", flexShrink: 0,
        }}>
          <span style={{ fontFamily: "Space Mono, monospace", fontSize: 9, color: "rgba(232,232,240,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            divergence analysis
          </span>
          {[
            { label: "nodes Δ", val: Math.abs(stateA.nodes.length - stateB.nodes.length), color: "#f59e0b" },
            { label: "edges Δ", val: Math.abs(stateA.edges.length - stateB.edges.length), color: "#60a5fa" },
            { label: "run A nodes", val: stateA.nodes.length, color: "#00ff88" },
            { label: "run B nodes", val: stateB.nodes.length, color: "#60a5fa" },
          ].map(({ label, val, color }) => (
            <div key={label}>
              <span style={{ fontFamily: "Space Mono, monospace", fontSize: 9, color: "rgba(232,232,240,0.3)", textTransform: "uppercase", marginRight: 6 }}>{label}</span>
              <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color }}>{val}</span>
            </div>
          ))}
          <span style={{ fontFamily: "Space Mono, monospace", fontSize: 9, color: "rgba(232,232,240,0.2)", marginLeft: "auto" }}>
            AI reasoning is non-deterministic — two runs of the same question produce different thought paths
          </span>
        </div>
      )}
    </div>
  );
}
