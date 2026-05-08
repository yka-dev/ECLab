import React from "react";
import type { AppState, Action } from "../types";
import { UI, PALETTE_GROUPS } from "../constants";
import { COMPONENT_DEFS } from "../componentDefs";

interface Props {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

export function Palette({ state, dispatch }: Props) {
  const dark = state.darkMode;
  const bg   = dark ? "#0e1120" : "#fafafa";
  const bdr  = dark ? "1px solid #1e293b" : "1px solid #e5e7eb";
  const sec  = dark ? "#374151" : "#9ca3af";

  const btn = (active: boolean): React.CSSProperties => ({
    width: "100%", textAlign: "left",
    background: active ? (dark ? "#0f1f40" : "#eff6ff") : "transparent",
    border: "none", color: active ? "#2563eb" : dark ? "#64748b" : "#374151",
    padding: "5px 8px", borderRadius: 5, cursor: "pointer",
    fontSize: 12, fontFamily: "'JetBrains Mono',monospace",
    fontWeight: active ? 600 : 400,
    display: "flex", alignItems: "center", gap: 7,
  });
  const ico = (color: string): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 18, height: 18, borderRadius: 3,
    background: `${color}20`, color, fontSize: 9, fontWeight: 700, flexShrink: 0,
  });

  return (
    <div style={{ width: 168, background: bg, borderRight: bdr, display: "flex", flexDirection: "column", padding: "10px 6px", gap: 2, overflowY: "auto", flexShrink: 0 }}>
      <div style={{ fontSize: 9, letterSpacing: "0.15em", color: sec, fontWeight: 700, marginBottom: 6, paddingLeft: 4, fontFamily: "monospace" }}>
        {UI.sandboxTitle}
      </div>
      <div style={{ fontSize: 9, letterSpacing: "0.1em", color: sec, fontWeight: 700, margin: "4px 0 3px 4px", fontFamily: "monospace" }}>
        {UI.toolsHeader}
      </div>
      <button style={btn(state.tool === "select")} onClick={() => dispatch({ type: "SET_TOOL", tool: "select" })}>
        <span style={ico("#2563eb")}>↖</span> {UI.select}
      </button>
      <button style={btn(state.tool === "wire")} onClick={() => dispatch({ type: "SET_TOOL", tool: "wire" })}>
        <span style={ico("#7c3aed")}>⌐</span> {UI.wire}
      </button>
      {PALETTE_GROUPS.map((g) => (
        <div key={g.label}>
          <div style={{ fontSize: 9, letterSpacing: "0.1em", color: sec, fontWeight: 700, margin: "10px 0 3px 4px", fontFamily: "monospace" }}>{g.label}</div>
          {g.items.map((t) => {
            const def    = COMPONENT_DEFS[t];
            const active = state.tool === "place" && state.placingType === t;
            return (
              <button key={t} style={btn(active)} onClick={() => dispatch({ type: "SET_TOOL", tool: "place", placingType: t })}>
                <span style={ico(def.color)}>{def.symbol}</span>
                {def.label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
