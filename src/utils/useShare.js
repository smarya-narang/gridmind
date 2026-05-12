/**
 * useShare — encodes the current graph state into a shareable URL.
 * No backend needed. State is base64-encoded into a URL param.
 * URL format: gridmind.vercel.app/?g=<base64>
 */

export function encodeGraph(prompt, nodes, edges, answer) {
  const payload = {
    p: prompt,
    n: nodes.map(n => ({ i: n.id, l: n.label, t: n.type })),
    e: edges.map(e => ({
      s: typeof e.source === "object" ? e.source.id : e.source,
      t: typeof e.target === "object" ? e.target.id : e.target,
    })),
    a: answer,
  };
  try {
    return btoa(encodeURIComponent(JSON.stringify(payload)));
  } catch {
    return null;
  }
}

export function decodeGraph(encoded) {
  try {
    const payload = JSON.parse(decodeURIComponent(atob(encoded)));
    return {
      prompt: payload.p,
      nodes: payload.n.map(n => ({ id: n.i, label: n.l, type: n.t, index: 0 })),
      edges: payload.e.map(e => ({ source: e.s, target: e.t })),
      answer: payload.a,
    };
  } catch {
    return null;
  }
}

export function useShare() {
  async function share(prompt, nodes, edges, answer) {
    const encoded = encodeGraph(prompt, nodes, edges, answer);
    if (!encoded) return { success: false, error: "Encoding failed" };

    const url = `${window.location.origin}${window.location.pathname}?g=${encoded}`;

    try {
      await navigator.clipboard.writeText(url);
      return { success: true, url };
    } catch {
      // Fallback — update URL bar so user can copy manually
      window.history.replaceState({}, "", `?g=${encoded}`);
      return { success: true, url, manual: true };
    }
  }

  function getSharedGraph() {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("g");
    if (!encoded) return null;
    return decodeGraph(encoded);
  }

  return { share, getSharedGraph };
}
