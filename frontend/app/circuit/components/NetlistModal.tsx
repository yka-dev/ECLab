import { useState } from "react";
import type { Circuit } from "../types";
import { UI } from "../constants";
import { generateNetlist, netlistToString } from "../netlist";

interface Props {
  circuit: Circuit;
  dark: boolean;
  onClose: () => void;
}

export function NetlistModal({ circuit, dark, onClose }: Props) {
  const netlist = generateNetlist(circuit);
  const text    = netlistToString(netlist);
  const [copied, setCopied] = useState(false);

  const copy = () =>
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });

  const bg      = dark ? "#0f172a" : "#ffffff";
  const border  = dark ? "1px solid #1e293b" : "1px solid #e5e7eb";
  const textPri = dark ? "#e2e8f0" : "#111827";
  const textMut = dark ? "#64748b" : "#6b7280";
  const codeBg  = dark ? "#080a12" : "#f9fafb";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 560, maxHeight: "80vh", background: bg, borderRadius: 12, border, boxShadow: "0 16px 48px rgba(0,0,0,.25)", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'JetBrains Mono',monospace" }}>
        <div style={{ padding: "13px 16px", borderBottom: border, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: textPri }}>{UI.netlistTitle}</span>
          <div style={{ flex: 1 }} />
          {netlist.warnings.length > 0 && (
            <span style={{ fontSize: 10, color: "#b45309", background: "#fef3c7", borderRadius: 4, padding: "2px 8px" }}>
              {UI.warnings(netlist.warnings.length)}
            </span>
          )}
          <button onClick={copy} style={{ fontSize: 11, color: copied ? "#15803d" : "#2563eb", background: "transparent", border: "none", cursor: "pointer" }}>
            {copied ? UI.copied : UI.copy}
          </button>
          <button onClick={onClose} style={{ fontSize: 16, color: textMut, background: "transparent", border: "none", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "8px 16px", borderBottom: border, display: "flex", gap: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: textMut }}>{UI.nodes} <strong style={{ color: textPri }}>{netlist.nodes.join(", ") || "—"}</strong></span>
          <span style={{ fontSize: 10, color: textMut }}>{UI.elements} <strong style={{ color: textPri }}>{netlist.components.length}</strong></span>
        </div>
        <pre style={{ flex: 1, overflowY: "auto", margin: 0, padding: "12px 16px", fontSize: 12, lineHeight: 1.9, color: textPri, background: codeBg, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
          {text || UI.emptyCircuit}
        </pre>
        {netlist.warnings.length > 0 && (
          <div style={{ padding: "10px 16px", borderTop: border, display: "flex", flexDirection: "column", gap: 4 }}>
            {netlist.warnings.map((w, i) => (
              <div key={i} style={{ fontSize: 10, color: "#b45309", fontFamily: "monospace" }}>⚠ {w}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
