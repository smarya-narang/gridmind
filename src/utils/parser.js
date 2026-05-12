/**
 * Parses streamed AI output for thought nodes and connections.
 *
 * The AI is prompted to emit thoughts in this format:
 *   <t id="1" type="question">What kind of problem is this?</t>
 *   <c from="1" to="2"/>
 *   <t id="2" type="branch">It could be a trade-off analysis</t>
 *   <ans>Final answer text here</ans>
 *
 * Types: question | branch | insight | conflict | conclusion | fact
 */

export const NODE_TYPES = {
  question:   { color: "#60a5fa", emoji: "?" },
  branch:     { color: "#f59e0b", emoji: "⟶" },
  insight:    { color: "#00ff88", emoji: "✦" },
  conflict:   { color: "#f87171", emoji: "≠" },
  conclusion: { color: "#a78bfa", emoji: "◉" },
  fact:       { color: "#34d399", emoji: "·" },
};

export class ThoughtParser {
  constructor(onNode, onEdge, onAnswer, onRawChunk) {
    this.onNode = onNode;
    this.onEdge = onEdge;
    this.onAnswer = onAnswer;
    this.onRawChunk = onRawChunk;
    this.buffer = "";
    this.nodeCount = 0;
  }

  feed(chunk) {
    this.buffer += chunk;
    this.onRawChunk?.(chunk);
    this._parse();
  }

  _parse() {
    // Extract complete thought tags  <t id="x" type="y">text</t>
    const thoughtRe = /<t\s+id="(\d+)"\s+type="([^"]+)">([^<]*)<\/t>/g;
    let match;
    while ((match = thoughtRe.exec(this.buffer)) !== null) {
      const [full, id, type, text] = match;
      if (text.trim()) {
        this.onNode({
          id: `n${id}`,
          label: text.trim(),
          type: type in NODE_TYPES ? type : "insight",
          index: this.nodeCount++,
        });
      }
      // Remove processed tag from buffer start area to avoid reprocessing
    }

    // Extract connection tags  <c from="x" to="y"/>
    const connRe = /<c\s+from="(\d+)"\s+to="(\d+)"\/>/g;
    while ((match = connRe.exec(this.buffer)) !== null) {
      this.onEdge({ source: `n${match[1]}`, target: `n${match[2]}` });
    }

    // Extract answer  <ans>...</ans>
    const ansRe = /<ans>([\s\S]*?)<\/ans>/;
    const ansMatch = this.buffer.match(ansRe);
    if (ansMatch) {
      this.onAnswer(ansMatch[1].trim());
    }

    // Keep only the tail of the buffer to catch tags split across chunks
    if (this.buffer.length > 4000) {
      this.buffer = this.buffer.slice(-500);
    }
  }

  reset() {
    this.buffer = "";
    this.nodeCount = 0;
  }
}

export const SYSTEM_PROMPT = `You are a reasoning engine that thinks out loud in a structured XML format.
When given a question or problem, you MUST reason through it step by step using ONLY this XML format:

<t id="1" type="question">Identify what kind of problem this is</t>
<c from="1" to="2"/>
<t id="2" type="branch">First major angle or consideration</t>
<c from="2" to="3"/>
<t id="3" type="fact">A relevant fact or data point</t>
<c from="2" to="4"/>
<t id="4" type="insight">A deeper insight or implication</t>
<c from="4" to="5"/>
<t id="5" type="conflict">A tension, trade-off, or counter-argument</t>
<c from="3" to="6"/>
<c from="5" to="6"/>
<t id="6" type="conclusion">The resolution or final reasoning</t>
<ans>Your complete, well-written final answer here in plain English — 2-4 sentences.</ans>

RULES:
- Use EXACTLY this XML format. No prose outside the tags.
- Generate 8-14 thought nodes minimum. More is better — show rich reasoning.
- Each <t> text must be SHORT — max 8 words. Punchy. Fragment-style.
- Valid types: question, branch, insight, conflict, fact, conclusion
- Connections can branch (one node connecting to multiple) and merge (multiple connecting to one)
- Create interesting graph shapes — not just a linear chain
- The <ans> tag comes LAST and contains the full readable answer
- Do NOT add any text, explanation, or markdown outside the XML tags`;
