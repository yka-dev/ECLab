import type { ComponentType, ComponentDef } from "./types";
import { GRID, PROP_SCHEMAS, defaultPropsFromSchema, colSel, colHov } from "./constants";
import { fmtOhm, fmtFarad, fmtHenry } from "./utils";

export const COMPONENT_DEFS: Record<ComponentType, ComponentDef> = {
  resistor: {
    label: "Résistance",
    symbol: "R",
    color: "#92400e",
    terminals: [{ x: -2, y: 0 }, { x: 2, y: 0 }],
    defaultProps: defaultPropsFromSchema(PROP_SCHEMAS.resistor),
    propDefs: [{ key: "resistance", label: "Résistance (Ω)", type: "number", min: 0, step: 100 }],
    draw(ctx, comp, sel, hov) {
      const w = GRID * 1.35, h = GRID * 0.5, col = sel ? colSel : hov ? colHov : "#92400e";
      ctx.strokeStyle = col; ctx.lineWidth = sel ? 2.5 : 2;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.beginPath();
      ctx.moveTo(-GRID * 2, 0); ctx.lineTo(-w / 2, 0);
      ctx.moveTo(w / 2, 0); ctx.lineTo(GRID * 2, 0);
      ctx.stroke();
      ctx.fillStyle = col; ctx.font = "bold 9px 'JetBrains Mono',monospace"; ctx.textAlign = "center";
      ctx.fillText(fmtOhm(comp.props.resistance as number), 0, -h / 2 - 5);
    },
  },

  capacitor: {
    label: "Condensateur",
    symbol: "C",
    color: "#065f46",
    terminals: [{ x: -2, y: 0 }, { x: 2, y: 0 }],
    defaultProps: defaultPropsFromSchema(PROP_SCHEMAS.capacitor),
    propDefs: [{ key: "capacitance", label: "Capacité (F)", type: "number", min: 0 }],
    draw(ctx, comp, sel, hov) {
      const gap = 7, col = sel ? colSel : hov ? colHov : "#065f46";
      ctx.strokeStyle = col; ctx.lineWidth = sel ? 2.5 : 2;
      ctx.beginPath();
      ctx.moveTo(-GRID * 2, 0); ctx.lineTo(-gap, 0);
      ctx.moveTo(gap, 0); ctx.lineTo(GRID * 2, 0);
      ctx.stroke();
      ctx.lineWidth = sel ? 3 : 2.5;
      ctx.beginPath();
      ctx.moveTo(-gap, -GRID * 0.7); ctx.lineTo(-gap, GRID * 0.7);
      ctx.moveTo(gap, -GRID * 0.7);  ctx.lineTo(gap, GRID * 0.7);
      ctx.stroke();
      ctx.fillStyle = col; ctx.font = "bold 9px 'JetBrains Mono',monospace"; ctx.textAlign = "center";
      ctx.fillText(fmtFarad(comp.props.capacitance as number), 0, -GRID * 0.7 - 5);
    },
  },

  inductor: {
    label: "Inducteur",
    symbol: "L",
    color: "#4c1d95",
    terminals: [{ x: -2, y: 0 }, { x: 2, y: 0 }],
    defaultProps: defaultPropsFromSchema(PROP_SCHEMAS.inductor),
    propDefs: [{ key: "inductance", label: "Inductance (H)", type: "number", min: 0 }],
    draw(ctx, comp, sel, hov) {
      const col = sel ? colSel : hov ? colHov : "#4c1d95";
      ctx.strokeStyle = col; ctx.lineWidth = sel ? 2.5 : 2;
      ctx.beginPath();
      ctx.moveTo(-GRID * 2, 0); ctx.lineTo(-GRID * 1.2, 0);
      for (let i = 0; i < 4; i++)
        ctx.arc(-GRID * 1.2 + i * GRID * 0.6 + GRID * 0.3, 0, GRID * 0.3, Math.PI, 0);
      ctx.lineTo(GRID * 2, 0);
      ctx.stroke();
      ctx.fillStyle = col; ctx.font = "bold 9px 'JetBrains Mono',monospace"; ctx.textAlign = "center";
      ctx.fillText(fmtHenry(comp.props.inductance as number), 0, -GRID * 0.4 - 5);
    },
  },

  vsource: {
    label: "Source de tension",
    symbol: "V",
    color: "#991b1b",
    terminals: [{ x: 0, y: -2 }, { x: 0, y: 2 }],
    defaultProps: defaultPropsFromSchema(PROP_SCHEMAS.vsource),
    propDefs: [{ key: "voltage", label: "Tension (V)", type: "number", step: 0.5 }],
    draw(ctx, comp, sel, hov) {
      const r = GRID * 0.85, col = sel ? colSel : hov ? colHov : "#991b1b";
      ctx.strokeStyle = col; ctx.lineWidth = sel ? 2.5 : 2;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -GRID * 2); ctx.lineTo(0, -r);
      ctx.moveTo(0, r); ctx.lineTo(0, GRID * 2);
      ctx.stroke();
      ctx.fillStyle = col; ctx.font = "bold 10px 'JetBrains Mono',monospace"; ctx.textAlign = "center";
      ctx.fillText("+", 0, -GRID * 0.22);
      ctx.fillText("−", 0, GRID * 0.42);
      ctx.font = "bold 9px 'JetBrains Mono',monospace";
      ctx.fillText(`${comp.props.voltage as number}V`, 0, -r - 5);
    },
  },

  ground: {
    label: "Mise à la terre",
    symbol: "GND",
    color: "#1f2937",
    terminals: [{ x: 0, y: -1 }],
    defaultProps: {},
    propDefs: [],
    draw(ctx, _comp, sel, hov) {
      const col = sel ? colSel : hov ? colHov : "#1f2937";
      ctx.strokeStyle = col; ctx.lineWidth = sel ? 2.5 : 2;
      ctx.beginPath(); ctx.moveTo(0, -GRID); ctx.lineTo(0, 0); ctx.stroke();
      const bars = [{ w: 0.75, y: 0 }, { w: 0.5, y: GRID * 0.33 }, { w: 0.25, y: GRID * 0.66 }];
      for (const b of bars) {
        ctx.beginPath(); ctx.moveTo(-b.w * GRID, b.y); ctx.lineTo(b.w * GRID, b.y); ctx.stroke();
      }
    },
  },

  switch: {
    label: "Interrupteur",
    symbol: "SW",
    color: "#14532d",
    terminals: [{ x: -2, y: 0 }, { x: 2, y: 0 }],
    defaultProps: defaultPropsFromSchema(PROP_SCHEMAS.switch),
    propDefs: [{ key: "closed", label: "Fermé", type: "boolean" }],
    draw(ctx, comp, sel, hov) {
      const col = sel ? colSel : hov ? colHov : "#14532d", r = GRID * 0.2;
      ctx.strokeStyle = col; ctx.lineWidth = sel ? 2.5 : 2;
      ctx.beginPath();
      ctx.moveTo(-GRID * 2, 0); ctx.lineTo(-GRID, 0);
      ctx.moveTo(GRID, 0); ctx.lineTo(GRID * 2, 0);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(-GRID, 0, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(GRID, 0, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      if (comp.props.closed) {
        ctx.moveTo(-GRID + r, 0); ctx.lineTo(GRID - r, 0);
      } else {
        ctx.moveTo(-GRID + r * 0.7, -r * 0.7); ctx.lineTo(GRID * 0.35, -GRID * 0.5);
      }
      ctx.stroke();
    },
  },

  led: {
    label: "LED",
    symbol: "▶",
    color: "#9a3412",
    terminals: [{ x: -2, y: 0 }, { x: 2, y: 0 }],
    defaultProps: defaultPropsFromSchema(PROP_SCHEMAS.led),
    propDefs: [
      { key: "color", label: "Couleur LED", type: "select", options: ["red", "green", "blue", "yellow", "white"] },
      { key: "forwardVoltage", label: "Tension seuil Vf (V)", type: "number", min: 0, step: 0.1 },
    ],
    draw(ctx, comp, sel, hov) {
      const col = sel ? colSel : hov ? colHov : "#9a3412", s = GRID * 0.7;
      ctx.strokeStyle = col; ctx.lineWidth = sel ? 2.5 : 2;
      ctx.beginPath();
      ctx.moveTo(-GRID * 2, 0); ctx.lineTo(-s, 0);
      ctx.moveTo(s, 0); ctx.lineTo(GRID * 2, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s, -s); ctx.lineTo(-s, s); ctx.lineTo(s, 0); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = sel ? "rgba(37,99,235,.15)" : `${comp.props.color as string}33`;
      ctx.fill();
      ctx.beginPath(); ctx.moveTo(s, -s); ctx.lineTo(s, s); ctx.stroke();
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 2; i++) {
        const ox = GRID * 0.3 + i * GRID * 0.28, oy = -GRID * 0.6 - i * GRID * 0.1;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + GRID * 0.28, oy - GRID * 0.32); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ox + GRID * 0.28, oy - GRID * 0.32); ctx.lineTo(ox + GRID * 0.18, oy - GRID * 0.32);
        ctx.moveTo(ox + GRID * 0.28, oy - GRID * 0.32); ctx.lineTo(ox + GRID * 0.28, oy - GRID * 0.2);
        ctx.stroke();
      }
    },
  },

  // ⚠️ TRANSISTOR FICTIF — interrupteur C-E commandé par V_BE, sans simulation réelle
  npn_ideal: {
    label: "NPN idéal ⚠",
    symbol: "Q",
    color: "#b45309",
    // Base (gauche), Collecteur (haut-droite), Émetteur (bas-droite)
    terminals: [{ x: -1, y: 0 }, { x: 1, y: -2 }, { x: 1, y: 2 }],
    defaultProps: defaultPropsFromSchema(PROP_SCHEMAS.npn_ideal),
    propDefs: [
      { key: "vbe_on", label: "Seuil Vbe (V)",   type: "number" as const, min: 0,   step: 0.05 },
      { key: "ron",    label: "Ron passant (Ω)", type: "number" as const, min: 0.1, step: 1    },
    ],
    draw(ctx, _comp, sel, hov) {
      // ⚠️ TRANSISTOR FICTIF — dessin orange avec base pointillée pour signaler le modèle simplifié
      const col = sel ? colSel : hov ? colHov : "#b45309";
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = sel ? 2.5 : 2;
      const G = GRID;

      // Fil de base — pointillé pour marquer "fictif"
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(-G, 0); ctx.lineTo(-G * 0.3, 0); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();

      // Barre verticale de base
      ctx.beginPath(); ctx.moveTo(-G * 0.3, -G * 1.2); ctx.lineTo(-G * 0.3, G * 1.2); ctx.stroke();

      // Fil collecteur
      ctx.beginPath(); ctx.moveTo(-G * 0.3, -G * 0.65); ctx.lineTo(G, -G * 2); ctx.stroke();

      // Fil émetteur
      ctx.beginPath(); ctx.moveTo(-G * 0.3, G * 0.65); ctx.lineTo(G, G * 2); ctx.stroke();

      // Flèche émetteur
      const ex = G, ey = G * 2, sx = -G * 0.3, sy = G * 0.65;
      const len = Math.hypot(ex - sx, ey - sy);
      const ux = (ex - sx) / len, uy = (ey - sy) / len;
      const mx = sx + ux * len * 0.65, my = sy + uy * len * 0.65;
      ctx.save();
      ctx.translate(mx, my); ctx.rotate(Math.atan2(uy, ux));
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-G * 0.35, -G * 0.18); ctx.lineTo(-G * 0.35, G * 0.18); ctx.closePath(); ctx.fill();
      ctx.restore();

      // Étiquettes
      ctx.font = "bold 8px 'JetBrains Mono',monospace"; ctx.textAlign = "center";
      ctx.fillText("B", -G * 1.4, G * 0.18);
      ctx.fillText("C", G * 1.35, -G * 1.9);
      ctx.fillText("E", G * 1.35, G * 2.25);
    },
  },
};
