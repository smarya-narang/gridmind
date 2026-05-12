/**
 * useScreenshot — exports the D3 SVG graph as a PNG download.
 * Uses native SVG serialization — no external library needed.
 * Works by: SVG → blob → canvas → PNG download.
 */

export function useScreenshot() {
  async function capture(svgElement, prompt) {
    if (!svgElement) return { success: false, error: "No SVG found" };

    try {
      // Clone SVG and embed fonts + styles inline
      const clone = svgElement.cloneNode(true);
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

      // Set dark background on clone
      clone.style.background = "#050508";
      const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bgRect.setAttribute("width", "100%");
      bgRect.setAttribute("height", "100%");
      bgRect.setAttribute("fill", "#050508");
      clone.insertBefore(bgRect, clone.firstChild);

      // Add watermark
      const wm = document.createElementNS("http://www.w3.org/2000/svg", "text");
      wm.setAttribute("x", "20");
      wm.setAttribute("y", String(Number(svgElement.getAttribute("height")) - 16));
      wm.setAttribute("fill", "rgba(255,255,255,0.2)");
      wm.setAttribute("font-size", "11");
      wm.setAttribute("font-family", "monospace");
      wm.textContent = "GridMind — Watch AI Think";
      clone.appendChild(wm);

      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(clone);
      const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      // SVG → Canvas → PNG
      const img = new Image();
      img.src = url;

      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });

      const canvas = document.createElement("canvas");
      const scale = 2; // retina
      canvas.width = svgElement.clientWidth * scale;
      canvas.height = svgElement.clientHeight * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.fillStyle = "#050508";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      // Download PNG
      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      const filename = `gridmind-${(prompt || "graph").slice(0, 30).replace(/\s+/g, "-").toLowerCase()}.png`;
      a.download = filename;
      a.href = pngUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      return { success: true };
    } catch (e) {
      console.error("Screenshot failed:", e);
      return { success: false, error: e.message };
    }
  }

  return { capture };
}
