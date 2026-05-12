import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { NODE_TYPES } from "../utils/parser.js";

export default function MindGraph({ nodes, edges, activeNodeId, width, height, svgClassName }) {
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const gRef = useRef(null);
  const nodeMapRef = useRef(new Map());
  const edgeListRef = useRef([]);

  // Init SVG + simulation once
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const defs = svg.append("defs");
    Object.entries(NODE_TYPES).forEach(([type, { color }]) => {
      const f = defs.append("filter")
        .attr("id", `glow-${type}`)
        .attr("x", "-60%").attr("y", "-60%")
        .attr("width", "220%").attr("height", "220%");
      f.append("feGaussianBlur").attr("stdDeviation", "8").attr("result", "blur");
      const m = f.append("feMerge");
      m.append("feMergeNode").attr("in", "blur");
      m.append("feMergeNode").attr("in", "SourceGraphic");
    });

    defs.append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 30).attr("refY", 0)
      .attr("markerWidth", 5).attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path").attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "rgba(255,255,255,0.25)");

    const g = svg.append("g");
    gRef.current = g;

    svg.call(
      d3.zoom().scaleExtent([0.2, 4]).on("zoom", e => g.attr("transform", e.transform))
    );

    const sim = d3.forceSimulation([])
      .force("link", d3.forceLink([]).id(d => d.id).distance(130).strength(0.5))
      .force("charge", d3.forceManyBody().strength(-350))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide(58))
      .alphaDecay(0.025)
      .on("tick", () => {
        g.selectAll(".gm-link")
          .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
        g.selectAll(".gm-node")
          .attr("transform", d => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

    simRef.current = sim;
    return () => sim.stop();
  }, [width, height]);

  // Update whenever nodes/edges props change
  useEffect(() => {
    if (!simRef.current || !gRef.current) return;
    const sim = simRef.current;
    const g = gRef.current;
    const nodeMap = nodeMapRef.current;
    const edgeList = edgeListRef.current;

    // Add new nodes
    let changed = false;
    nodes.forEach(n => {
      if (!nodeMap.has(n.id)) {
        nodeMap.set(n.id, {
          ...n,
          x: width / 2 + (Math.random() - 0.5) * 180,
          y: height / 2 + (Math.random() - 0.5) * 180,
          vx: 0, vy: 0,
        });
        changed = true;
      }
    });

    // Add new edges - only when BOTH endpoints exist
    edges.forEach(e => {
      const src = nodeMap.get(e.source);
      const tgt = nodeMap.get(e.target);
      if (!src || !tgt) return;
      const key = `${e.source}to${e.target}`;
      if (edgeList.find(l => l._key === key)) return;
      edgeList.push({ _key: key, source: src, target: tgt });
      changed = true;
    });

    if (!changed) return;

    // Render links
    g.selectAll(".gm-link")
      .data(edgeList, d => d._key)
      .join(enter =>
        enter.append("line")
          .attr("class", "gm-link")
          .attr("stroke", "rgba(255,255,255,0.18)")
          .attr("stroke-width", 1.5)
          .attr("marker-end", "url(#arrow)")
          .attr("opacity", 0)
          .call(s => s.transition().duration(500).attr("opacity", 1))
      );

    const nodesArr = Array.from(nodeMap.values());
    const color = d => NODE_TYPES[d.type]?.color ?? "#60a5fa";

    // Render nodes
    g.selectAll(".gm-node")
      .data(nodesArr, d => d.id)
      .join(enter => {
        const grp = enter.append("g")
          .attr("class", "gm-node")
          .attr("cursor", "grab")
          .attr("opacity", 0)
          .call(s => s.transition().duration(400).attr("opacity", 1))
          .call(
            d3.drag()
              .on("start", (ev, d) => {
                if (!ev.active) sim.alphaTarget(0.3).restart();
                d.fx = d.x; d.fy = d.y;
              })
              .on("drag", (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
              .on("end", (ev, d) => {
                if (!ev.active) sim.alphaTarget(0);
                d.fx = null; d.fy = null;
              })
          );

        grp.append("circle").attr("r", 34)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 0.8)
          .attr("opacity", 0.18)
          .attr("filter", d => `url(#glow-${d.type})`);

        grp.append("circle").attr("r", 24)
          .attr("fill", d => `${color(d)}15`)
          .attr("stroke", color)
          .attr("stroke-width", 1.5)
          .attr("class", "gm-circle");

        grp.append("text")
          .attr("text-anchor", "middle").attr("dy", "-1px")
          .attr("font-size", "13px").attr("font-family", "Syne, sans-serif")
          .attr("font-weight", "700").attr("fill", color)
          .attr("pointer-events", "none")
          .text(d => NODE_TYPES[d.type]?.emoji ?? ".");

        grp.append("text")
          .attr("text-anchor", "middle").attr("dy", "11px")
          .attr("font-size", "8px").attr("font-family", "Space Mono, monospace")
          .attr("fill", "rgba(255,255,255,0.3)").attr("pointer-events", "none")
          .text(d => d.id.replace("n", "#"));

        grp.append("text")
          .attr("y", 38)
          .attr("font-family", "Space Mono, monospace")
          .attr("font-size", "8.5px")
          .attr("fill", "rgba(232,232,240,0.7)")
          .attr("text-anchor", "middle")
          .each(function(d) {
            const el = d3.select(this);
            const words = (d.label || "").toString().split(/\s+/);
            const lines = [];
            let currentLine = [];
            words.forEach(w => {
               if (currentLine.join(" ").length + w.length > 18) {
                   if (currentLine.length > 0) lines.push(currentLine.join(" "));
                   currentLine = [w];
               } else {
                   currentLine.push(w);
               }
            });
            if (currentLine.length) lines.push(currentLine.join(" "));
            
            lines.forEach((l, i) => {
               el.append("tspan")
                 .attr("x", 0)
                 .attr("dy", i === 0 ? 0 : 11)
                 .text(l);
            });
          });

        return grp;
      });

    // Highlight active node
    g.selectAll(".gm-circle")
      .attr("stroke-width", d => d.id === activeNodeId ? 2.5 : 1.5)
      .attr("fill", d => {
        const c = NODE_TYPES[d.type]?.color ?? "#60a5fa";
        return d.id === activeNodeId ? `${c}30` : `${c}15`;
      });

    sim.nodes(nodesArr);
    sim.force("link").links(edgeList);
    sim.alpha(0.6).restart();

  }, [nodes, edges, activeNodeId, width, height]);

  // Clear on reset
  useEffect(() => {
    if (nodes.length === 0) {
      nodeMapRef.current.clear();
      edgeListRef.current.length = 0;
      gRef.current?.selectAll("*").remove();
      simRef.current?.stop();
    }
  }, [nodes.length]);

  return (
    <svg
      ref={svgRef}
      className={svgClassName}
      width={width}
      height={height}
      style={{ display: "block", background: "transparent" }}
    />
  );
}
