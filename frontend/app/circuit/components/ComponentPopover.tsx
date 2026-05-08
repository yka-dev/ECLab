import React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { Component, Vec2, Action } from "../types";
import { UI } from "../constants";
import { COMPONENT_DEFS } from "../componentDefs";
import { ComponentPropertyRenderer } from "./ComponentPropertyRenderer";

interface Props {
  comp: Component | null;
  anchorScreen: Vec2 | null;
  canvasRect: DOMRect | null;
  dark: boolean;
  dispatch: React.Dispatch<Action>;
}

export function ComponentPopover({ comp, anchorScreen, canvasRect, dark, dispatch }: Props) {
  const open = comp !== null && anchorScreen !== null;
  const def  = comp ? COMPONENT_DEFS[comp.type] : null;

  const absAnchor = anchorScreen && canvasRect
    ? {
        x: Math.max(8, Math.min(window.innerWidth  - 8, canvasRect.left + anchorScreen.x)),
        y: Math.max(8, Math.min(window.innerHeight - 8, canvasRect.top  + anchorScreen.y)),
      }
    : null;

  const popBg   = dark ? "#0f172a" : "#ffffff";
  const border  = dark ? "1px solid #1e293b" : "1px solid #e5e7eb";
  const shadow  = dark ? "0 8px 32px rgba(0,0,0,.6)" : "0 4px 24px rgba(0,0,0,.12)";
  const textPri = dark ? "#e2e8f0" : "#111827";
  const textMut = dark ? "#64748b" : "#6b7280";
  const actBase: React.CSSProperties = {
    width: "100%", background: "transparent", border,
    color: textMut, borderRadius: 5, padding: "5px 8px",
    fontSize: 11, fontFamily: "'JetBrains Mono',monospace",
    cursor: "pointer", textAlign: "left", marginBottom: 4,
  };

  return (
    <PopoverPrimitive.Root open={open}>
      <PopoverPrimitive.Anchor style={{ position: "fixed", left: absAnchor?.x ?? 0, top: absAnchor?.y ?? 0, width: 0, height: 0, pointerEvents: "none" }} />
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="right" sideOffset={20} align="center"
          avoidCollisions collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={() => dispatch({ type: "SELECT", ids: [] })}
          onEscapeKeyDown={() => dispatch({ type: "SELECT", ids: [] })}
          style={{ width: 224, background: popBg, border, borderRadius: 10, boxShadow: shadow, padding: 14, display: "flex", flexDirection: "column", gap: 10, zIndex: 1000, fontFamily: "'JetBrains Mono',monospace" }}
        >
          {comp && def && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 6, background: `${def.color}20`, color: def.color, fontSize: 10, fontWeight: 700 }}>
                  {def.symbol}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: textPri }}>{def.label}</div>
                  <div style={{ fontSize: 9, color: textMut }}>{comp.id}</div>
                </div>
                <PopoverPrimitive.Close onClick={() => dispatch({ type: "SELECT", ids: [] })} aria-label="Fermer" style={{ background: "transparent", border: "none", color: textMut, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "2px 4px", borderRadius: 3 }}>×</PopoverPrimitive.Close>
              </div>
              <div style={{ fontSize: 9.5, color: textMut, lineHeight: 1.8 }}>
                pos ({Math.round(comp.position.x)}, {Math.round(comp.position.y)}) · rot {comp.rotation}°
              </div>
              <ComponentPropertyRenderer comp={comp} dark={dark} dispatch={dispatch} />
              <div style={{ borderTop: dark ? "1px solid #1e293b" : "1px solid #e5e7eb", paddingTop: 8, marginTop: 2 }}>
                <button style={actBase} onClick={() => dispatch({ type: "ROTATE_SELECTED" })}>{UI.rotate}</button>
                <button style={{ ...actBase, color: "#dc2626", marginBottom: 0 }} onClick={() => dispatch({ type: "DELETE_SELECTED" })}>{UI.deleteComp}</button>
              </div>
            </>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
