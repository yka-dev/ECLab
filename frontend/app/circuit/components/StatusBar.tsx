import React from "react";
import type { AppState, ToolMode } from "../types";
import { UI } from "../constants";

export function StatusBar({ state }: { state: AppState }) {
  const dark = state.darkMode;
  const tips: Record<ToolMode, string> = {
    select: UI.tipSelect,
    wire:   UI.tipWire,
    place:  UI.tipPlace(state.placingType ?? ""),
  };
  return (
    <div style={{ height: 24, background: dark ? "#07090f" : "#f3f4f6", borderTop: dark ? "1px solid #1e293b" : "1px solid #e5e7eb", display: "flex", alignItems: "center", padding: "0 10px", gap: 14, fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: dark ? "#2a3050" : "#9ca3af", flexShrink: 0 }}>
      <span>{tips[state.tool]}</span>
      <div style={{ flex: 1 }} />
      <span>x:{Math.round(state.mouseWorld.x)} y:{Math.round(state.mouseWorld.y)}</span>
      <span>{state.components.length} comp · {state.wires.length} fils</span>
    </div>
  );
}
