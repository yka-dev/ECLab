import React from "react";
import type { Component, Action, SelectField, NumberField } from "../types";
import { PROP_SCHEMAS, UI } from "../constants";

interface Props {
  comp: Component;
  dark: boolean;
  dispatch: React.Dispatch<Action>;
}

export function ComponentPropertyRenderer({ comp, dark, dispatch }: Props) {
  const schema  = PROP_SCHEMAS[comp.type];
  const entries = Object.entries(schema);
  const textMuted = dark ? "#64748b" : "#6b7280";
  const inputBase: React.CSSProperties = {
    width: "100%", padding: "5px 8px", fontSize: 12,
    fontFamily: "'JetBrains Mono',monospace", borderRadius: 5,
    border: dark ? "1px solid #1e293b" : "1px solid #d1d5db",
    background: dark ? "#0f172a" : "#f9fafb",
    color: dark ? "#e2e8f0" : "#111827",
    outline: "none", boxSizing: "border-box",
  };

  if (entries.length === 0)
    return <p style={{ fontSize: 11, color: textMuted, fontFamily: "monospace" }}>{UI.noProps}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {entries.map(([key, field]) => {
        const value = comp.props[key];
        return (
          <div key={key} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <label style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.05em", color: textMuted }}>
              {field.label}
            </label>
            {field.type === "boolean" ? (
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <div
                  role="checkbox" aria-checked={value as boolean} tabIndex={0}
                  onClick={() => dispatch({ type: "UPDATE_PROP", id: comp.id, key, value: !(value as boolean) })}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter")
                      dispatch({ type: "UPDATE_PROP", id: comp.id, key, value: !(value as boolean) });
                  }}
                  style={{
                    width: 36, height: 20, borderRadius: 10, position: "relative",
                    cursor: "pointer", flexShrink: 0,
                    background: value ? "#2563eb" : dark ? "#334155" : "#d1d5db",
                    transition: "background .15s",
                  }}
                >
                  <div style={{
                    position: "absolute", top: 3, left: value ? 18 : 3,
                    width: 14, height: 14, borderRadius: "50%",
                    background: "#fff", transition: "left .15s",
                  }} />
                </div>
                <span style={{ fontSize: 12, fontFamily: "monospace", color: dark ? "#94a3b8" : "#374151" }}>
                  {value ? UI.closed : UI.open}
                </span>
              </label>
            ) : field.type === "select" ? (
              <select value={value as string} onChange={(e) => dispatch({ type: "UPDATE_PROP", id: comp.id, key, value: e.target.value })} style={inputBase}>
                {(field as SelectField).options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type="number" value={value as number}
                min={(field as NumberField).min} step={(field as NumberField).step}
                style={inputBase}
                onChange={(e) => dispatch({ type: "UPDATE_PROP", id: comp.id, key, value: parseFloat(e.target.value) || 0 })}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
