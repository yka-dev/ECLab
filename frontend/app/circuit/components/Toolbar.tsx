import React, { useState } from "react";
import type { AppState, Action, Camera, ExampleCircuit } from "../types";
import { UI } from "../constants";
import { EXAMPLE_CIRCUITS } from "../examples";

interface ToolbarProps {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  cam: Camera;
  onShowNetlist: () => void;
  onExportJson: () => void;
  onSaveAndExit: () => void;
}

export function Toolbar({ state, dispatch, cam, onShowNetlist, onExportJson, onSaveAndExit }: ToolbarProps) {
  const dark = state.darkMode;
  const bg   = dark ? "#0e1120" : "#ffffff";
  const bdr  = dark ? "1px solid #1e293b" : "1px solid #e5e7eb";
  const [exOpen, setExOpen] = useState(false);

  const btn: React.CSSProperties = {
    background: "transparent", border: "none",
    color: dark ? "#64748b" : "#6b7280",
    fontSize: 11, fontFamily: "'JetBrains Mono',monospace",
    padding: "4px 8px", borderRadius: 4, cursor: "pointer",
  };
  const sep: React.CSSProperties = {
    width: 1, height: 18,
    background: dark ? "#1e293b" : "#e5e7eb",
    margin: "0 3px",
  };

  const handleClear = () => {
    if (!window.confirm("Êtes-vous sûr de vouloir tout effacer ?")) return;
    dispatch({ type: "LOAD", components: [], wires: [] });
    dispatch({ type: "SELECT", ids: [] });
  };

  const loadExample = (ex: ExampleCircuit) => {
    const isEmpty = state.components.length === 0 && state.wires.length === 0;
    if (!isEmpty && !window.confirm(`Charger "${ex.label}" ? Le circuit actuel sera remplacé.`)) return;
    dispatch({ type: "LOAD", components: ex.circuit.components, wires: ex.circuit.wires });
    dispatch({ type: "SELECT", ids: [] });
    setExOpen(false);
  };

  return (
    <div style={{ height: 40, background: bg, borderBottom: bdr, display: "flex", alignItems: "center", padding: "0 10px", gap: 3, flexShrink: 0 }}>
      <span style={{ fontSize: 9.5, letterSpacing: "0.15em", color: dark ? "#3a4060" : "#9ca3af", fontWeight: 700, fontFamily: "monospace", marginRight: 6 }}>
        {UI.appTitle}
      </span>
      <button style={btn} onClick={() => dispatch({ type: "UNDO" })}>{UI.undo}</button>
      <button style={btn} onClick={() => dispatch({ type: "REDO" })}>{UI.redo}</button>
      <div style={sep} />
      <button style={{ ...btn, color: state.showGrid ? "#2563eb" : undefined }} onClick={() => dispatch({ type: "TOGGLE_GRID" })}>
        {state.showGrid ? UI.gridOn : UI.gridOff}
      </button>
      <button style={btn} onClick={() => dispatch({ type: "TOGGLE_DARK" })}>{dark ? UI.light : UI.dark}</button>
      <div style={sep} />
      <button style={{ ...btn, color: "#2563eb", fontWeight: 600 }} onClick={onShowNetlist}>{UI.netlistBtn}</button>
      <button style={{ ...btn, color: "#059669", fontWeight: 600 }} onClick={onExportJson}>Exporter JSON</button>
      <div style={sep} />

      {/* ── Bouton Exemples ───────────────────────────────────────────────── */}
      <div style={{ position: "relative" }}>
        <button style={{ ...btn, color: "#7c3aed", fontWeight: 600 }} onClick={() => setExOpen(o => !o)}>
           Exemple {exOpen ? "▲" : "▼"}
        </button>
        {exOpen && (
          <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 500, background: dark ? "#0f172a" : "#ffffff", border: dark ? "1px solid #1e293b" : "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.18)", minWidth: 300, padding: "6px 0", marginTop: 4 }}>
            {EXAMPLE_CIRCUITS.map(ex => (
              <button key={ex.label} onClick={() => loadExample(ex)}
                style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: "8px 14px", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: dark ? "#94a3b8" : "#374151" }}
                onMouseEnter={e => (e.currentTarget.style.background = dark ? "#1e293b" : "#f3f4f6")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {ex.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={sep} />
      <button style={{ ...btn, color: "#dc2626" }} onClick={handleClear}>{UI.clearBtn}</button>
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 10, color: dark ? "#3a4060" : "#9ca3af", fontFamily: "monospace" }}>{Math.round(cam.z * 100)}%</span>
      <div style={sep} />
      <button
        style={{ ...btn, color: "#ffffff", background: "#16a34a", fontWeight: 600, padding: "4px 12px", borderRadius: 5 }}
        onClick={onSaveAndExit}
      >
        ↩ Sauvegarder et quitter
      </button>
    </div>
  );
}
