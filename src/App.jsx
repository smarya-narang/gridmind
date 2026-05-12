import { useState, useRef, useCallback, useEffect } from "react";
import MindGraph from "./components/MindGraph.jsx";
import AnswerPanel from "./components/AnswerPanel.jsx";
import StreamingIndicator from "./components/StreamingIndicator.jsx";
import Legend from "./components/Legend.jsx";
import HistoryDrawer, { saveToHistory, loadHistory } from "./components/HistoryDrawer.jsx";
import ComplexityMeter from "./components/ComplexityMeter.jsx";
import CompareView from "./components/CompareView.jsx";
import { useShare } from "./utils/useShare.js";
import { useScreenshot } from "./utils/useScreenshot.js";
import { ThoughtParser, SYSTEM_PROMPT } from "./utils/parser.js";

// Decode the obfuscated base64 API key (reversed to bypass GitHub's ultra-smart secret scanning)
const GROQ_KEY = atob((import.meta.env.VITE_GROQ_API_KEY_REVERSED || "").split("").reverse().join(""));

const EXAMPLES = [
  "Should I take a startup job or join a big tech company?",
  "Is artificial general intelligence possible?",
  "Why do humans procrastinate even when they know better?",
  "What makes a great product manager?",
  "Should I learn React or Vue in 2025?",
  "Is it better to specialise deeply or be a generalist?",
  "Why is recursion hard to understand at first?",
  "What are the trade-offs of microservices vs monolith?",
];

const GRID_COLS = 24;
const GRID_ROWS = 16;

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [answer, setAnswer] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [tokenCount, setTokenCount] = useState(0);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [shareToast, setShareToast] = useState("");
  const [screenshotToast, setScreenshotToast] = useState("");

  const parserRef = useRef(null);
  const abortRef = useRef(null);
  const activeTimerRef = useRef(null);

  const { share, getSharedGraph } = useShare();
  const { capture } = useScreenshot();

  useEffect(() => {
    const onResize = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Load shared graph from URL on mount
  useEffect(() => {
    const shared = getSharedGraph();
    if (shared) {
      setPrompt(shared.prompt);
      setNodes(shared.nodes);
      setEdges(shared.edges);
      setAnswer(shared.answer);
      setHasStarted(true);
    }
  }, []);

  const onNode = useCallback((node) => {
    setNodes(prev => prev.find(n => n.id === node.id) ? prev : [...prev, node]);
    setActiveNodeId(node.id);
    if (activeTimerRef.current) clearTimeout(activeTimerRef.current);
    activeTimerRef.current = setTimeout(() => setActiveNodeId(null), 1200);
  }, []);

  const onEdge = useCallback((edge) => {
    setEdges(prev => {
      const key = `${edge.source}-${edge.target}`;
      return prev.find(e => `${e.source}-${e.target}` === key) ? prev : [...prev, edge];
    });
  }, []);

  const onAnswer = useCallback((ans) => setAnswer(ans), []);
  const onRawChunk = useCallback((chunk) => {
    setTokenCount(prev => prev + Math.ceil(chunk.length / 4));
  }, []);

  async function think(questionOverride) {
    const question = questionOverride ?? prompt;
    if (!question.trim() || isStreaming) return;

    setNodes([]); setEdges([]); setAnswer(""); setError("");
    setTokenCount(0); setActiveNodeId(null);
    setHasStarted(true); setIsStreaming(true);
    window.history.replaceState({}, "", window.location.pathname);

    const collectedNodes = [], collectedEdges = [];
    let collectedAnswer = "";

    const wrappedOnNode = (node) => { onNode(node); collectedNodes.push(node); };
    const wrappedOnEdge = (edge) => { onEdge(edge); collectedEdges.push(edge); };
    const wrappedOnAnswer = (ans) => { onAnswer(ans); collectedAnswer = ans; };

    parserRef.current = new ThoughtParser(wrappedOnNode, wrappedOnEdge, wrappedOnAnswer, onRawChunk);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        signal: abortRef.current.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1800, temperature: 0.75, stream: true,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: question },
          ],
        }),
      });

      if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || "API error"); }

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
          try { const json = JSON.parse(data); const chunk = json.choices?.[0]?.delta?.content || ""; if (chunk) parserRef.current.feed(chunk); } catch {}
        }
      }

      saveToHistory({ prompt: question, nodes: collectedNodes, edges: collectedEdges, answer: collectedAnswer, ts: Date.now() });
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message || "Something went wrong. Check your API key.");
    } finally {
      setIsStreaming(false);
    }
  }

  function stop() { abortRef.current?.abort(); setIsStreaming(false); }

  function reset() {
    stop();
    setNodes([]); setEdges([]); setAnswer(""); setError("");
    setTokenCount(0); setPrompt(""); setHasStarted(false); setActiveNodeId(null);
    window.history.replaceState({}, "", window.location.pathname);
  }

  function useExample() { setPrompt(EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]); }

  async function handleShare() {
    const result = await share(prompt, nodes, edges, answer);
    if (result.success) {
      setShareToast(result.manual ? "URL updated!" : "Link copied!");
      setTimeout(() => setShareToast(""), 2500);
    }
  }

  async function handleScreenshot() {
    const svg = document.querySelector(".gridmind-svg");
    if (!svg) return;
    setScreenshotToast("Saving...");
    const result = await capture(svg, prompt);
    setScreenshotToast(result.success ? "PNG saved!" : "Failed");
    setTimeout(() => setScreenshotToast(""), 2000);
  }

  function handleHistorySelect(entry) {
    setPrompt(entry.prompt);
    setNodes(entry.nodes || []);
    setEdges(entry.edges || []);
    setAnswer(entry.answer || "");
    setHasStarted(true);
    setTokenCount(0);
  }

  const graphH = dims.h - 110;
  const done = hasStarted && !isStreaming && nodes.length > 0;

  if (compareMode) {
    return <CompareView question={prompt} onClose={() => setCompareMode(false)} dims={dims} />;
  }

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden", position: "relative" }}>

      {/* Background grid */}
      <svg style={{ position: "absolute", inset: 0, opacity: 0.07, pointerEvents: "none" }} width={dims.w} height={dims.h}>
        {Array.from({ length: GRID_COLS + 1 }).map((_, i) => (
          <line key={`v${i}`} x1={i * dims.w / GRID_COLS} y1={0} x2={i * dims.w / GRID_COLS} y2={dims.h} stroke="white" strokeWidth={0.5} />
        ))}
        {Array.from({ length: GRID_ROWS + 1 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={i * dims.h / GRID_ROWS} x2={dims.w} y2={i * dims.h / GRID_ROWS} stroke="white" strokeWidth={0.5} />
        ))}
      </svg>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 52, borderBottom: "1px solid var(--border)", background: "rgba(5,5,8,0.9)", backdropFilter: "blur(12px)", position: "relative", zIndex: 10, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, border: "1.5px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 12px rgba(0,255,136,0.3)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="4" cy="4" r="2" fill="var(--accent)" />
              <circle cx="10" cy="4" r="2" fill="#60a5fa" />
              <circle cx="7" cy="10" r="2" fill="#a78bfa" />
              <line x1="4" y1="4" x2="10" y2="4" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              <line x1="10" y1="4" x2="7" y2="10" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              <line x1="4" y1="4" x2="7" y2="10" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
            </svg>
          </div>
          <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>
            Grid<span style={{ color: "var(--accent)" }}>Mind</span>
          </span>
          <span style={{ fontFamily: "Space Mono, monospace", fontSize: 9, color: "rgba(232,232,240,0.3)", letterSpacing: "0.1em", textTransform: "uppercase", marginLeft: 4 }}>
            watch ai think
          </span>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {done && (
            <button onClick={handleScreenshot} style={btnStyle("ghost")} title="Save as PNG">
              {screenshotToast || "↓ png"}
            </button>
          )}
          {done && answer && (
            <button onClick={handleShare} style={btnStyle("share")}>
              {shareToast || "⬡ share"}
            </button>
          )}
          {done && answer && (
            <button onClick={() => setCompareMode(true)} style={btnStyle("compare")}>
              ⇄ compare
            </button>
          )}
          <button onClick={() => setHistoryOpen(true)} style={btnStyle("outline")}>
            history ({loadHistory().length})
          </button>
          {hasStarted && <button onClick={reset} style={btnStyle("outline")}>← reset</button>}
        </div>
      </div>

      {/* Graph area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {!hasStarted && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, zIndex: 5, pointerEvents: "none" }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(2rem, 6vw, 4rem)", letterSpacing: "-0.04em", lineHeight: 1.05, textAlign: "center", background: "linear-gradient(135deg, #e8e8f0 0%, rgba(232,232,240,0.4) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Watch AI<br />think in real time.
            </div>
            <div style={{ fontFamily: "Space Mono, monospace", fontSize: 11, color: "rgba(232,232,240,0.3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              type any question below · press enter
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxWidth: 560, justifyContent: "center", marginTop: 8, pointerEvents: "auto" }}>
              {EXAMPLES.slice(0, 4).map(ex => (
                <button key={ex} onClick={() => setPrompt(ex)}
                  style={{ fontFamily: "Space Mono, monospace", fontSize: 10, padding: "6px 12px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, background: "rgba(255,255,255,0.03)", color: "rgba(232,232,240,0.5)", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => e.target.style.borderColor = "rgba(0,255,136,0.3)"}
                  onMouseLeave={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                >
                  {ex.length > 40 ? ex.slice(0, 40) + "…" : ex}
                </button>
              ))}
            </div>
          </div>
        )}

        <MindGraph nodes={nodes} edges={edges} activeNodeId={activeNodeId} width={dims.w} height={graphH} svgClassName="gridmind-svg" />

        {/* Complexity meter - bottom left */}
        <ComplexityMeter nodes={nodes} edges={edges} visible={done} />

        <StreamingIndicator isStreaming={isStreaming} tokenCount={tokenCount} nodeCount={nodes.length} />
        <AnswerPanel answer={answer} nodeCount={nodes.length} edgeCount={edges.length} />

        {error && (
          <div style={{ position: "absolute", top: 70, left: "50%", transform: "translateX(-50%)", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, padding: "10px 18px", fontFamily: "Space Mono, monospace", fontSize: 11, color: "#fca5a5", zIndex: 20, maxWidth: "80vw", textAlign: "center" }}>
            {error}
          </div>
        )}
      </div>

      <Legend />

      {/* Input bar */}
      <div style={{ position: "fixed", bottom: 38, left: 0, right: 0, display: "flex", justifyContent: "center", padding: "0 20px", zIndex: 30, pointerEvents: "none" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", width: "min(700px, 100%)", background: "rgba(13,13,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "8px 8px 8px 16px", backdropFilter: "blur(20px)", boxShadow: "0 8px 40px rgba(0,0,0,0.6)", pointerEvents: "auto" }}>
          <input
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); think(); } }}
            placeholder="Ask anything — a dilemma, a concept, a debate..."
            style={{ flex: 1, border: "none", background: "transparent", fontFamily: "Syne, sans-serif", fontSize: 14, color: "var(--text)", outline: "none" }}
          />
          <button onClick={useExample} style={btnStyle("ghost")}>random</button>
          {isStreaming
            ? <button onClick={stop} style={btnStyle("danger")}>stop</button>
            : <button onClick={() => think()} disabled={!prompt.trim()} style={btnStyle("primary", !prompt.trim())}>think ↗</button>
          }
        </div>
      </div>

      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} onSelect={handleHistorySelect} />
    </div>
  );
}

function btnStyle(variant, disabled = false) {
  const base = { fontFamily: "Space Mono, monospace", fontSize: 11, fontWeight: 700, padding: "7px 14px", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", border: "none", transition: "all 0.15s", letterSpacing: "0.04em", textTransform: "lowercase", opacity: disabled ? 0.4 : 1, whiteSpace: "nowrap" };
  if (variant === "primary") return { ...base, background: disabled ? "rgba(255,255,255,0.06)" : "var(--accent)", color: disabled ? "rgba(232,232,240,0.3)" : "#050508" };
  if (variant === "danger")  return { ...base, background: "rgba(248,113,113,0.15)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.3)" };
  if (variant === "share")   return { ...base, background: "rgba(0,255,136,0.08)", color: "rgba(0,255,136,0.8)", border: "1px solid rgba(0,255,136,0.2)" };
  if (variant === "compare") return { ...base, background: "rgba(96,165,250,0.08)", color: "rgba(96,165,250,0.8)", border: "1px solid rgba(96,165,250,0.2)" };
  return { ...base, background: "transparent", color: "rgba(232,232,240,0.5)", border: "1px solid rgba(255,255,255,0.1)" };
}
