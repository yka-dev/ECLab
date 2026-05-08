import React, { useState } from "react";
import type { Netlist, SimResult, GraphConfig } from "../types";
import { UI } from "../constants";
import { uid } from "../utils";
import { GraphView } from "./GraphView";

interface GraphPanelProps {
  liveNetlist: Netlist;
  simNetlist: Netlist | null;
  simResult: SimResult | null;
  simRunning: boolean;
  dark: boolean;
  onSimulate: () => void;
  onStop: () => void;
}

export function GraphPanel({
  liveNetlist,
  simNetlist,
  simResult,
  simRunning,
  dark,
  onSimulate,
  onStop,
}: GraphPanelProps) {
  const [graphs,     setGraphs]     = useState<GraphConfig[]>([{ id: uid(), componentName: null, metric: "tension" }]);
  const [open,       setOpen]       = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const bg     = dark ? "#0e1120" : "#fafafa";
  const bdr    = dark ? "1px solid #1e293b" : "1px solid #e5e7eb";
  const mutCol = dark ? "#475569" : "#9ca3af";

  const addGraph = () => setGraphs(prev => [...prev, { id: uid(), componentName: null, metric: "tension" }]);
  const removeGraph = (id: string) => {
    setExpandedId(prev => prev === id ? null : prev);
    setGraphs(prev => prev.length > 1 ? prev.filter(g => g.id !== id) : prev);
  };
  const updateGraph = (id: string, componentName: string | null) =>
    setGraphs(prev => prev.map(g => g.id === id ? { ...g, componentName } : g));
  const updateGraphMetric = (id: string, metric: "tension" | "courant") =>
    setGraphs(prev => prev.map(g => g.id === id ? { ...g, metric } : g));

  const expandedGraph = graphs.find(g => g.id === expandedId) ?? null;

  return (
    <div style={{ flexShrink: 0, background: bg, borderTop: bdr }}>

      {/* ── Modal plein-écran ─────────────────────────────────────────── */}
      {expandedGraph && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: dark ? "rgba(5,7,15,0.92)" : "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setExpandedId(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "min(95vw, 960px)", height: "min(88vh, 620px)",
              background: dark ? "#0b0e1a" : "#ffffff",
              border: bdr, borderRadius: 10,
              boxShadow: "0 24px 60px rgba(0,0,0,.5)",
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            <div style={{
              height: 38, display: "flex", alignItems: "center",
              padding: "0 14px", borderBottom: bdr, flexShrink: 0, gap: 8,
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: mutCol, fontFamily: "monospace" }}>
                 {UI.graphTitle} — Vue agrandie
              </span>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => setExpandedId(null)}
                style={{ background: "transparent", border: "none", color: mutCol, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 6px" }}
              >×</button>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <GraphView
                key={expandedGraph.id + "_exp"}
                config={expandedGraph}
                liveNetlist={liveNetlist}
                simNetlist={simNetlist}
                simResult={simResult}
                dark={dark}
                enlarged={true}
                onChangeComponent={name => updateGraph(expandedGraph.id, name)}
                onChangeMetric={m  => updateGraphMetric(expandedGraph.id, m)}
                onClose={() => setExpandedId(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── En-tête panneau ───────────────────────────────────────────── */}
      <div style={{ height: 32, display: "flex", alignItems: "center", padding: "0 10px", gap: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: mutCol, fontFamily: "monospace" }}>
          {UI.graphTitle}
        </span>
        <div style={{ flex: 1 }} />
        {simResult?.error && (
          <span style={{ fontSize: 9, color: "#dc2626", fontFamily: "monospace" }}>
            {UI.simErrPrefix}{simResult.error}
          </span>
        )}
        <button
          onClick={simRunning ? onStop : onSimulate}
          style={{
            fontSize: 10, fontFamily: "'JetBrains Mono',monospace",
            background: simRunning ? "#7f1d1d" : "#1d4ed8",
            color: "#fff", border: "none", borderRadius: 4,
            padding: "3px 10px", cursor: "pointer",
          }}
        >
          {simRunning ? UI.stop : UI.simulate}
        </button>
        <button
          onClick={() => setOpen(o => !o)}
          style={{ background: "transparent", border: "none", color: mutCol, cursor: "pointer", fontSize: 11, fontFamily: "monospace", padding: "0 4px" }}
        >
          {open ? "▼" : "▲"}
        </button>
      </div>

      {/* ── Graphiques ───────────────────────────────────────────────── */}
      {open && (
        <div style={{ height: 200, display: "flex", borderTop: bdr, overflow: "hidden" }}>
          {graphs.map(g => (
            <GraphView
              key={g.id}
              config={g}
              liveNetlist={liveNetlist}
              simNetlist={simNetlist}
              simResult={simResult}
              dark={dark}
              onChangeComponent={name => updateGraph(g.id, name)}
              onChangeMetric={m  => updateGraphMetric(g.id, m)}
              onClose={() => removeGraph(g.id)}
              onExpand={() => setExpandedId(g.id)}
            />
          ))}
          <button
            onClick={addGraph}
            title="Ajouter un graphique"
            style={{
              flexShrink: 0, width: 36, background: "transparent",
              border: "none", color: mutCol, cursor: "pointer", fontSize: 20,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {UI.addGraph}
          </button>
        </div>
      )}
    </div>
  );
}
