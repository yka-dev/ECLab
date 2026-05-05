import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { createSimulationWorker } from "simulation";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { getCookie } from "~/lib/utils";
import { useLoaderData } from "react-router";

const GRID = 24;
const ZOOM_MIN = 0.12;
const ZOOM_MAX = 6;
const THEME_STORAGE_KEY = "circuit-sandbox-theme";

const UI = {
  appTitle: "CIRCUIT",
  sandboxTitle: "CIRCUIT SANDBOX",
  toolsHeader: "OUTILS",
  select: "Sélection",
  wire: "Fil",
  passive: "PASSIFS",
  sources: "SOURCES",
  active: "ACTIFS",

  undo: "↩ Annuler",
  redo: "↪ Rétablir",
  gridOff: "⊞ Grille",
  gridOn: "⊞ Grille ✓",
  light: "☀ Clair",
  dark: "◑ Sombre",
  netlistBtn: "∑ Netlist",
  clearBtn: "✕ Effacer",

  tipSelect:
    "Cliquer pour sélectionner · Shift+clic / glisser multi-sélect · R rotation · Suppr · Ctrl+Z/Y annuler/rétablir",
  tipWire:
    "Cliquer pour ajouter un point · Double-clic ou ESC pour terminer · Accrochage aux bornes",
  tipPlace: (t: string) =>
    `Cliquer pour placer ${t} · R rotation · ESC pour annuler`,

  noProps: "Aucune propriété configurable.",
  closed: "Fermé",
  open: "Ouvert",
  rotate: "↻ Rotation 90°",
  deleteComp: "✕ Supprimer",

  netlistTitle: "Netlist",
  warnings: (n: number) => `${n} avertissement${n > 1 ? "s" : ""}`,
  copy: "Copier",
  copied: "✓ Copié",
  nodes: "Nœuds :",
  elements: "Éléments :",
  emptyCircuit: "* Circuit vide",

  emptyHint:
    "Sélectionnez un composant dans la palette\npuis cliquez sur la toile pour le placer",

  graphTitle: "GRAPHIQUES",
  addGraph: "+",
  chooseComp: "Choisir un composant...",
  simulate: "▶ Simuler",
  stop: "■ Arrêter",
  simRunning: "Simulation...",
  noData: "Aucune donnée — lancez la simulation",
  noCompSel: "Sélectionnez un composant",
  dcResult: (v: number) => `Régime continu : ${v.toPrecision(4)} V`,
  simErrPrefix: "Erreur : ",
} as const;

export interface Vec2 {
  x: number;
  y: number;
}
export interface Terminal {
  x: number;
  y: number;
}

export type ComponentType =
  | "resistor"
  | "capacitor"
  | "inductor"
  | "vsource"
  | "ground"
  | "switch"
  | "led";

export type Rotation = 0 | 90 | 180 | 270;

export interface Component {
  id: string;
  type: ComponentType;
  position: Vec2;
  rotation: Rotation;
  props: Record<string, unknown>;
}

export interface Wire {
  id: string;
  points: Vec2[];
}
export interface Circuit {
  components: Component[];
  wires: Wire[];
}

interface SimPoint {
  time: number;
  nodeVoltages: Record<string, number>;
  sourceCurrents: Record<string, number>;
}

interface SimResult {
  nodeVoltages: Record<string, number>;
  sourceCurrents: Record<string, number>;
  timeSeries?: SimPoint[];
  error?: string;
}

interface GraphConfig {
  id: string;
  componentName: string | null;
  metric: "tension" | "courant";
}

type PropFieldType = "number" | "boolean" | "select";
interface PropFieldBase {
  label: string;
  type: PropFieldType;
  default: unknown;
}
interface NumberField extends PropFieldBase {
  type: "number";
  default: number;
  min?: number;
  step?: number;
}
interface BoolField extends PropFieldBase {
  type: "boolean";
  default: boolean;
}
interface SelectField extends PropFieldBase {
  type: "select";
  default: string;
  options: string[];
}
type PropField = NumberField | BoolField | SelectField;
type ComponentPropertySchema = Record<string, PropField>;

const PROP_SCHEMAS: Record<ComponentType, ComponentPropertySchema> = {
  resistor: {
    resistance: {
      label: "Résistance (Ω)",
      type: "number",
      default: 1000,
      min: 0,
      step: 100,
    },
  },
  capacitor: {
    capacitance: {
      label: "Capacité (F)",
      type: "number",
      default: 1e-6,
      min: 0,
    },
  },
  inductor: {
    inductance: {
      label: "Inductance (H)",
      type: "number",
      default: 1e-3,
      min: 0,
    },
  },
  vsource: {
    voltage: { label: "Tension (V)", type: "number", default: 5, step: 0.5 },
  },
  ground: {},
  switch: { closed: { label: "Fermé", type: "boolean", default: false } },
  led: {
    color: {
      label: "Couleur LED",
      type: "select",
      default: "red",
      options: ["red", "green", "blue", "yellow", "white"],
    },
    forwardVoltage: {
      label: "Tension seuil Vf (V)",
      type: "number",
      default: 2.0,
      min: 0,
      step: 0.1,
    },
  },
};

function defaultPropsFromSchema(
  schema: ComponentPropertySchema,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(schema).map(([k, f]) => [k, f.default]),
  );
}

interface NumberPropDef {
  key: string;
  label: string;
  type: "number";
  min?: number;
  step?: number;
}
interface BoolPropDef {
  key: string;
  label: string;
  type: "boolean";
}
interface SelectPropDef {
  key: string;
  label: string;
  type: "select";
  options: string[];
}
type PropDef = NumberPropDef | BoolPropDef | SelectPropDef;

interface ComponentDef {
  label: string;
  symbol: string;
  color: string;
  terminals: Terminal[];
  defaultProps: Record<string, unknown>;
  propDefs: PropDef[];
  draw: (
    ctx: CanvasRenderingContext2D,
    comp: Component,
    selected: boolean,
    hovered: boolean,
  ) => void;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

const snap = (v: number): number => Math.round(v / GRID) * GRID;
const snapVec = (v: Vec2): Vec2 => ({ x: snap(v.x), y: snap(v.y) });
const dist = (a: Vec2, b: Vec2): number => Math.hypot(b.x - a.x, b.y - a.y);
const uid = (): string => Math.random().toString(36).slice(2, 9);

const s2w = (sx: number, sy: number, cam: Camera): Vec2 => ({
  x: (sx - cam.x) / cam.z,
  y: (sy - cam.y) / cam.z,
});
const w2s = (wx: number, wy: number, cam: Camera): Vec2 => ({
  x: wx * cam.z + cam.x,
  y: wy * cam.z + cam.y,
});

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtOhm(v: number): string {
  if (v >= 1e6) return `${+(v / 1e6).toPrecision(3)}MΩ`;
  if (v >= 1e3) return `${+(v / 1e3).toPrecision(3)}kΩ`;
  return `${+v.toPrecision(3)}Ω`;
}
function fmtFarad(v: number): string {
  if (v >= 1) return `${+v.toPrecision(3)}F`;
  if (v >= 1e-3) return `${+(v * 1e3).toPrecision(3)}mF`;
  if (v >= 1e-6) return `${+(v * 1e6).toPrecision(3)}μF`;
  return `${+(v * 1e9).toPrecision(3)}nF`;
}
function fmtHenry(v: number): string {
  if (v >= 1) return `${+v.toPrecision(3)}H`;
  if (v >= 1e-3) return `${+(v * 1e3).toPrecision(3)}mH`;
  return `${+(v * 1e6).toPrecision(3)}μH`;
}

const colSel = "#2563eb";
const colHov = "#7c3aed";

// ─── Component Definitions ────────────────────────────────────────────────────

const COMPONENT_DEFS: Record<ComponentType, ComponentDef> = {
  resistor: {
    label: "Résistance",
    symbol: "R",
    color: "#92400e",
    terminals: [
      { x: -2, y: 0 },
      { x: 2, y: 0 },
    ],
    defaultProps: defaultPropsFromSchema(PROP_SCHEMAS.resistor),
    propDefs: [
      {
        key: "resistance",
        label: "Résistance (Ω)",
        type: "number",
        min: 0,
        step: 100,
      },
    ],
    draw(ctx, comp, sel, hov) {
      const w = GRID * 1.35,
        h = GRID * 0.5,
        col = sel ? colSel : hov ? colHov : "#92400e";
      ctx.strokeStyle = col;
      ctx.lineWidth = sel ? 2.5 : 2;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.beginPath();
      ctx.moveTo(-GRID * 2, 0);
      ctx.lineTo(-w / 2, 0);
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(GRID * 2, 0);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.font = "bold 9px 'JetBrains Mono',monospace";
      ctx.textAlign = "center";
      ctx.fillText(fmtOhm(comp.props.resistance as number), 0, -h / 2 - 5);
    },
  },

  capacitor: {
    label: "Condensateur",
    symbol: "C",
    color: "#065f46",
    terminals: [
      { x: -2, y: 0 },
      { x: 2, y: 0 },
    ],
    defaultProps: defaultPropsFromSchema(PROP_SCHEMAS.capacitor),
    propDefs: [
      { key: "capacitance", label: "Capacité (F)", type: "number", min: 0 },
    ],
    draw(ctx, comp, sel, hov) {
      const gap = 7,
        col = sel ? colSel : hov ? colHov : "#065f46";
      ctx.strokeStyle = col;
      ctx.lineWidth = sel ? 2.5 : 2;
      ctx.beginPath();
      ctx.moveTo(-GRID * 2, 0);
      ctx.lineTo(-gap, 0);
      ctx.moveTo(gap, 0);
      ctx.lineTo(GRID * 2, 0);
      ctx.stroke();
      ctx.lineWidth = sel ? 3 : 2.5;
      ctx.beginPath();
      ctx.moveTo(-gap, -GRID * 0.7);
      ctx.lineTo(-gap, GRID * 0.7);
      ctx.moveTo(gap, -GRID * 0.7);
      ctx.lineTo(gap, GRID * 0.7);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.font = "bold 9px 'JetBrains Mono',monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        fmtFarad(comp.props.capacitance as number),
        0,
        -GRID * 0.7 - 5,
      );
    },
  },

  inductor: {
    label: "Inducteur",
    symbol: "L",
    color: "#4c1d95",
    terminals: [
      { x: -2, y: 0 },
      { x: 2, y: 0 },
    ],
    defaultProps: defaultPropsFromSchema(PROP_SCHEMAS.inductor),
    propDefs: [
      { key: "inductance", label: "Inductance (H)", type: "number", min: 0 },
    ],
    draw(ctx, comp, sel, hov) {
      const col = sel ? colSel : hov ? colHov : "#4c1d95";
      ctx.strokeStyle = col;
      ctx.lineWidth = sel ? 2.5 : 2;
      ctx.beginPath();
      ctx.moveTo(-GRID * 2, 0);
      ctx.lineTo(-GRID * 1.2, 0);
      for (let i = 0; i < 4; i++)
        ctx.arc(
          -GRID * 1.2 + i * GRID * 0.6 + GRID * 0.3,
          0,
          GRID * 0.3,
          Math.PI,
          0,
        );
      ctx.lineTo(GRID * 2, 0);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.font = "bold 9px 'JetBrains Mono',monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        fmtHenry(comp.props.inductance as number),
        0,
        -GRID * 0.4 - 5,
      );
    },
  },

  vsource: {
    label: "Source de tension",
    symbol: "V",
    color: "#991b1b",
    terminals: [
      { x: 0, y: -2 },
      { x: 0, y: 2 },
    ],
    defaultProps: defaultPropsFromSchema(PROP_SCHEMAS.vsource),
    propDefs: [
      { key: "voltage", label: "Tension (V)", type: "number", step: 0.5 },
    ],
    draw(ctx, comp, sel, hov) {
      const r = GRID * 0.85,
        col = sel ? colSel : hov ? colHov : "#991b1b";
      ctx.strokeStyle = col;
      ctx.lineWidth = sel ? 2.5 : 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -GRID * 2);
      ctx.lineTo(0, -r);
      ctx.moveTo(0, r);
      ctx.lineTo(0, GRID * 2);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.font = "bold 10px 'JetBrains Mono',monospace";
      ctx.textAlign = "center";
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
      ctx.strokeStyle = col;
      ctx.lineWidth = sel ? 2.5 : 2;
      ctx.beginPath();
      ctx.moveTo(0, -GRID);
      ctx.lineTo(0, 0);
      ctx.stroke();
      const bars = [
        { w: 0.75, y: 0 },
        { w: 0.5, y: GRID * 0.33 },
        { w: 0.25, y: GRID * 0.66 },
      ];
      for (const b of bars) {
        ctx.beginPath();
        ctx.moveTo(-b.w * GRID, b.y);
        ctx.lineTo(b.w * GRID, b.y);
        ctx.stroke();
      }
    },
  },

  switch: {
    label: "Interrupteur",
    symbol: "SW",
    color: "#14532d",
    terminals: [
      { x: -2, y: 0 },
      { x: 2, y: 0 },
    ],
    defaultProps: defaultPropsFromSchema(PROP_SCHEMAS.switch),
    propDefs: [{ key: "closed", label: "Fermé", type: "boolean" }],
    draw(ctx, comp, sel, hov) {
      const col = sel ? colSel : hov ? colHov : "#14532d",
        r = GRID * 0.2;
      ctx.strokeStyle = col;
      ctx.lineWidth = sel ? 2.5 : 2;
      ctx.beginPath();
      ctx.moveTo(-GRID * 2, 0);
      ctx.lineTo(-GRID, 0);
      ctx.moveTo(GRID, 0);
      ctx.lineTo(GRID * 2, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-GRID, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(GRID, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      if (comp.props.closed) {
        ctx.moveTo(-GRID + r, 0);
        ctx.lineTo(GRID - r, 0);
      } else {
        ctx.moveTo(-GRID + r * 0.7, -r * 0.7);
        ctx.lineTo(GRID * 0.35, -GRID * 0.5);
      }
      ctx.stroke();
    },
  },

  led: {
    label: "LED",
    symbol: "▶",
    color: "#9a3412",
    terminals: [
      { x: -2, y: 0 },
      { x: 2, y: 0 },
    ],
    defaultProps: defaultPropsFromSchema(PROP_SCHEMAS.led),
    propDefs: [
      {
        key: "color",
        label: "Couleur LED",
        type: "select",
        options: ["red", "green", "blue", "yellow", "white"],
      },
      {
        key: "forwardVoltage",
        label: "Tension seuil Vf (V)",
        type: "number",
        min: 0,
        step: 0.1,
      },
    ],
    draw(ctx, comp, sel, hov) {
      const col = sel ? colSel : hov ? colHov : "#9a3412",
        s = GRID * 0.7;
      ctx.strokeStyle = col;
      ctx.lineWidth = sel ? 2.5 : 2;
      ctx.beginPath();
      ctx.moveTo(-GRID * 2, 0);
      ctx.lineTo(-s, 0);
      ctx.moveTo(s, 0);
      ctx.lineTo(GRID * 2, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s, -s);
      ctx.lineTo(-s, s);
      ctx.lineTo(s, 0);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = sel
        ? "rgba(37,99,235,.15)"
        : `${comp.props.color as string}33`;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s, -s);
      ctx.lineTo(s, s);
      ctx.stroke();
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 2; i++) {
        const ox = GRID * 0.3 + i * GRID * 0.28,
          oy = -GRID * 0.6 - i * GRID * 0.1;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + GRID * 0.28, oy - GRID * 0.32);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ox + GRID * 0.28, oy - GRID * 0.32);
        ctx.lineTo(ox + GRID * 0.18, oy - GRID * 0.32);
        ctx.moveTo(ox + GRID * 0.28, oy - GRID * 0.32);
        ctx.lineTo(ox + GRID * 0.28, oy - GRID * 0.2);
        ctx.stroke();
      }
    },
  },
};

// ─── Camera ───────────────────────────────────────────────────────────────────

interface Camera {
  x: number;
  y: number;
  z: number;
}

// ─── World-space terminal positions ──────────────────────────────────────────

function termWorlds(comp: Component): Vec2[] {
  const def = COMPONENT_DEFS[comp.type];
  if (!def) return [];
  const rad = (comp.rotation * Math.PI) / 180;
  const cos = Math.cos(rad),
    sin = Math.sin(rad);
  return def.terminals.map((t) => {
    const wx = t.x * GRID,
      wy = t.y * GRID;
    return {
      x: comp.position.x + wx * cos - wy * sin,
      y: comp.position.y + wx * sin + wy * cos,
    };
  });
}

function orthoRoute(a: Vec2, b: Vec2): Vec2[] {
  const pts: Vec2[] = [{ ...a }];
  if (a.x !== b.x) pts.push({ x: b.x, y: a.y });
  if (pts[pts.length - 1].x !== b.x || pts[pts.length - 1].y !== b.y)
    pts.push({ ...b });
  else if (pts.length === 1) pts.push({ ...b });
  return pts;
}

function snapToNearby(
  components: Component[],
  wires: Wire[],
  world: Vec2,
  radius = GRID * 0.85,
): Vec2 {
  let best = radius,
    pt = snapVec(world);
  for (const c of components)
    for (const t of termWorlds(c)) {
      const d = dist(t, world);
      if (d < best) {
        best = d;
        pt = snapVec(t);
      }
    }
  for (const w of wires)
    for (const p of w.points) {
      const d = dist(p, world);
      if (d < best) {
        best = d;
        pt = snapVec(p);
      }
    }
  return pt;
}

function hitComponent(comp: Component, pt: Vec2): boolean {
  const ts = termWorlds(comp);
  const allX = [comp.position.x, ...ts.map((t) => t.x)];
  const allY = [comp.position.y, ...ts.map((t) => t.y)];
  const pad = GRID * 0.85;
  return (
    pt.x >= Math.min(...allX) - pad &&
    pt.x <= Math.max(...allX) + pad &&
    pt.y >= Math.min(...allY) - pad &&
    pt.y <= Math.max(...allY) + pad
  );
}

function hitWire(wire: Wire, pt: Vec2): boolean {
  const ps = wire.points,
    thr = GRID * 0.42;
  for (let i = 0; i < ps.length - 1; i++) {
    const a = ps[i],
      b = ps[i + 1];
    const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    if (l2 < 1) continue;
    let t = ((pt.x - a.x) * (b.x - a.x) + (pt.y - a.y) * (b.y - a.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    if (
      Math.hypot(
        pt.x - (a.x + t * (b.x - a.x)),
        pt.y - (a.y + t * (b.y - a.y)),
      ) < thr
    )
      return true;
  }
  return false;
}

function hitTest(
  components: Component[],
  wires: Wire[],
  pt: Vec2,
): string | null {
  for (let i = components.length - 1; i >= 0; i--)
    if (hitComponent(components[i], pt)) return components[i].id;
  for (let i = wires.length - 1; i >= 0; i--)
    if (hitWire(wires[i], pt)) return wires[i].id;
  return null;
}

function findJunctions(components: Component[], wires: Wire[]): Vec2[] {
  const result: Vec2[] = [],
    candidates: Vec2[] = [];
  for (const c of components) for (const t of termWorlds(c)) candidates.push(t);
  for (const w of wires) {
    candidates.push(w.points[0]);
    candidates.push(w.points[w.points.length - 1]);
  }
  for (const pt of candidates) {
    let count = 0;
    for (const w of wires)
      for (const wp of w.points) if (dist(pt, wp) < 2) count++;
    for (const c of components)
      for (const t of termWorlds(c)) if (dist(pt, t) < 2) count++;
    if (count >= 3 && !result.some((r) => dist(r, pt) < 2)) result.push(pt);
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── NETLIST GENERATOR  (MNA-compatible) ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export type NetlistComponent =
  | { type: "R"; name: string; n1: string; n2: string; value: number }
  | { type: "V"; name: string; n1: string; n2: string; value: number }
  | { type: "C"; name: string; n1: string; n2: string; value: number }
  | { type: "L"; name: string; n1: string; n2: string; value: number }
  | { type: "D"; name: string; n1: string; n2: string; vf: number }
  | { type: "S"; name: string; n1: string; n2: string; state: boolean };

export interface Netlist {
  nodes: string[];
  components: NetlistComponent[];
  warnings: string[];
  componentNodes: Map<string, [string, string]>; // compId → [n1, n2]
  componentNames: Map<string, string>; // compId → netlist name ("R1", "V2"…)
}

class UnionFind {
  private parent = new Map<string, string>();
  private key(p: Vec2): string {
    return `${snap(p.x)},${snap(p.y)}`;
  }
  add(p: Vec2): string {
    const k = this.key(p);
    if (!this.parent.has(k)) this.parent.set(k, k);
    return k;
  }
  find(p: Vec2): string {
    let k = this.add(p);
    while (this.parent.get(k) !== k) {
      this.parent.set(k, this.parent.get(this.parent.get(k)!)!);
      k = this.parent.get(k)!;
    }
    return k;
  }
  union(a: Vec2, b: Vec2): void {
    this.add(a);
    this.add(b);
    const ra = this.find(a),
      rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

export function generateNetlist(circuit: Circuit): Netlist {
  const warnings: string[] = [];
  const uf = new UnionFind();

  for (const wire of circuit.wires) {
    if (wire.points.length === 0) continue;
    wire.points.forEach((p) => uf.add(p));
    for (let i = 0; i < wire.points.length - 1; i++)
      uf.union(wire.points[i], wire.points[i + 1]);
  }

  for (const comp of circuit.components) {
    for (const tw of termWorlds(comp)) {
      uf.add(tw);
      for (const wire of circuit.wires) {
        for (const wp of wire.points) {
          if (dist(tw, wp) < GRID * 0.5) uf.union(tw, wp);
        }
      }
    }
  }

  const groundRoots = new Set<string>();
  for (const comp of circuit.components) {
    if (comp.type === "ground") {
      const tw = termWorlds(comp)[0];
      if (tw) groundRoots.add(uf.find(tw));
    }
  }
  if (groundRoots.size === 0)
    warnings.push(
      "Aucun composant de masse trouvé. Le nœud '0' ne sera pas défini.",
    );

  const rootToNode = new Map<string, string>();
  for (const gr of groundRoots) rootToNode.set(gr, "0");
  let nextNode = 1;

  const nodeOf = (pt: Vec2): string => {
    const root = uf.find(pt);
    if (!rootToNode.has(root)) rootToNode.set(root, String(nextNode++));
    return rootToNode.get(root)!;
  };

  const nlComps: NetlistComponent[] = [];
  const counters: Record<string, number> = {};
  const nextName = (prefix: string) => {
    counters[prefix] = (counters[prefix] ?? 0) + 1;
    return `${prefix}${counters[prefix]}`;
  };
  const componentNodes = new Map<string, [string, string]>();
  const componentNames = new Map<string, string>();

  for (const comp of circuit.components) {
    const tw = termWorlds(comp);
    const n1 = () => nodeOf(tw[0]);
    const n2 = () => nodeOf(tw[1]);
    const reg = (prefix: string, a: string, b: string) => {
      const name = nextName(prefix);
      componentNodes.set(comp.id, [a, b]);
      componentNames.set(comp.id, name);
      return name;
    };
    switch (comp.type) {
      case "resistor": {
        const a = n1(),
          b = n2();
        nlComps.push({
          type: "R",
          name: reg("R", a, b),
          n1: a,
          n2: b,
          value: comp.props.resistance as number,
        });
        break;
      }
      case "capacitor": {
        const a = n1(),
          b = n2();
        nlComps.push({
          type: "C",
          name: reg("C", a, b),
          n1: a,
          n2: b,
          value: comp.props.capacitance as number,
        });
        break;
      }
      case "inductor": {
        const a = n1(),
          b = n2();
        nlComps.push({
          type: "L",
          name: reg("L", a, b),
          n1: a,
          n2: b,
          value: comp.props.inductance as number,
        });
        break;
      }
      case "vsource": {
        const a = n1(),
          b = n2();
        nlComps.push({
          type: "V",
          name: reg("V", a, b),
          n1: a,
          n2: b,
          value: comp.props.voltage as number,
        });
        break;
      }
      case "led": {
        const a = n1(),
          b = n2();
        nlComps.push({
          type: "D",
          name: reg("D", a, b),
          n1: a,
          n2: b,
          vf: comp.props.forwardVoltage as number,
        });
        break;
      }
      case "switch": {
        const a = n1(),
          b = n2();
        nlComps.push({
          type: "S",
          name: reg("S", a, b),
          n1: a,
          n2: b,
          state: comp.props.closed as boolean,
        });
        break;
      }
      case "ground":
        break;
    }
  }

  const nodeSet = new Set<string>();
  for (const nc of nlComps) {
    nodeSet.add(nc.n1);
    nodeSet.add(nc.n2);
  }
  const nodeCount = new Map<string, number>();
  for (const nc of nlComps) {
    nodeCount.set(nc.n1, (nodeCount.get(nc.n1) ?? 0) + 1);
    nodeCount.set(nc.n2, (nodeCount.get(nc.n2) ?? 0) + 1);
  }
  for (const [node, count] of nodeCount) {
    if (count < 2)
      warnings.push(`Le nœud ${node} semble flottant (1 seule connexion).`);
  }

  const nodes = Array.from(nodeSet).sort((a, b) => {
    const na = parseInt(a),
      nb = parseInt(b);
    return isNaN(na) || isNaN(nb) ? a.localeCompare(b) : na - nb;
  });

  return {
    nodes,
    components: nlComps,
    warnings,
    componentNodes,
    componentNames,
  };
}

export function netlistToString(netlist: Netlist): string {
  const lines: string[] = [];
  for (const nc of netlist.components) {
    switch (nc.type) {
      case "R":
      case "C":
      case "L":
      case "V":
        lines.push(`${nc.name} ${nc.n1} ${nc.n2} ${nc.value}`);
        break;
      case "D":
        lines.push(`${nc.name} ${nc.n1} ${nc.n2} VF=${nc.vf}`);
        break;
      case "S":
        lines.push(
          `${nc.name} ${nc.n1} ${nc.n2} ${nc.state ? "CLOSED" : "OPEN"}`,
        );
        break;
    }
  }
  if (netlist.warnings.length > 0) {
    lines.push("");
    for (const w of netlist.warnings) lines.push(`* AVERT: ${w}`);
  }
  return lines.join("\n");
}

// ─── Format netlist component for dropdown ────────────────────────────────────

function fmtNetlistComp(nc: NetlistComponent): string {
  switch (nc.type) {
    case "R":
      return `${nc.name} — ${fmtOhm(nc.value)}`;
    case "C":
      return `${nc.name} — ${fmtFarad(nc.value)}`;
    case "L":
      return `${nc.name} — ${fmtHenry(nc.value)}`;
    case "V":
      return `${nc.name} — ${nc.value}V`;
    case "D":
      return `${nc.name} — LED ${nc.vf}V`;
    case "S":
      return `${nc.name} — ${nc.state ? UI.closed : UI.open}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── REDUCER / STATE ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

type ToolMode = "select" | "wire" | "place";
interface HistoryEntry {
  components: Component[];
  wires: Wire[];
}

function readPersistedTheme(): boolean {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "dark") return true;
    if (v === "light") return false;
  } catch {
    /* SSR */
  }
  return false;
}

interface AppState {
  components: Component[];
  wires: Wire[];
  selection: string[];
  tool: ToolMode;
  placingType: ComponentType | null;
  wirePoints: Vec2[];
  mouseWorld: Vec2;
  ghostPos: Vec2 | null;
  ghostRot: Rotation;
  showGrid: boolean;
  darkMode: boolean;
  history: HistoryEntry[];
  historyIdx: number;
}

type Action =
  | { type: "SET_TOOL"; tool: ToolMode; placingType?: ComponentType | null }
  | { type: "SET_MOUSE"; pos: Vec2 }
  | { type: "SET_GHOST"; pos: Vec2; rot?: Rotation }
  | { type: "ROTATE_GHOST" }
  | { type: "ADD_COMPONENT"; comp: Component }
  | { type: "ADD_WIRE"; wire: Wire }
  | { type: "SET_WIRE_POINTS"; pts: Vec2[] }
  | { type: "DELETE_SELECTED" }
  | { type: "SELECT"; ids: string[] }
  | { type: "MOVE_SELECTION"; dx: number; dy: number }
  | { type: "ROTATE_SELECTED" }
  | { type: "UPDATE_PROP"; id: string; key: string; value: unknown }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "LOAD"; components: Component[]; wires: Wire[] }
  | { type: "TOGGLE_GRID" }
  | { type: "TOGGLE_DARK" };

const initialState: AppState = {
  components: [],
  wires: [],
  selection: [],
  tool: "select",
  placingType: null,
  wirePoints: [],
  mouseWorld: { x: 0, y: 0 },
  ghostPos: null,
  ghostRot: 0,
  showGrid: true,
  darkMode: readPersistedTheme(),
  history: [{ components: [], wires: [] }],
  historyIdx: 0,
};

function cloneCircuit(s: AppState) {
  return {
    components: JSON.parse(JSON.stringify(s.components)),
    wires: JSON.parse(JSON.stringify(s.wires)),
  };
}
function cloneEntry(e: HistoryEntry) {
  return {
    components: JSON.parse(JSON.stringify(e.components)),
    wires: JSON.parse(JSON.stringify(e.wires)),
  };
}
function pushHistory(state: AppState): AppState {
  const entry = cloneCircuit(state);
  const history = [...state.history.slice(0, state.historyIdx + 1), entry];
  if (history.length > 80) history.shift();
  return { ...state, history, historyIdx: history.length - 1 };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_TOOL":
      return {
        ...state,
        tool: action.tool,
        placingType: action.placingType ?? null,
        wirePoints: [],
        selection: [],
        ghostPos: null,
      };
    case "SET_MOUSE":
      return { ...state, mouseWorld: action.pos };
    case "SET_GHOST":
      return {
        ...state,
        ghostPos: action.pos,
        ghostRot: action.rot ?? state.ghostRot,
      };
    case "ROTATE_GHOST":
      return { ...state, ghostRot: ((state.ghostRot + 90) % 360) as Rotation };
    case "ADD_COMPONENT":
      return pushHistory({
        ...state,
        components: [...state.components, action.comp],
      });
    case "ADD_WIRE":
      return pushHistory({ ...state, wires: [...state.wires, action.wire] });
    case "SET_WIRE_POINTS":
      return { ...state, wirePoints: action.pts };
    case "DELETE_SELECTED": {
      const ids = new Set(state.selection);
      return pushHistory({
        ...state,
        components: state.components.filter((c) => !ids.has(c.id)),
        wires: state.wires.filter((w) => !ids.has(w.id)),
        selection: [],
      });
    }
    case "SELECT":
      return { ...state, selection: action.ids };
    case "MOVE_SELECTION": {
      const ids = new Set(state.selection);
      return {
        ...state,
        components: state.components.map((c) =>
          ids.has(c.id)
            ? {
                ...c,
                position: {
                  x: c.position.x + action.dx,
                  y: c.position.y + action.dy,
                },
              }
            : c,
        ),
        wires: state.wires.map((w) =>
          ids.has(w.id)
            ? {
                ...w,
                points: w.points.map((p) => ({
                  x: p.x + action.dx,
                  y: p.y + action.dy,
                })),
              }
            : w,
        ),
      };
    }
    case "ROTATE_SELECTED": {
      const ids = new Set(state.selection);
      return pushHistory({
        ...state,
        components: state.components.map((c) =>
          ids.has(c.id)
            ? { ...c, rotation: ((c.rotation + 90) % 360) as Rotation }
            : c,
        ),
      });
    }
    case "UPDATE_PROP":
      return pushHistory({
        ...state,
        components: state.components.map((c) =>
          c.id === action.id
            ? { ...c, props: { ...c.props, [action.key]: action.value } }
            : c,
        ),
      });
    case "UNDO": {
      if (state.historyIdx <= 0) return state;
      const idx = state.historyIdx - 1;
      return {
        ...state,
        historyIdx: idx,
        ...cloneEntry(state.history[idx]),
        selection: [],
      };
    }
    case "REDO": {
      if (state.historyIdx >= state.history.length - 1) return state;
      const idx = state.historyIdx + 1;
      return {
        ...state,
        historyIdx: idx,
        ...cloneEntry(state.history[idx]),
        selection: [],
      };
    }
    case "LOAD":
      return pushHistory({
        ...state,
        components: action.components,
        wires: action.wires,
        selection: [],
        wirePoints: [],
      });
    case "TOGGLE_GRID":
      return { ...state, showGrid: !state.showGrid };
    case "TOGGLE_DARK": {
      const next = !state.darkMode;
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
      } catch {}
      return { ...state, darkMode: next };
    }
    default:
      return state;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── CANVAS RENDERER ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface DragBox {
  sx: number;
  sy: number;
  ex: number;
  ey: number;
}

function renderCanvas(
  ctx: CanvasRenderingContext2D,
  state: AppState,
  cam: Camera,
  hoverId: string | null,
  dragBox: DragBox | null,
): void {
  const W = ctx.canvas.width / (window.devicePixelRatio || 1);
  const H = ctx.canvas.height / (window.devicePixelRatio || 1);
  const dark = state.darkMode;

  const bg = dark ? "#0a0c14" : "#ffffff";
  const gridLine = dark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.07)";
  const gridAccent = dark ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.18)";
  const wireCol = dark ? "#94a3b8" : "#1e293b";
  const juncCol = dark ? "#e2e8f0" : "#1e293b";
  const termAlpha = dark ? "rgba(96,165,250,.5)" : "rgba(37,99,235,.45)";

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  if (state.showGrid) {
    const tl = s2w(0, 0, cam),
      br = s2w(W, H, cam);
    const startX = Math.floor(tl.x / GRID) * GRID,
      startY = Math.floor(tl.y / GRID) * GRID;
    ctx.lineWidth = 0.5;
    for (let x = startX; x <= br.x + GRID; x += GRID) {
      ctx.strokeStyle = x % (GRID * 5) === 0 ? gridAccent : gridLine;
      const px = x * cam.z + cam.x;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, H);
      ctx.stroke();
    }
    for (let y = startY; y <= br.y + GRID; y += GRID) {
      ctx.strokeStyle = y % (GRID * 5) === 0 ? gridAccent : gridLine;
      const py = y * cam.z + cam.y;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(W, py);
      ctx.stroke();
    }
  }

  for (const wire of state.wires) {
    const sel = state.selection.includes(wire.id);
    const hov = hoverId === wire.id;
    ctx.strokeStyle = sel ? colSel : hov ? colHov : wireCol;
    ctx.lineWidth = sel || hov ? 2.5 : 1.8;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    const pts = wire.points.map((p) => w2s(p.x, p.y, cam));
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  for (const comp of state.components) {
    const def = COMPONENT_DEFS[comp.type];
    if (!def) continue;
    const sel = state.selection.includes(comp.id);
    const hov = hoverId === comp.id;
    const sp = w2s(comp.position.x, comp.position.y, cam);

    if (sel) {
      const ts = termWorlds(comp);
      const allX = [comp.position.x, ...ts.map((t) => t.x)];
      const allY = [comp.position.y, ...ts.map((t) => t.y)];
      const pad = GRID;
      const tl = w2s(Math.min(...allX) - pad, Math.min(...allY) - pad, cam);
      const br = w2s(Math.max(...allX) + pad, Math.max(...allY) + pad, cam);
      ctx.strokeStyle = "rgba(37,99,235,.35)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
      ctx.setLineDash([]);
    }

    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate((comp.rotation * Math.PI) / 180);
    ctx.scale(cam.z, cam.z);
    def.draw(ctx, comp, sel, hov);
    ctx.restore();

    for (const t of termWorlds(comp)) {
      const ts = w2s(t.x, t.y, cam);
      ctx.beginPath();
      ctx.arc(ts.x, ts.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = sel
        ? "rgba(37,99,235,.8)"
        : hov
          ? "rgba(124,58,237,.6)"
          : termAlpha;
      ctx.fill();
    }
  }

  for (const j of findJunctions(state.components, state.wires)) {
    const js = w2s(j.x, j.y, cam);
    ctx.beginPath();
    ctx.arc(js.x, js.y, 4.5 * cam.z, 0, Math.PI * 2);
    ctx.fillStyle = juncCol;
    ctx.fill();
  }

  if (state.tool === "wire" && state.wirePoints.length > 0) {
    const endPt = snapToNearby(state.components, state.wires, state.mouseWorld);
    const chain = [...state.wirePoints, endPt];
    ctx.strokeStyle = "rgba(37,99,235,.75)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.lineCap = "round";
    ctx.beginPath();
    let first = true;
    for (let i = 0; i < chain.length - 1; i++) {
      const seg = orthoRoute(chain[i], chain[i + 1]);
      for (let j = 0; j < seg.length; j++) {
        const sp = w2s(seg[j].x, seg[j].y, cam);
        if (j === 0 && first) {
          ctx.moveTo(sp.x, sp.y);
          first = false;
        } else ctx.lineTo(sp.x, sp.y);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
    const fs = w2s(state.wirePoints[0].x, state.wirePoints[0].y, cam);
    ctx.beginPath();
    ctx.arc(fs.x, fs.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = colSel;
    ctx.fill();
    const ep = w2s(endPt.x, endPt.y, cam);
    ctx.beginPath();
    ctx.arc(ep.x, ep.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(37,99,235,.55)";
    ctx.fill();
  }

  if (state.tool === "place" && state.ghostPos && state.placingType) {
    const def = COMPONENT_DEFS[state.placingType];
    const sp = w2s(state.ghostPos.x, state.ghostPos.y, cam);
    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate((state.ghostRot * Math.PI) / 180);
    ctx.scale(cam.z, cam.z);
    ctx.globalAlpha = 0.45;
    def.draw(
      ctx,
      {
        id: "__ghost__",
        type: state.placingType,
        position: { x: 0, y: 0 },
        rotation: 0,
        props: def.defaultProps,
      },
      false,
      false,
    );
    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.strokeStyle = "rgba(37,99,235,.18)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(sp.x, 0);
    ctx.lineTo(sp.x, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, sp.y);
    ctx.lineTo(W, sp.y);
    ctx.stroke();
  }

  if (dragBox) {
    const x = Math.min(dragBox.sx, dragBox.ex),
      y = Math.min(dragBox.sy, dragBox.ey);
    const w = Math.abs(dragBox.ex - dragBox.sx),
      h = Math.abs(dragBox.ey - dragBox.sy);
    ctx.fillStyle = "rgba(37,99,235,.07)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(37,99,235,.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── COMPONENT PROPERTY RENDERER ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface ComponentPropertyRendererProps {
  comp: Component;
  dark: boolean;
  dispatch: React.Dispatch<Action>;
}

function ComponentPropertyRenderer({
  comp,
  dark,
  dispatch,
}: ComponentPropertyRendererProps) {
  const schema = PROP_SCHEMAS[comp.type];
  const entries = Object.entries(schema);

  const textMuted = dark ? "#64748b" : "#6b7280";
  const inputBase: React.CSSProperties = {
    width: "100%",
    padding: "5px 8px",
    fontSize: 12,
    fontFamily: "'JetBrains Mono',monospace",
    borderRadius: 5,
    border: dark ? "1px solid #1e293b" : "1px solid #d1d5db",
    background: dark ? "#0f172a" : "#f9fafb",
    color: dark ? "#e2e8f0" : "#111827",
    outline: "none",
    boxSizing: "border-box",
  };

  if (entries.length === 0) {
    return (
      <p style={{ fontSize: 11, color: textMuted, fontFamily: "monospace" }}>
        {UI.noProps}
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {entries.map(([key, field]) => {
        const value = comp.props[key];
        return (
          <div
            key={key}
            style={{ display: "flex", flexDirection: "column", gap: 3 }}
          >
            <label
              style={{
                fontSize: 10,
                fontFamily: "monospace",
                letterSpacing: "0.05em",
                color: textMuted,
              }}
            >
              {field.label}
            </label>

            {field.type === "boolean" ? (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <div
                  role="checkbox"
                  aria-checked={value as boolean}
                  tabIndex={0}
                  onClick={() =>
                    dispatch({
                      type: "UPDATE_PROP",
                      id: comp.id,
                      key,
                      value: !(value as boolean),
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter")
                      dispatch({
                        type: "UPDATE_PROP",
                        id: comp.id,
                        key,
                        value: !(value as boolean),
                      });
                  }}
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: 10,
                    position: "relative",
                    cursor: "pointer",
                    flexShrink: 0,
                    background: value
                      ? "#2563eb"
                      : dark
                        ? "#334155"
                        : "#d1d5db",
                    transition: "background .15s",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 3,
                      left: value ? 18 : 3,
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left .15s",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: "monospace",
                    color: dark ? "#94a3b8" : "#374151",
                  }}
                >
                  {value ? UI.closed : UI.open}
                </span>
              </label>
            ) : field.type === "select" ? (
              <select
                value={value as string}
                onChange={(e) =>
                  dispatch({
                    type: "UPDATE_PROP",
                    id: comp.id,
                    key,
                    value: e.target.value,
                  })
                }
                style={inputBase}
              >
                {(field as SelectField).options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                value={value as number}
                min={(field as NumberField).min}
                step={(field as NumberField).step}
                style={inputBase}
                onChange={(e) =>
                  dispatch({
                    type: "UPDATE_PROP",
                    id: comp.id,
                    key,
                    value: parseFloat(e.target.value) || 0,
                  })
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── COMPONENT PROPERTY POPOVER ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface ComponentPopoverProps {
  comp: Component | null;
  anchorScreen: Vec2 | null;
  canvasRect: DOMRect | null;
  dark: boolean;
  dispatch: React.Dispatch<Action>;
}

function ComponentPopover({
  comp,
  anchorScreen,
  canvasRect,
  dark,
  dispatch,
}: ComponentPopoverProps) {
  const open = comp !== null && anchorScreen !== null;
  const def = comp ? COMPONENT_DEFS[comp.type] : null;

  const absAnchor =
    anchorScreen && canvasRect
      ? {
          x: Math.max(
            8,
            Math.min(window.innerWidth - 8, canvasRect.left + anchorScreen.x),
          ),
          y: Math.max(
            8,
            Math.min(window.innerHeight - 8, canvasRect.top + anchorScreen.y),
          ),
        }
      : null;

  const popBg = dark ? "#0f172a" : "#ffffff";
  const border = dark ? "1px solid #1e293b" : "1px solid #e5e7eb";
  const shadow = dark
    ? "0 8px 32px rgba(0,0,0,.6)"
    : "0 4px 24px rgba(0,0,0,.12)";
  const textPri = dark ? "#e2e8f0" : "#111827";
  const textMut = dark ? "#64748b" : "#6b7280";
  const actBase: React.CSSProperties = {
    width: "100%",
    background: "transparent",
    border,
    color: textMut,
    borderRadius: 5,
    padding: "5px 8px",
    fontSize: 11,
    fontFamily: "'JetBrains Mono',monospace",
    cursor: "pointer",
    textAlign: "left",
    marginBottom: 4,
  };

  return (
    <PopoverPrimitive.Root open={open}>
      <PopoverPrimitive.Anchor
        style={{
          position: "fixed",
          left: absAnchor?.x ?? 0,
          top: absAnchor?.y ?? 0,
          width: 0,
          height: 0,
          pointerEvents: "none",
        }}
      />

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="right"
          sideOffset={20}
          align="center"
          avoidCollisions
          collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={() => dispatch({ type: "SELECT", ids: [] })}
          onEscapeKeyDown={() => dispatch({ type: "SELECT", ids: [] })}
          style={{
            width: 224,
            background: popBg,
            border,
            borderRadius: 10,
            boxShadow: shadow,
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            zIndex: 1000,
            fontFamily: "'JetBrains Mono',monospace",
          }}
        >
          {comp && def && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 2,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    background: `${def.color}20`,
                    color: def.color,
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {def.symbol}
                </span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontSize: 13, fontWeight: 600, color: textPri }}
                  >
                    {def.label}
                  </div>
                  <div style={{ fontSize: 9, color: textMut }}>{comp.id}</div>
                </div>
                <PopoverPrimitive.Close
                  onClick={() => dispatch({ type: "SELECT", ids: [] })}
                  aria-label="Fermer"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: textMut,
                    cursor: "pointer",
                    fontSize: 16,
                    lineHeight: 1,
                    padding: "2px 4px",
                    borderRadius: 3,
                  }}
                >
                  ×
                </PopoverPrimitive.Close>
              </div>

              <div style={{ fontSize: 9.5, color: textMut, lineHeight: 1.8 }}>
                pos ({Math.round(comp.position.x)},{" "}
                {Math.round(comp.position.y)}) · rot {comp.rotation}°
              </div>

              <ComponentPropertyRenderer
                comp={comp}
                dark={dark}
                dispatch={dispatch}
              />

              <div
                style={{
                  borderTop: dark ? "1px solid #1e293b" : "1px solid #e5e7eb",
                  paddingTop: 8,
                  marginTop: 2,
                }}
              >
                <button
                  style={actBase}
                  onClick={() => dispatch({ type: "ROTATE_SELECTED" })}
                >
                  {UI.rotate}
                </button>
                <button
                  style={{ ...actBase, color: "#dc2626", marginBottom: 0 }}
                  onClick={() => dispatch({ type: "DELETE_SELECTED" })}
                >
                  {UI.deleteComp}
                </button>
              </div>
            </>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── NETLIST MODAL ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface NetlistModalProps {
  circuit: Circuit;
  dark: boolean;
  onClose: () => void;
}

function NetlistModal({ circuit, dark, onClose }: NetlistModalProps) {
  const netlist = generateNetlist(circuit);
  const text = netlistToString(netlist);
  const [copied, setCopied] = useState(false);

  const copy = () =>
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });

  const bg = dark ? "#0f172a" : "#ffffff";
  const border = dark ? "1px solid #1e293b" : "1px solid #e5e7eb";
  const textPri = dark ? "#e2e8f0" : "#111827";
  const textMut = dark ? "#64748b" : "#6b7280";
  const codeBg = dark ? "#080a12" : "#f9fafb";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560,
          maxHeight: "80vh",
          background: bg,
          borderRadius: 12,
          border,
          boxShadow: "0 16px 48px rgba(0,0,0,.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "'JetBrains Mono',monospace",
        }}
      >
        <div
          style={{
            padding: "13px 16px",
            borderBottom: border,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: textPri }}>
            {UI.netlistTitle}
          </span>
          <div style={{ flex: 1 }} />
          {netlist.warnings.length > 0 && (
            <span
              style={{
                fontSize: 10,
                color: "#b45309",
                background: "#fef3c7",
                borderRadius: 4,
                padding: "2px 8px",
              }}
            >
              {UI.warnings(netlist.warnings.length)}
            </span>
          )}
          <button
            onClick={copy}
            style={{
              fontSize: 11,
              color: copied ? "#15803d" : "#2563eb",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            {copied ? UI.copied : UI.copy}
          </button>
          <button
            onClick={onClose}
            style={{
              fontSize: 16,
              color: textMut,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            padding: "8px 16px",
            borderBottom: border,
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 10, color: textMut }}>
            {UI.nodes}{" "}
            <strong style={{ color: textPri }}>
              {netlist.nodes.join(", ") || "—"}
            </strong>
          </span>
          <span style={{ fontSize: 10, color: textMut }}>
            {UI.elements}{" "}
            <strong style={{ color: textPri }}>
              {netlist.components.length}
            </strong>
          </span>
        </div>

        <pre
          style={{
            flex: 1,
            overflowY: "auto",
            margin: 0,
            padding: "12px 16px",
            fontSize: 12,
            lineHeight: 1.9,
            color: textPri,
            background: codeBg,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {text || UI.emptyCircuit}
        </pre>

        {netlist.warnings.length > 0 && (
          <div
            style={{
              padding: "10px 16px",
              borderTop: border,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {netlist.warnings.map((w, i) => (
              <div
                key={i}
                style={{
                  fontSize: 10,
                  color: "#b45309",
                  fontFamily: "monospace",
                }}
              >
                ⚠ {w}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── CIRCUIT CANVAS ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface MoveDrag {
  type: "move";
  startWorld: Vec2;
  lastDx: number;
  lastDy: number;
}
interface BoxDrag {
  type: "box";
  startScreen: Vec2;
}
type DragState = MoveDrag | BoxDrag;

interface CircuitCanvasProps {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  cam: Camera;
  setCam: React.Dispatch<React.SetStateAction<Camera>>;
  onComponentClick: (compId: string, canvasRelativeScreen: Vec2) => void;
}

function CircuitCanvas({
  state,
  dispatch,
  cam,
  setCam,
  onComponentClick,
}: CircuitCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [dragBox, setDragBox] = useState<DragBox | null>(null);

  const dragRef = useRef<DragState | null>(null);
  const panRef = useRef<{ lx: number; ly: number } | null>(null);
  const stateRef = useRef(state);
  const camRef = useRef(cam);
  stateRef.current = state;
  camRef.current = cam;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      canvas.getContext("2d")!.scale(dpr, dpr);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderCanvas(ctx, state, cam, hoverId, dragBox);
  });

  const getWorld = useCallback((e: React.MouseEvent): Vec2 => {
    const r = canvasRef.current!.getBoundingClientRect();
    return s2w(e.clientX - r.left, e.clientY - r.top, camRef.current);
  }, []);
  const getScreen = useCallback((e: React.MouseEvent): Vec2 => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }, []);

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const r = canvasRef.current!.getBoundingClientRect();
      const sx = e.clientX - r.left,
        sy = e.clientY - r.top;
      const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setCam((c) => {
        const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, c.z * f));
        return {
          x: sx - (sx - c.x) * (z / c.z),
          y: sy - (sy - c.y) * (z / c.z),
          z,
        };
      });
    },
    [setCam],
  );
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const world = getWorld(e);
      const screen = getScreen(e);
      dispatch({ type: "SET_MOUSE", pos: world });

      if (panRef.current) {
        setCam((c) => ({
          ...c,
          x: c.x + e.clientX - panRef.current!.lx,
          y: c.y + e.clientY - panRef.current!.ly,
        }));
        panRef.current = { lx: e.clientX, ly: e.clientY };
        return;
      }
      const st = stateRef.current;
      if (st.tool === "place")
        dispatch({
          type: "SET_GHOST",
          pos: snapToNearby(st.components, st.wires, world),
        });

      if (dragRef.current?.type === "move") {
        const dr = dragRef.current as MoveDrag;
        const dx = world.x - dr.startWorld.x,
          dy = world.y - dr.startWorld.y;
        const sdx = snap(dx) - dr.lastDx,
          sdy = snap(dy) - dr.lastDy;
        if (sdx !== 0 || sdy !== 0) {
          dispatch({ type: "MOVE_SELECTION", dx: sdx, dy: sdy });
          dr.lastDx += sdx;
          dr.lastDy += sdy;
        }
        return;
      }
      if (dragRef.current?.type === "box") {
        const dr = dragRef.current as BoxDrag;
        setDragBox({
          sx: dr.startScreen.x,
          sy: dr.startScreen.y,
          ex: screen.x,
          ey: screen.y,
        });
        const c2 = camRef.current;
        const tl = s2w(
          Math.min(dr.startScreen.x, screen.x),
          Math.min(dr.startScreen.y, screen.y),
          c2,
        );
        const br = s2w(
          Math.max(dr.startScreen.x, screen.x),
          Math.max(dr.startScreen.y, screen.y),
          c2,
        );
        const ids = st.components
          .filter(
            (c) =>
              c.position.x >= tl.x &&
              c.position.x <= br.x &&
              c.position.y >= tl.y &&
              c.position.y <= br.y,
          )
          .map((c) => c.id);
        dispatch({ type: "SELECT", ids });
        return;
      }
      setHoverId(hitTest(st.components, st.wires, world));
    },
    [dispatch, getWorld, getScreen, setCam],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        panRef.current = { lx: e.clientX, ly: e.clientY };
        return;
      }
      if (e.button !== 0) return;

      const world = getWorld(e);
      const screen = getScreen(e);
      const st = stateRef.current;

      if (st.tool === "place" && st.ghostPos && st.placingType) {
        const def = COMPONENT_DEFS[st.placingType];
        dispatch({
          type: "ADD_COMPONENT",
          comp: {
            id: uid(),
            type: st.placingType,
            position: { ...st.ghostPos },
            rotation: st.ghostRot,
            props: JSON.parse(JSON.stringify(def.defaultProps)),
          },
        });
        return;
      }

      if (st.tool === "wire") {
        const pt = snapToNearby(st.components, st.wires, world);
        if (e.detail === 2) {
          if (st.wirePoints.length >= 1) {
            const chain = [...st.wirePoints, pt];
            const wirePts: Vec2[] = [];
            for (let i = 0; i < chain.length - 1; i++)
              wirePts.push(...orthoRoute(chain[i], chain[i + 1]).slice(0, -1));
            wirePts.push(chain[chain.length - 1]);
            if (wirePts.length >= 2)
              dispatch({
                type: "ADD_WIRE",
                wire: { id: uid(), points: wirePts },
              });
          }
          dispatch({ type: "SET_WIRE_POINTS", pts: [] });
          return;
        }
        dispatch({ type: "SET_WIRE_POINTS", pts: [...st.wirePoints, pt] });
        return;
      }

      if (st.tool === "select") {
        const hit = hitTest(st.components, st.wires, world);
        if (hit) {
          const isComp = st.components.some((c) => c.id === hit);
          if (!e.shiftKey && !st.selection.includes(hit))
            dispatch({ type: "SELECT", ids: [hit] });
          else if (e.shiftKey)
            dispatch({
              type: "SELECT",
              ids: st.selection.includes(hit)
                ? st.selection.filter((x) => x !== hit)
                : [...st.selection, hit],
            });
          if (isComp && !e.shiftKey) onComponentClick(hit, screen);
          dragRef.current = {
            type: "move",
            startWorld: world,
            lastDx: 0,
            lastDy: 0,
          };
        } else {
          if (!e.shiftKey) dispatch({ type: "SELECT", ids: [] });
          dragRef.current = { type: "box", startScreen: screen };
        }
      }
    },
    [dispatch, getWorld, getScreen, onComponentClick],
  );

  const onMouseUp = useCallback(() => {
    panRef.current = null;
    dragRef.current = null;
    setDragBox(null);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      const st = stateRef.current;
      if (e.key === "Escape") {
        if (st.tool === "wire") dispatch({ type: "SET_WIRE_POINTS", pts: [] });
        else if (st.tool === "place")
          dispatch({ type: "SET_TOOL", tool: "select" });
        else dispatch({ type: "SELECT", ids: [] });
        return;
      }
      if (e.key === "r" || e.key === "R") {
        if (st.tool === "place") dispatch({ type: "ROTATE_GHOST" });
        else if (st.selection.length > 0) dispatch({ type: "ROTATE_SELECTED" });
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (st.selection.length > 0) dispatch({ type: "DELETE_SELECTED" });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        dispatch({ type: "UNDO" });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        dispatch({ type: "REDO" });
        return;
      }
      if (e.key === "w" || e.key === "W")
        dispatch({ type: "SET_TOOL", tool: "wire" });
      if (e.key === "s" || e.key === "S")
        dispatch({ type: "SET_TOOL", tool: "select" });
      if (e.key === "g" || e.key === "G") dispatch({ type: "TOGGLE_GRID" });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch]);

  const cursor =
    state.tool === "wire"
      ? "crosshair"
      : state.tool === "place"
        ? "none"
        : "default";

  return (
    <canvas
      ref={canvasRef}
      style={{
        flex: 1,
        display: "block",
        width: "100%",
        height: "100%",
        cursor,
      }}
      onMouseMove={onMouseMove}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── PALETTE ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const PALETTE_GROUPS: { label: string; items: ComponentType[] }[] = [
  { label: UI.passive, items: ["resistor", "capacitor", "inductor"] },
  { label: UI.sources, items: ["vsource", "ground"] },
  { label: UI.active, items: ["switch", "led"] },
];

function Palette({
  state,
  dispatch,
}: {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}) {
  const dark = state.darkMode;
  const bg = dark ? "#0e1120" : "#fafafa";
  const bdr = dark ? "1px solid #1e293b" : "1px solid #e5e7eb";
  const sec = dark ? "#374151" : "#9ca3af";

  const btn = (active: boolean): React.CSSProperties => ({
    width: "100%",
    textAlign: "left",
    background: active ? (dark ? "#0f1f40" : "#eff6ff") : "transparent",
    border: "none",
    color: active ? "#2563eb" : dark ? "#64748b" : "#374151",
    padding: "5px 8px",
    borderRadius: 5,
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "'JetBrains Mono',monospace",
    fontWeight: active ? 600 : 400,
    display: "flex",
    alignItems: "center",
    gap: 7,
  });
  const ico = (color: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 18,
    height: 18,
    borderRadius: 3,
    background: `${color}20`,
    color,
    fontSize: 9,
    fontWeight: 700,
    flexShrink: 0,
  });

  return (
    <div
      style={{
        width: 168,
        background: bg,
        borderRight: bdr,
        display: "flex",
        flexDirection: "column",
        padding: "10px 6px",
        gap: 2,
        overflowY: "auto",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.15em",
          color: sec,
          fontWeight: 700,
          marginBottom: 6,
          paddingLeft: 4,
          fontFamily: "monospace",
        }}
      >
        {UI.sandboxTitle}
      </div>

      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.1em",
          color: sec,
          fontWeight: 700,
          margin: "4px 0 3px 4px",
          fontFamily: "monospace",
        }}
      >
        {UI.toolsHeader}
      </div>
      <button
        style={btn(state.tool === "select")}
        onClick={() => dispatch({ type: "SET_TOOL", tool: "select" })}
      >
        <span style={ico("#2563eb")}>↖</span> {UI.select}
      </button>
      <button
        style={btn(state.tool === "wire")}
        onClick={() => dispatch({ type: "SET_TOOL", tool: "wire" })}
      >
        <span style={ico("#7c3aed")}>⌐</span> {UI.wire}
      </button>

      {PALETTE_GROUPS.map((g) => (
        <div key={g.label}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.1em",
              color: sec,
              fontWeight: 700,
              margin: "10px 0 3px 4px",
              fontFamily: "monospace",
            }}
          >
            {g.label}
          </div>
          {g.items.map((t) => {
            const def = COMPONENT_DEFS[t];
            const active = state.tool === "place" && state.placingType === t;
            return (
              <button
                key={t}
                style={btn(active)}
                onClick={() =>
                  dispatch({ type: "SET_TOOL", tool: "place", placingType: t })
                }
              >
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

// ═══════════════════════════════════════════════════════════════════════════════
// ─── CIRCUITS EXEMPLES ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface ExampleCircuit { label: string; circuit: Circuit; }

const EXAMPLE_CIRCUITS: ExampleCircuit[] = [
  {
    label: "LED + Interrupteur",
    circuit: {
      components: [
        // Source 5 V  (bornes : haut=+, bas=-)
        { id:"ex_v",   type:"vsource",  position:{ x:192, y:144 }, rotation:0,   props:{ voltage:5 } },
        // Interrupteur (ouvert par défaut)
        { id:"ex_sw",  type:"switch",   position:{ x:288, y:96  }, rotation:0,   props:{ closed:false } },
        // Résistance de protection 220 Ω
        { id:"ex_r",   type:"resistor", position:{ x:432, y:96  }, rotation:0,   props:{ resistance:220 } },
        // LED rouge Vf = 2 V
        { id:"ex_led", type:"led",      position:{ x:576, y:96  }, rotation:0,   props:{ color:"red", forwardVoltage:2.0 } },
        // Masse
        { id:"ex_gnd", type:"ground",   position:{ x:408, y:312 }, rotation:0,   props:{} },
      ] as Component[],
      wires: [
        // V+ (192,96) → SW gauche (240,96)
        { id:"ex_w1", points:[{ x:192, y:96  }, { x:240, y:96  }] },
        // SW droite (336,96) → R gauche (384,96)
        { id:"ex_w2", points:[{ x:336, y:96  }, { x:384, y:96  }] },
        // R droite (480,96) → LED anode (528,96)
        { id:"ex_w3", points:[{ x:480, y:96  }, { x:528, y:96  }] },
        // LED cathode (624,96) → bas (624,288) → GND (408,288)
        { id:"ex_w4", points:[{ x:624, y:96  }, { x:624, y:288 }, { x:408, y:288 }] },
        // V- (192,192) → bas (192,288) → GND (408,288)
        { id:"ex_w5", points:[{ x:192, y:192 }, { x:192, y:288 }, { x:408, y:288 }] },
        // V+ côté gauche : V borne haute (192,96) déjà dans w1
      ],
    },
  },
  {
    label: "RC — charge condensateur",
    circuit: {
      components: [
        { id:"rc_v",   type:"vsource",  position:{ x:192, y:144 }, rotation:0,   props:{ voltage:5 } },
        { id:"rc_sw",  type:"switch",   position:{ x:288, y:96  }, rotation:0,   props:{ closed:false } },
        { id:"rc_r",   type:"resistor", position:{ x:432, y:96  }, rotation:0,   props:{ resistance:1000 } },
        { id:"rc_c",   type:"capacitor",position:{ x:576, y:192 }, rotation:90,  props:{ capacitance:1e-6 } },
        { id:"rc_gnd", type:"ground",   position:{ x:408, y:312 }, rotation:0,   props:{} },
      ] as Component[],
      wires: [
        { id:"rc_w1", points:[{ x:192, y:96  }, { x:240, y:96  }] },
        { id:"rc_w2", points:[{ x:336, y:96  }, { x:384, y:96  }] },
        { id:"rc_w3", points:[{ x:480, y:96  }, { x:576, y:96  }, { x:576, y:144 }] },
        { id:"rc_w4", points:[{ x:576, y:240 }, { x:576, y:288 }, { x:408, y:288 }] },
        { id:"rc_w5", points:[{ x:192, y:192 }, { x:192, y:288 }, { x:408, y:288 }] },
      ],
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ─── TOOLBAR ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface ToolbarProps {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  cam: Camera;
  onShowNetlist: () => void;
}

function Toolbar({ state, dispatch, cam, onShowNetlist }: ToolbarProps) {
  const dark = state.darkMode;
  const bg   = dark ? "#0e1120" : "#ffffff";
  const bdr  = dark ? "1px solid #1e293b" : "1px solid #e5e7eb";
  const [exOpen, setExOpen] = useState(false);

  const btn: React.CSSProperties = {
    background: "transparent",
    border: "none",
    color: dark ? "#64748b" : "#6b7280",
    fontSize: 11,
    fontFamily: "'JetBrains Mono',monospace",
    padding: "4px 8px",
    borderRadius: 4,
    cursor: "pointer",
  };
  const sep: React.CSSProperties = {
    width: 1,
    height: 18,
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
    dispatch({ type:"LOAD", components: ex.circuit.components, wires: ex.circuit.wires });
    dispatch({ type:"SELECT", ids:[] });
    setExOpen(false);
  };

  return (
    <div
      style={{
        height: 40,
        background: bg,
        borderBottom: bdr,
        display: "flex",
        alignItems: "center",
        padding: "0 10px",
        gap: 3,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: 9.5,
          letterSpacing: "0.15em",
          color: dark ? "#3a4060" : "#9ca3af",
          fontWeight: 700,
          fontFamily: "monospace",
          marginRight: 6,
        }}
      >
        {UI.appTitle}
      </span>
      <button style={btn} onClick={() => dispatch({ type: "UNDO" })}>
        {UI.undo}
      </button>
      <button style={btn} onClick={() => dispatch({ type: "REDO" })}>
        {UI.redo}
      </button>
      <div style={sep} />
      <button
        style={{ ...btn, color: state.showGrid ? "#2563eb" : undefined }}
        onClick={() => dispatch({ type: "TOGGLE_GRID" })}
      >
        {state.showGrid ? UI.gridOn : UI.gridOff}
      </button>
      <button style={btn} onClick={() => dispatch({ type: "TOGGLE_DARK" })}>
        {dark ? UI.light : UI.dark}
      </button>
      <div style={sep} />
      <button
        style={{ ...btn, color: "#2563eb", fontWeight: 600 }}
        onClick={onShowNetlist}
      >
        {UI.netlistBtn}
      </button>
      <div style={sep} />

      {/* ── Bouton Exemples ───────────────────────────────────────────────── */}
      <div style={{ position:"relative" }}>
        <button
          style={{ ...btn, color:"#7c3aed", fontWeight:600 }}
          onClick={() => setExOpen(o => !o)}
        >
           Exemple {exOpen ? "▲" : "▼"}
        </button>
        {exOpen && (
          <div
            style={{
              position:"absolute", top:"100%", left:0, zIndex:500,
              background: dark?"#0f172a":"#ffffff",
              border: dark?"1px solid #1e293b":"1px solid #e5e7eb",
              borderRadius:8, boxShadow:"0 8px 24px rgba(0,0,0,.18)",
              minWidth:220, padding:"6px 0", marginTop:4,
            }}
          >
            {EXAMPLE_CIRCUITS.map(ex => (
              <button
                key={ex.label}
                onClick={() => loadExample(ex)}
                style={{
                  display:"block", width:"100%", textAlign:"left",
                  background:"transparent", border:"none", cursor:"pointer",
                  padding:"8px 14px", fontSize:11,
                  fontFamily:"'JetBrains Mono',monospace",
                  color: dark?"#94a3b8":"#374151",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = dark?"#1e293b":"#f3f4f6")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {ex.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={sep} />
      <button style={{ ...btn, color:"#dc2626" }} onClick={handleClear}>{UI.clearBtn}</button>
      <div style={{ flex:1 }} />
      <span style={{ fontSize:10, color:dark?"#3a4060":"#9ca3af", fontFamily:"monospace" }}>{Math.round(cam.z*100)}%</span>
    </div>
  );
}

// ─── Status Bar ───────────────────────────────────────────────────────────────

function StatusBar({ state }: { state: AppState }) {
  const dark = state.darkMode;
  const tips: Record<ToolMode, string> = {
    select: UI.tipSelect,
    wire: UI.tipWire,
    place: UI.tipPlace(state.placingType ?? ""),
  };
  return (
    <div
      style={{
        height: 24,
        background: dark ? "#07090f" : "#f3f4f6",
        borderTop: dark ? "1px solid #1e293b" : "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        padding: "0 10px",
        gap: 14,
        fontSize: 10,
        fontFamily: "'JetBrains Mono',monospace",
        color: dark ? "#2a3050" : "#9ca3af",
        flexShrink: 0,
      }}
    >
      <span>{tips[state.tool]}</span>
      <div style={{ flex: 1 }} />
      <span>
        x:{Math.round(state.mouseWorld.x)} y:{Math.round(state.mouseWorld.y)}
      </span>
      <span>
        {state.components.length} comp · {state.wires.length} fils
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── COURANT PAR FIL ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface CircuitCurrents {
  wireCurrents: Map<string, number>; // wireId  → ampères signés
  componentCurrents: Map<string, number>; // compId  → ampères signés
}

function computeCircuitCurrents(
  circuit: Circuit,
  liveNetlist: Netlist,
  simResult: SimResult,
): CircuitCurrents {
  const { componentNodes, componentNames } = liveNetlist;

  // ── Courant par composant ──────────────────────────────────────────────────────
  const componentCurrents = new Map<string, number>();
  for (const comp of circuit.components) {
    const nodes = componentNodes.get(comp.id);
    if (!nodes) continue;
    const [n1, n2] = nodes;
    const v1 = n1 === "0" ? 0 : (simResult.nodeVoltages[`node${n1}`] ?? 0);
    const v2 = n2 === "0" ? 0 : (simResult.nodeVoltages[`node${n2}`] ?? 0);
    let I = 0;
    switch (comp.type) {
      case "resistor": I = (v1 - v2) / ((comp.props.resistance as number) || 1); break;
      case "switch":   I = (comp.props.closed as boolean) ? (v1 - v2) / 0.001 : 0; break;
      case "vsource": {
        // Convention MNA : la variable J dans la matrice est telle que
        //   J = courant "quittant n1 via la branche source" dans Gx=b.
        // Pour une source qui fournit du courant, J < 0
        //   (5mA quittent n1 via résistance → J = -5mA pour équilibrer KCL).
        //
        // On utilise J directement (SANS négation) :
        //   I = J < 0  →  dots de T1(−) vers T0(+) sur le corps de la source ✓
        //               →  formule de signe sur les fils cohérente avec les passifs ✓
        const name = componentNames.get(comp.id);
        I = name ? (simResult.sourceCurrents[name] ?? 0) : 0;
        break;
      }
      case "led": {
        // Modèle Norton (Led.ts) : I = (V_n1 - V_n2 - Vf) / Rs
        // Courant positif = sens direct (anode terminal[0] → cathode terminal[1]).
        // Courant négatif ou nul = LED bloquée ou inversée → on clamp à 0.
        const vf = comp.props.forwardVoltage as number;
        const rs = 10; // seriesResistance dans Led.ts (défaut)
        const raw = (v1 - v2 - vf) / rs;
        I = raw > 0 ? raw : 0;
        break;
      }
      default:
        I = 0;
    }
    componentCurrents.set(comp.id, I);
  }

  // ── Passe 1 : fils touchant une borne de composant (direction correcte) ────────
  //
  // Règle de signe :
  //   I_comp > 0  ↔  courant conventionnel de T0 → T1 à travers le composant.
  //
  //   Au terminal T0 (entrée) : le courant entre dans le composant
  //     → le fil doit amener les dots VERS T0
  //   Au terminal T1 (sortie) : le courant sort du composant
  //     → le fil doit emmener les dots LOIN de T1
  //
  //   wireEndIdx = 0  si points[0]    est près du terminal
  //   wireEndIdx = 1  si points[last] est près du terminal
  //
  //   sign = termIdx !== wireEndIdx ? +1 : -1
  //   (quand le bout de connexion est "à l'opposé" du sens naturel du fil, on garde;
  //    sinon on inverse)
  const wireCurrents = new Map<string, number>();
  for (const wire of circuit.wires) {
    let bestCurrent = 0;
    let bestMag     = 0;
    const firstPt   = wire.points[0];
    const lastPt    = wire.points[wire.points.length - 1];

    for (const comp of circuit.components) {
      const terms  = termWorlds(comp);
      const I_comp = componentCurrents.get(comp.id) ?? 0;
      if (Math.abs(I_comp) < 1e-9) continue;

      for (let termIdx = 0; termIdx < terms.length; termIdx++) {
        const tw        = terms[termIdx];
        const firstNear = dist(firstPt, tw) < GRID * 0.6;
        const lastNear  = dist(lastPt,  tw) < GRID * 0.6;
        if (!firstNear && !lastNear) continue;

        const wireEndIdx = firstNear ? 0 : 1;
        const sign       = termIdx !== wireEndIdx ? 1 : -1;
        const signedI    = sign * I_comp;

        if (Math.abs(signedI) > bestMag) {
          bestMag     = Math.abs(signedI);
          bestCurrent = signedI;
        }
      }
    }
    wireCurrents.set(wire.id, bestCurrent);
  }

  // ── Passe 2 : propagation BFS aux fils intermédiaires (signe cohérent) ─────────
  //
  // On détermine si le courant du fil A ARRIVE au point de jonction ou en PART,
  // puis on en déduit le signe correct pour le fil B connecté à ce point.
  const wireById = new Map(circuit.wires.map(w => [w.id, w]));
  const seeded   = new Set<string>();
  for (const [id, c] of wireCurrents) { if (Math.abs(c) > 1e-9) seeded.add(id); }
  const queue = Array.from(seeded);

  for (let i = 0; i < queue.length; i++) {
    const wireA = wireById.get(queue[i]); if (!wireA) continue;
    const I_A    = wireCurrents.get(wireA.id)!;
    const firstA = wireA.points[0];
    const lastA  = wireA.points[wireA.points.length - 1];

    for (const wireB of circuit.wires) {
      if (seeded.has(wireB.id)) continue;
      const firstB = wireB.points[0];
      const lastB  = wireB.points[wireB.points.length - 1];

      // Trouver le point de jonction partagé (bout-à-bout uniquement)
      let pIsLastA  = false;
      let pIsFirstB = false;
      let found     = false;

      if      (dist(lastA,  firstB) < GRID * 0.6) { pIsLastA = true;  pIsFirstB = true;  found = true; }
      else if (dist(lastA,  lastB)  < GRID * 0.6) { pIsLastA = true;  pIsFirstB = false; found = true; }
      else if (dist(firstA, firstB) < GRID * 0.6) { pIsLastA = false; pIsFirstB = true;  found = true; }
      else if (dist(firstA, lastB)  < GRID * 0.6) { pIsLastA = false; pIsFirstB = false; found = true; }

      if (!found) continue;

      // I_A > 0 → dots vont points[0]→last → arrivent à lastA
      // I_A < 0 → dots vont points[last]→0 → arrivent à firstA
      const arrivesAtJunction = (I_A > 0 && pIsLastA) || (I_A < 0 && !pIsLastA);

      // Sur wireB : si le courant arrive à la jonction depuis A, il doit en repartir sur B.
      //   Repartir = s'éloigner de la jonction sur B.
      //   pIsFirstB → jonction = points[0] de B → repartir = I_B > 0
      //   !pIsFirstB → jonction = points[last] de B → repartir = I_B < 0
      const signB = (arrivesAtJunction === pIsFirstB) ? 1 : -1;

      wireCurrents.set(wireB.id, signB * Math.abs(I_A));
      seeded.add(wireB.id);
      queue.push(wireB.id);
    }
  }

  return { wireCurrents, componentCurrents };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── OVERLAY ANIMATION COURANT ───────────────────────────────────────────────
// ── Paramètres visuels des particules (indépendants de la physique) ───────────
const DOT_SPEED_SCALE = 30000; // px/s par ampère  — augmenter pour accélérer les dots
const DOT_MIN_SPEED = 45; // px/s minimum (même pour très faible courant)
const DOT_MAX_SPEED = 320; // px/s maximum (évite les dots trop rapides)
const DOT_RADIUS = 4; // rayon en pixels
const DOT_GLOW = 8; // shadowBlur
const DOT_SPACING = 32; // distance minimale px entre deux dots sur le même fil
const DOT_THRESHOLD = 3e-4; // ampères en dessous duquel les dots disparaissent

// Couleurs RGB des LEDs pour le glow
const LED_RGB: Record<string, [number, number, number]> = {
  red: [255, 50, 50],
  green: [50, 255, 80],
  blue: [50, 140, 255],
  yellow: [255, 230, 40],
  white: [255, 255, 255],
};
const LED_FADE_IN  = 4.0; // luminosité/seconde à l'allumage  (~250 ms pour 0→1)
const LED_FADE_OUT = 2.5; // luminosité/seconde à l'extinction (~400 ms pour 1→0)
// ═══════════════════════════════════════════════════════════════════════════════

interface AnimDot {
  pos: number;
}
interface AnimSeg {
  len: number;
  ax: number;
  ay: number;
  bx: number;
  by: number;
}
interface AnimPath {
  id: string;
  segs: AnimSeg[];
  totalLen: number;
  current: number;
}

// Construit les segments écran d'un chemin à partir de points monde
function buildSegs(
  worldPts: Vec2[],
  cam: Camera,
): { segs: AnimSeg[]; totalLen: number } {
  const segs: AnimSeg[] = [];
  let totalLen = 0;
  for (let i = 0; i < worldPts.length - 1; i++) {
    const a = w2s(worldPts[i].x, worldPts[i].y, cam);
    const b = w2s(worldPts[i + 1].x, worldPts[i + 1].y, cam);
    const len = dist(a, b);
    if (len > 0.5) segs.push({ len, ax: a.x, ay: a.y, bx: b.x, by: b.y });
    totalLen += len;
  }
  return { segs, totalLen };
}

// Pré-remplit un chemin de dots uniformément espacés — "tout d'un coup"
function prefillDots(totalLen: number, spacing: number): AnimDot[] {
  const count = Math.max(2, Math.ceil(totalLen / spacing));
  return Array.from({ length: count }, (_, i) => ({
    pos: (i / count) * totalLen,
  }));
}

interface CurrentOverlayProps {
  wires: Wire[];
  components: Component[];
  wireCurrents: Map<string, number>;
  componentCurrents: Map<string, number>;
  cam: Camera;
  active: boolean;
}

function CurrentOverlay({ wires, components, wireCurrents, componentCurrents, cam, active }: CurrentOverlayProps) {
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const rafRef          = useRef<number>(0);
  const lastTsRef       = useRef<number>(0);
  const dotsRef         = useRef<Map<string, AnimDot[]>>(new Map());
  const ledBrightnessRef = useRef<Map<string, number>>(new Map()); // compId → 0..1

  // refs toujours frais — pas besoin de relancer le RAF à chaque mise à jour
  const wiresRef = useRef(wires);
  const componentsRef = useRef(components);
  const wireCurrentsRef = useRef(wireCurrents);
  const componentCurrentsRef = useRef(componentCurrents);
  const camRef = useRef(cam);
  wiresRef.current = wires;
  componentsRef.current = components;
  wireCurrentsRef.current = wireCurrents;
  componentCurrentsRef.current = componentCurrents;
  camRef.current = cam;

  // resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    return () => ro.disconnect();
  }, []);

  // boucle RAF — démarre/arrête selon active
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    cancelAnimationFrame(rafRef.current);

    if (!active) {
      dotsRef.current.clear();
      ledBrightnessRef.current.clear();
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    lastTsRef.current = 0;

    const animate = (ts: number) => {
      const dt = Math.min((ts - (lastTsRef.current || ts)) / 1000, 0.05);
      lastTsRef.current = ts;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      const cam = camRef.current;

      // ── glow LED avec transition progressive ─────────────────────────────────
      for (const comp of componentsRef.current) {
        if (comp.type !== "led") continue;

        const I        = componentCurrentsRef.current.get(comp.id) ?? 0;
        const lit      = Math.abs(I) >= DOT_THRESHOLD;
        const prev     = ledBrightnessRef.current.get(comp.id) ?? 0;

        // avancer la luminosité vers la cible (0 ou 1) à vitesse constante
        const target   = lit ? 1 : 0;
        const speed    = lit ? LED_FADE_IN : LED_FADE_OUT;
        const brightness = lit
          ? Math.min(1, prev + speed * dt)
          : Math.max(0, prev - speed * dt);
        ledBrightnessRef.current.set(comp.id, brightness);

        if (brightness < 0.01) continue; // complètement éteinte — rien à dessiner

        const [r, g, b] =
          LED_RGB[(comp.props.color as string) ?? "red"] ?? LED_RGB.red;
        const center = w2s(comp.position.x, comp.position.y, cam);
        const radius = GRID * 3.8 * cam.z;

        // pulse subtil quand la LED est bien allumée (breathing)
        const pulse = 0.82 + 0.18 * (0.5 + 0.5 * Math.sin(ts * 0.009));
        const b_eff = brightness * pulse; // opacité effective

        // halo ambiant large
        const halo = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius);
        halo.addColorStop(0,    `rgba(${r},${g},${b},${(b_eff * 0.75).toFixed(2)})`);
        halo.addColorStop(0.35, `rgba(${r},${g},${b},${(b_eff * 0.35).toFixed(2)})`);
        halo.addColorStop(1,    `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // point brillant central
        const core = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, GRID * 0.8 * cam.z);
        core.addColorStop(0, `rgba(255,255,255,${(b_eff * 0.92).toFixed(2)})`);
        core.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(center.x, center.y, GRID * 0.8 * cam.z, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── construire tous les chemins (fils + composants) ─────────────────────
      const paths: AnimPath[] = [];

      for (const wire of wiresRef.current) {
        if (wire.points.length < 2) continue;
        const I = wireCurrentsRef.current.get(wire.id) ?? 0;
        const { segs, totalLen } = buildSegs(wire.points, cam);
        if (totalLen > 1)
          paths.push({ id: wire.id, segs, totalLen, current: I });
      }

      for (const comp of componentsRef.current) {
        if (comp.type === "ground") continue;
        const I = componentCurrentsRef.current.get(comp.id) ?? 0;
        const tws = termWorlds(comp);
        if (tws.length < 2) continue;
        const { segs, totalLen } = buildSegs(tws, cam);
        if (totalLen > 1)
          paths.push({ id: `comp_${comp.id}`, segs, totalLen, current: I });
      }

      // ── animer chaque chemin ─────────────────────────────────────────────────
      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur = DOT_GLOW;
      ctx.fillStyle = "#fde68a";

      for (const path of paths) {
        const { id, segs, totalLen, current: I } = path;

        if (Math.abs(I) < DOT_THRESHOLD) {
          dotsRef.current.delete(id);
          continue;
        }

        const absSpeed = Math.min(
          Math.max(Math.abs(I) * DOT_SPEED_SCALE, DOT_MIN_SPEED),
          DOT_MAX_SPEED,
        );
        const speed = Math.sign(I) * absSpeed;
        const spacing = Math.max(DOT_SPACING, totalLen / 6);

        // pré-remplir immédiatement si ce chemin est nouveau
        let dots = dotsRef.current.get(id);
        if (!dots) dots = prefillDots(totalLen, spacing);

        // avancer et faire boucler les dots (wrap circulaire)
        dots = dots.map((d) => {
          let p = d.pos + speed * dt;
          if (p > totalLen) p -= totalLen;
          if (p < 0) p += totalLen;
          return { pos: p };
        });

        dotsRef.current.set(id, dots);

        // dessiner
        for (const dot of dots) {
          let rem = dot.pos;
          for (const seg of segs) {
            if (rem <= seg.len) {
              const t = rem / seg.len;
              ctx.beginPath();
              ctx.arc(
                seg.ax + (seg.bx - seg.ax) * t,
                seg.ay + (seg.by - seg.ay) * t,
                DOT_RADIUS,
                0,
                Math.PI * 2,
              );
              ctx.fill();
              break;
            }
            rem -= seg.len;
          }
        }
      }

      ctx.shadowBlur = 0;
      ctx.restore();
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── GRAPH VIEW ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface GraphViewProps {
  config: GraphConfig;
  liveNetlist: Netlist;
  simNetlist: Netlist | null;
  simResult: SimResult | null;
  dark: boolean;
  onChangeComponent: (name: string | null) => void;
  onChangeMetric: (m: "tension" | "courant") => void;
  onClose: () => void;
  onExpand?: () => void;
  /** true = rendu dans le modal agrandie (plus de place, fonte plus grande) */
  enlarged?: boolean;
}

type SeriesData =
  | { kind: "ac"; points: { t: number; v: number }[] }
  | { kind: "dc"; value: number }
  | null;

function GraphView({
  config,
  liveNetlist,
  simNetlist,
  simResult,
  dark,
  onChangeComponent,
  onChangeMetric,
  onClose,
  onExpand,
  enlarged = false,
}: GraphViewProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  // Fenêtre de vue sur l'axe du temps : null = vue complète automatique
  const viewRef    = useRef<{ t0: number; t1: number } | null>(null);
  const dragRef    = useRef<{ sx: number; savedT0: number; savedT1: number } | null>(null);
  const seriesRef  = useRef<SeriesData>(null);
  const drawFnRef  = useRef<() => void>(() => {});
  const darkRef    = useRef(dark);
  const enlargedRef = useRef(enlarged);
  darkRef.current    = dark;
  enlargedRef.current = enlarged;

  // Pour déclencher un re-render quand l'utilisateur remet la vue complète
  const [isFullView, setIsFullView] = useState(true);

  const nc = useMemo(
    () => liveNetlist.components.find(c => c.name === config.componentName) ?? null,
    [liveNetlist, config.componentName],
  );

  const series: SeriesData = useMemo(() => {
    if (!nc || !simResult || simResult.error) return null;
    const voltage = (tp: { nodeVoltages: Record<string, number> }) => {
      const v1 = nc.n1 === "0" ? 0 : (tp.nodeVoltages[`node${nc.n1}`] ?? 0);
      const v2 = nc.n2 === "0" ? 0 : (tp.nodeVoltages[`node${nc.n2}`] ?? 0);
      return v1 - v2;
    };
    if (simResult.timeSeries && simResult.timeSeries.length > 0)
      return { kind: "ac", points: simResult.timeSeries.map(tp => ({ t: tp.time, v: voltage(tp) })) };
    const v1 = nc.n1 === "0" ? 0 : (simResult.nodeVoltages[`node${nc.n1}`] ?? 0);
    const v2 = nc.n2 === "0" ? 0 : (simResult.nodeVoltages[`node${nc.n2}`] ?? 0);
    return { kind: "dc", value: v1 - v2 };
  }, [nc, simResult]);

  seriesRef.current = series;

  // ── Série courant ─────────────────────────────────────────────────────────────
  const currentSeries: SeriesData = useMemo(() => {
    if (!nc || !simResult || simResult.error) return null;

    // Calcule I à un instant donné
    const getV = (tp: SimPoint, nId: string) =>
      nId === "0" ? 0 : (tp.nodeVoltages[`node${nId}`] ?? 0);

    const currentAt = (tp: SimPoint, prevTp?: SimPoint): number => {
      const v1 = getV(tp, nc.n1);
      const v2 = getV(tp, nc.n2);
      const vd = v1 - v2;
      switch (nc.type) {
        case "R": return vd / (nc.value || 1);
        case "C": {
          if (!prevTp) return 0;
          const dt = tp.time - prevTp.time;
          if (dt <= 0) return 0;
          const prevVd = getV(prevTp, nc.n1) - getV(prevTp, nc.n2);
          return nc.value * (vd - prevVd) / dt;
        }
        case "L": return tp.sourceCurrents[nc.name] ?? 0;
        // Convention MNA : J < 0 pour source fournissant du courant → négatif pour afficher +
        case "V": return -(tp.sourceCurrents[nc.name] ?? 0);
        case "D": return Math.max(0, (vd - nc.vf) / 10);
        case "S": return nc.state ? vd / 0.001 : 0;
        default:  return 0;
      }
    };

    if (simResult.timeSeries && simResult.timeSeries.length > 0) {
      const pts = simResult.timeSeries;
      return {
        kind: "ac",
        points: pts.map((tp, i) => ({
          t: tp.time,
          v: currentAt(tp, i > 0 ? pts[i - 1] : undefined),
        })),
      };
    }
    const dcI = currentAt({
      time: 0,
      nodeVoltages:   simResult.nodeVoltages,
      sourceCurrents: simResult.sourceCurrents,
    });
    return { kind: "dc", value: dcI };
  }, [nc, simResult]);

  // ── Sélection de la série active ──────────────────────────────────────────────
  const activeSeries: SeriesData =
    config.metric === "courant" ? currentSeries : series;

  // ── Titres descriptifs ────────────────────────────────────────────────────────
  const graphTitle = useMemo(() => {
    if (!nc || !config.componentName) return "";
    const n = config.componentName;
    return ({
      R: `Tension aux bornes de ${n}`,
      C: `Tension aux bornes du condensateur ${n}`,
      L: `Tension aux bornes de l'inductance ${n}`,
      V: `Tension de la source ${n}`,
      D: `Tension aux bornes de la DEL ${n}`,
      S: `Tension aux bornes de l'interrupteur ${n}`,
    } as Record<string, string>)[nc.type] ?? `Tension — ${n}`;
  }, [nc, config.componentName]);

  const currentTitle = useMemo(() => {
    if (!nc || !config.componentName) return "";
    const n = config.componentName;
    return ({
      R: `Courant traversant ${n}`,
      C: `Courant traversant le condensateur ${n}`,
      L: `Courant traversant l'inductance ${n}`,
      V: `Courant débité par la source ${n}`,
      D: `Courant traversant la DEL ${n}`,
      S: `Courant traversant l'interrupteur ${n}`,
    } as Record<string, string>)[nc.type] ?? `Courant — ${n}`;
  }, [nc, config.componentName]);

  const activeTitle = config.metric === "courant" ? currentTitle : graphTitle;

  const graphTitleRef = useRef(graphTitle);
  graphTitleRef.current = graphTitle;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const niceStep = (roughStep: number): number => {
    const mag  = Math.pow(10, Math.floor(Math.log10(Math.abs(roughStep) || 1)));
    const norm = roughStep / mag;
    if (norm <= 1) return mag;
    if (norm <= 2) return 2 * mag;
    if (norm <= 5) return 5 * mag;
    return 10 * mag;
  };
  const niceRange = (lo: number, hi: number, n: number) => {
    const step = niceStep((hi - lo) / n || 1);
    return { lo: Math.floor(lo / step) * step, hi: Math.ceil(hi / step) * step, step };
  };
  const fmtV = (v: number): string => {
    const a = Math.abs(v);
    if (a === 0)   return "0";
    if (a >= 1000) return (v / 1000).toPrecision(3) + "k";
    if (a >= 1)    return v.toPrecision(3);
    if (a >= 1e-3) return (v * 1000).toPrecision(3) + "m";
    return v.toExponential(2);
  };
  // Choix de l'unité de temps selon l'amplitude totale de la série
  const timeUnit = (span: number): { u: string; f: number } => {
    if (span >= 1)    return { u: "s",  f: 1 };
    if (span >= 1e-3) return { u: "ms", f: 1e3 };
    return              { u: "µs", f: 1e6 };
  };

  // ── Fonction de dessin (ref) ──────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    if (W === 0 || H === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const isCurrentMetric = config.metric === "courant";
    const lineCol  = isCurrentMetric ? "#16a34a" : "#2563eb"; // vert=courant, bleu=tension

    const bg       = dark ? "#080a12" : "#f9fafb";
    const textCol  = dark ? "#64748b" : "#6b7280";
    const titleCol = dark ? "#94a3b8" : "#374151";
    const gridCol  = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)";
    const axisCol  = dark ? "#334155" : "#d1d5db";
    const fs       = enlarged ? 12 : 11;

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // ── Marges ────────────────────────────────────────────────────────────────
    const mt = enlarged ? 34 : 26;
    const mb = enlarged ? 48 : 40;
    const mr = 14;
    const ml = enlarged ? 72 : 62;
    const pw = W - ml - mr;
    const ph = H - mt - mb;

    // ── État vide ─────────────────────────────────────────────────────────────
    ctx.font = `${fs}px 'JetBrains Mono', monospace`;
    if (!activeSeries || !config.componentName) {
      ctx.fillStyle = textCol; ctx.textAlign = "center";
      ctx.fillText(config.componentName ? UI.noData : UI.noCompSel, W/2, H/2);
      return;
    }

    // ── Titre général ─────────────────────────────────────────────────────────
    ctx.font = `bold ${fs}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = titleCol; ctx.textAlign = "center";
    ctx.fillText(activeTitle, W/2, fs + 5);
    ctx.font = `${fs}px 'JetBrains Mono', monospace`;

    // ── Auto-échelle courant : choisir l'unité selon l'amplitude max ──────────
    // rawPts contient les points bruts (en V ou en A selon la série active)
    const rawPts = activeSeries.kind === "ac"
      ? activeSeries.points
      : [{ t: 0, v: activeSeries.value }];
    const rawAbsMax = Math.max(...rawPts.map(p => Math.abs(p.v)), 0);

    let yScaleFactor = 1, yUnit = "V", yVarLabel = "U";
    if (isCurrentMetric) {
      yVarLabel = "I";
      if (rawAbsMax < 1e-3)      { yScaleFactor = 1e6;  yUnit = "µA"; }
      else if (rawAbsMax < 1)    { yScaleFactor = 1e3;  yUnit = "mA"; }
      else                       { yScaleFactor = 1;    yUnit = "A";  }
    }
    // Formater une valeur Y dans l'unité choisie
    const fmtY = (raw: number) => {
      const scaled = raw * yScaleFactor;
      const a = Math.abs(scaled);
      if (a === 0) return "0";
      if (a >= 100) return scaled.toFixed(1);
      if (a >= 10)  return scaled.toFixed(2);
      return scaled.toPrecision(3);
    };

    // ── DC ────────────────────────────────────────────────────────────────────
    if (activeSeries.kind === "dc") {
      const val = activeSeries.value;
      const disp = `Régime continu : ${fmtY(val)} ${yUnit}`;
      ctx.fillStyle = textCol; ctx.textAlign = "center";
      ctx.fillText(disp, W/2, mt + ph/2 - 8);
      ctx.fillStyle = lineCol;
      ctx.fillRect(ml, mt + ph/2 - 1, pw, 2);
      ctx.save(); ctx.translate(fs + 2, mt + ph/2); ctx.rotate(-Math.PI/2);
      ctx.textAlign = "center"; ctx.fillStyle = textCol;
      ctx.fillText(`${isCurrentMetric ? "Courant" : "Tension"}  ${yVarLabel} (${yUnit})`, 0, 0);
      ctx.restore();
      return;
    }

    // ── AC ────────────────────────────────────────────────────────────────────
    const pts    = activeSeries.points;
    const fullT0 = pts[0].t;
    const fullT1 = pts[pts.length - 1].t;
    const span   = fullT1 - fullT0;

    const vw = viewRef.current;
    const t0 = vw ? Math.max(fullT0, vw.t0) : fullT0;
    const t1 = vw ? Math.min(fullT1, vw.t1) : fullT1;

    // Y : inclure 0 si valeurs du même signe
    const rawMin = Math.min(...pts.map(p => p.v));
    const rawMax = Math.max(...pts.map(p => p.v));
    // Convertir en unité d'affichage pour les calculs d'axe
    const dMin = rawMin * yScaleFactor;
    const dMax = rawMax * yScaleFactor;
    const { lo: yMin, hi: yMax, step: yStep } = niceRange(
      dMin >= 0 ? 0 : dMin * 1.25,
      dMax <= 0 ? 0 : dMax * 1.25,
      enlarged ? 6 : 5,
    );
    const yRange = yMax - yMin || 1;
    const { u: tU, f: tF } = timeUnit(span);

    const toX = (t: number) => ml + ((t - t0) / (t1 - t0 || 1)) * pw;
    // toY prend une valeur déjà en unité d'affichage
    const toY = (d: number) => mt + (1 - (d - yMin) / yRange) * ph;

    // ── Grille + ticks Y ──────────────────────────────────────────────────────
    for (let v = yMin; v <= yMax + yStep * 0.01; v += yStep) {
      const y = toY(v);
      if (y < mt - 2 || y > mt + ph + 2) continue;
      ctx.strokeStyle = gridCol; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(ml, y); ctx.lineTo(ml + pw, y); ctx.stroke();
      const isZero = Math.abs(v) < yStep * 0.01;
      ctx.fillStyle = isZero ? axisCol : textCol; ctx.textAlign = "right";
      ctx.fillText(isZero ? "0" : fmtY(v / yScaleFactor), ml - 5, y + fs * 0.35);
    }

    // ── Ticks X ───────────────────────────────────────────────────────────────
    const { lo: tMin, hi: tMax, step: tStep } = niceRange(t0, t1, enlarged ? 8 : 5);
    for (let t = tMin; t <= tMax + tStep * 0.01; t += tStep) {
      const x = toX(t);
      if (x < ml - 2 || x > ml + pw + 2) continue;
      ctx.strokeStyle = gridCol; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(x, mt); ctx.lineTo(x, mt + ph); ctx.stroke();
      ctx.fillStyle = textCol; ctx.textAlign = "center";
      ctx.fillText((t * tF).toPrecision(3), x, mt + ph + fs + 5);
    }

    // ── Ligne zéro si données bipolaires ──────────────────────────────────────
    if (yMin < 0 && yMax > 0) {
      const y0 = toY(0);
      ctx.strokeStyle = axisCol; ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(ml, y0); ctx.lineTo(ml + pw, y0); ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── Cadre des axes ────────────────────────────────────────────────────────
    ctx.strokeStyle = axisCol; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ml, mt); ctx.lineTo(ml, mt + ph);
    ctx.moveTo(ml, mt + ph); ctx.lineTo(ml + pw, mt + ph);
    ctx.stroke();

    // ── Label axe Y (tourné) ──────────────────────────────────────────────────
    ctx.save();
    ctx.translate(fs + 2, mt + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center"; ctx.fillStyle = textCol;
    ctx.fillText(`${isCurrentMetric ? "Courant" : "Tension"}  ${yVarLabel} (${yUnit})`, 0, 0);
    ctx.restore();

    // ── Label axe X ───────────────────────────────────────────────────────────
    ctx.fillStyle = textCol; ctx.textAlign = "center";
    ctx.fillText(`Temps  t (${tU})`, ml + pw / 2, mt + ph + mb - 10);

    // ── Courbe ────────────────────────────────────────────────────────────────
    ctx.strokeStyle = lineCol;
    ctx.lineWidth = enlarged ? 2 : 1.8;
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath();
    let first = true;
    for (const p of pts) {
      if (p.t < t0 - (t1 - t0) * 0.001 || p.t > t1 + (t1 - t0) * 0.001) continue;
      const d = p.v * yScaleFactor;
      if (first) { ctx.moveTo(toX(p.t), toY(d)); first = false; }
      else ctx.lineTo(toX(p.t), toY(d));
    }
    ctx.stroke();

    // ── Scrollbar indicatrice (si vue partielle) ──────────────────────────────
    if (vw && span > 0 && (t0 > fullT0 + 1e-9 || t1 < fullT1 - 1e-9)) {
      const sbY = mt + ph + mb - 5, sbH = 3;
      ctx.fillStyle = dark ? "#1e293b" : "#e2e8f0";
      ctx.fillRect(ml, sbY, pw, sbH);
      const s0 = (t0 - fullT0) / span;
      const s1 = (t1 - fullT0) / span;
      ctx.fillStyle = lineCol + "99";
      ctx.fillRect(ml + s0 * pw, sbY, (s1 - s0) * pw, sbH);
    }
  }, [activeSeries, dark, config.componentName, enlarged, activeTitle, config.metric]);

  drawFnRef.current = draw;

  // ── ResizeObserver — redessine à chaque resize ────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => drawFnRef.current());
    ro.observe(canvas);
    drawFnRef.current();
    return () => ro.disconnect();
  }, []);

  // ── Redessine quand les données / thème changent ──────────────────────────────
  useEffect(() => { drawFnRef.current(); }, [draw]);

  // ── Interactions souris : défilement + glisser-déplacer ───────────────────────
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const getML = () => (enlargedRef.current ? 72 : 62);
    const getMR = () => 14;

    // Wheel : défilement gauche/droite  |  Ctrl+Wheel : zoom temporal
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = seriesRef.current;
      if (!s || s.kind !== "ac") return;
      const pts    = s.points;
      const fullT0 = pts[0].t;
      const fullT1 = pts[pts.length - 1].t;
      const cur    = viewRef.current ?? { t0: fullT0, t1: fullT1 };
      const pw     = el.offsetWidth - getML() - getMR();

      if (e.ctrlKey || e.metaKey) {
        // Zoom centré sur la position du curseur
        const rect  = el.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left - getML()) / pw));
        const pivot = cur.t0 + ratio * (cur.t1 - cur.t0);
        const factor = e.deltaY > 0 ? 1.3 : 0.77;
        const newSpan = Math.max((fullT1 - fullT0) * 0.005, (cur.t1 - cur.t0) * factor);
        let nt0 = pivot - ratio * newSpan;
        let nt1 = nt0 + newSpan;
        if (nt0 < fullT0) { nt0 = fullT0; nt1 = nt0 + newSpan; }
        if (nt1 > fullT1) { nt1 = fullT1; nt0 = nt1 - newSpan; }
        nt0 = Math.max(fullT0, nt0);
        viewRef.current = { t0: nt0, t1: Math.min(fullT1, nt1) };
      } else {
        // Défilement gauche / droite
        const span  = cur.t1 - cur.t0;
        const shift = span * (e.deltaY > 0 ? 0.15 : -0.15);
        let nt0 = cur.t0 + shift;
        if (nt0 < fullT0) nt0 = fullT0;
        if (nt0 + span > fullT1) nt0 = fullT1 - span;
        viewRef.current = { t0: nt0, t1: nt0 + span };
      }
      // Vérifier si on est revenu à la vue complète
      const vw = viewRef.current;
      const isNowFull = Math.abs(vw.t0 - fullT0) < 1e-9 && Math.abs(vw.t1 - fullT1) < 1e-9;
      if (isNowFull) viewRef.current = null;
      setIsFullView(viewRef.current === null);
      drawFnRef.current();
    };

    // Drag : clic + glisser pour panoramique
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const s = seriesRef.current;
      if (!s || s.kind !== "ac") return;
      const cur = viewRef.current;
      if (!cur) {
        const pts = s.points;
        dragRef.current = { sx: e.clientX, savedT0: pts[0].t, savedT1: pts[pts.length - 1].t };
      } else {
        dragRef.current = { sx: e.clientX, savedT0: cur.t0, savedT1: cur.t1 };
      }
      e.preventDefault();
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const s = seriesRef.current;
      if (!s || s.kind !== "ac") return;
      const pts    = s.points;
      const fullT0 = pts[0].t;
      const fullT1 = pts[pts.length - 1].t;
      const { sx, savedT0, savedT1 } = dragRef.current;
      const span = savedT1 - savedT0;
      const pw   = el.offsetWidth - getML() - getMR();
      const dt   = -((e.clientX - sx) / pw) * span;
      let nt0 = savedT0 + dt;
      if (nt0 < fullT0) nt0 = fullT0;
      if (nt0 + span > fullT1) nt0 = fullT1 - span;
      viewRef.current = { t0: nt0, t1: nt0 + span };
      setIsFullView(false);
      drawFnRef.current();
    };
    const onMouseUp = () => { dragRef.current = null; };

    el.addEventListener("wheel",      onWheel,     { passive: false });
    el.addEventListener("mousedown",  onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => {
      el.removeEventListener("wheel",      onWheel);
      el.removeEventListener("mousedown",  onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  }, []); // refs uniquement → pas de stale closure

  // ── Reset vue complète ────────────────────────────────────────────────────────
  const handleResetView = useCallback(() => {
    viewRef.current = null;
    setIsFullView(true);
    drawFnRef.current();
  }, []);

  // ── Rendu JSX ─────────────────────────────────────────────────────────────────
  const bdr     = dark ? "1px solid #1e293b" : "1px solid #e5e7eb";
  const textCol = dark ? "#94a3b8" : "#374151";
  const mutCol  = dark ? "#475569" : "#9ca3af";
  const fs      = enlarged ? 12 : 10;

  const iconBtn = (title: string, onClick: () => void, label: string, active = false): React.ReactElement => (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: active ? (dark ? "#0f1f40" : "#eff6ff") : "transparent",
        border: "none",
        color: active ? "#2563eb" : mutCol,
        cursor: "pointer",
        fontSize: enlarged ? 13 : 12,
        lineHeight: 1,
        padding: "1px 5px",
        borderRadius: 3,
        flexShrink: 0,
      }}
    >{label}</button>
  );

  const activeU = config.metric === "tension";
  const activeI = config.metric === "courant";

  const metricTabStyle = (active: boolean, color: string): React.CSSProperties => ({
    padding: "2px 8px",
    fontSize: enlarged ? 11 : 10,
    fontFamily: "'JetBrains Mono',monospace",
    fontWeight: 700,
    background: active ? color : "transparent",
    color: active ? "#fff" : (dark ? "#475569" : "#9ca3af"),
    border: `1px solid ${active ? color : (dark ? "#1e293b" : "#d1d5db")}`,
    borderRadius: 3,
    cursor: "pointer",
    flexShrink: 0,
    lineHeight: 1.4,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", borderRight: bdr, minWidth: enlarged ? 0 : 210, flex: 1, overflow: "hidden" }}>

      {/* ── En-tête : sélecteur + toggle U/I + utilitaires ─── */}
      <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "4px 6px", borderBottom: bdr, flexShrink: 0 }}>
        <select
          value={config.componentName ?? ""}
          onChange={e => onChangeComponent(e.target.value || null)}
          style={{
            flex: 1, minWidth: 0,
            background: dark ? "#0f172a" : "#f9fafb",
            border: dark ? "1px solid #1e293b" : "1px solid #d1d5db",
            color: textCol, borderRadius: 4,
            fontSize: fs, fontFamily: "'JetBrains Mono',monospace", padding: "2px 4px",
          }}
        >
          <option value="">{UI.chooseComp}</option>
          {liveNetlist.components.map(c => (
            <option key={c.name} value={c.name}>{fmtNetlistComp(c)}</option>
          ))}
        </select>

        {/* ── Toggle U / I ── */}
        <button onClick={() => onChangeMetric("tension")} title="Tension (V)"
          style={metricTabStyle(activeU, "#2563eb")}>U</button>
        <button onClick={() => onChangeMetric("courant")} title="Courant (A)"
          style={metricTabStyle(activeI, "#16a34a")}>I</button>

        {!isFullView && iconBtn("Vue complète (0 → fin)", handleResetView, "⟷")}
        {onExpand && !enlarged && iconBtn("Agrandir le graphique", onExpand, "⤢")}
        {iconBtn(enlarged ? "Fermer" : "Supprimer", onClose, "×")}
      </div>

      {/* ── Canvas ─── */}
      <div style={{ flex: 1, minHeight: 0, cursor: "grab" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── GRAPH PANEL ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface GraphPanelProps {
  liveNetlist: Netlist;
  simNetlist: Netlist | null;
  simResult: SimResult | null;
  simRunning: boolean;
  dark: boolean;
  onSimulate: () => void;
  onStop: () => void;
}

function GraphPanel({
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

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ROOT APP ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
//
export async function loader({ request, params }: LoaderFunctionArgs) {
  console.log(params.id);
  if (params.id == undefined || (params.id != "guest" && isNaN(+params.id))) {
    console.log("redirecting due to invalid id");
    return redirect("/projects/guest");
  }

  if (params.id == "guest") {
    // return example circuit
    return { id: params.id, components: [], wires: [] };
  }

  const cookieHeader = request.headers.get("Cookie");
  const session = getCookie(cookieHeader, "eclab_session_id");
  if (session === null) {
    console.log("redirecting due to invalid session");
    return redirect("/projects/guest");
  }

  const resp = await fetch(
    `${import.meta.env.VITE_API_ENDPOINT}/projects/${params.id}`,
    {
      method: "GET",
      headers: request.headers,
    },
  );

  if (!resp.ok) {
    return redirect("/projects/guest");
  }

  const project = await resp.json();
  const circuit = { components: [], wires: [] };

  if (project.circuit !== null) {
    circuit.components = project.circuit.components ?? [];
    circuit.wires = project.circuit.wires ?? [];
  }

  console.log(project);
  console.log(circuit);

  return {
    id: params.id,
    components: circuit.components,
    wires: circuit.wires,
  };
}

export default function App() {
  const loaderData = useLoaderData<typeof loader>();
  const [state, dispatch] = useReducer(reducer, {
    components: loaderData.components ?? [],
    wires: loaderData.wires ?? [],
    selection: [],
    tool: "select",
    placingType: null,
    wirePoints: [],
    mouseWorld: { x: 0, y: 0 },
    ghostPos: null,
    ghostRot: 0,
    showGrid: true,
    darkMode: readPersistedTheme(),
    history: [{ components: [], wires: [] }],
    historyIdx: 0,
  } as AppState);
  const [cam, setCam] = useState<Camera>({ x: 320, y: 220, z: 1 });

  // popover
  const [popoverComp, setPopoverComp] = useState<Component | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<Vec2 | null>(null);
  const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  // netlist modal
  const [showNetlist, setShowNetlist] = useState(false);

  // simulation
  const workerRef = useRef<Worker | null>(null);
  const accTimeSeriesRef = useRef<SimPoint[]>([]);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [simNetlist, setSimNetlist] = useState<Netlist | null>(null);
  const [simRunning, setSimRunning] = useState(false);

  const liveNetlist = useMemo(
    () => generateNetlist({ components: state.components, wires: state.wires }),
    [state.components, state.wires],
  );

  const { wireCurrents, componentCurrents } = useMemo(() => {
    const empty = { wireCurrents: new Map<string, number>(), componentCurrents: new Map<string, number>() };
    if (!simResult || simResult.error) return empty;
    // circuit invalide détecté en temps réel → pas d'animation de courant
    if (liveNetlist.warnings.some(w => w.includes("flottant") || w.includes("masse"))) return empty;
    return computeCircuitCurrents({ components: state.components, wires: state.wires }, liveNetlist, simResult);
  }, [simResult, state.components, state.wires, liveNetlist]);

  const dark = state.darkMode;
  const empty = state.components.length === 0 && state.wires.length === 0;

  // init worker once
  useEffect(() => {
    const worker = createSimulationWorker();
    workerRef.current = worker;
    worker.onmessage = (e) => {
      if (e.data?.error) {
        setSimRunning(false);
        setSimResult({
          error: e.data.error,
          nodeVoltages: {},
          sourceCurrents: {},
        });
        return;
      }
      if (e.data?.type === "chunk") {
        const newPoints: SimPoint[] = e.data.timeSeries ?? [];
        if (newPoints.length > 0) {
          const combined = [...accTimeSeriesRef.current, ...newPoints];
          // keep last 2 seconds of data at 1ms resolution = 2000 points
          accTimeSeriesRef.current =
            combined.length > 2000
              ? combined.slice(combined.length - 2000)
              : combined;
        }
        setSimResult({
          nodeVoltages: e.data.nodeVoltages ?? {},
          sourceCurrents: e.data.sourceCurrents ?? {},
          timeSeries:
            accTimeSeriesRef.current.length > 0
              ? [...accTimeSeriesRef.current]
              : undefined,
        });
      }
    };
    return () => worker.terminate();
  }, []);

  // push updated netlist to worker whenever components change during simulation
  useEffect(() => {
    if (!simRunning) return;
    const netlist = generateNetlist({
      components: state.components,
      wires: state.wires,
    });
    workerRef.current?.postMessage({
      type: "updateNetlist",
      netlist: netlist.components,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.components, state.wires]);

  const handleSimulate = useCallback(() => {
    const netlist = generateNetlist({
      components: state.components,
      wires: state.wires,
    });
    if (netlist.components.length === 0) {
      setSimResult({
        error: "Circuit vide",
        nodeVoltages: {},
        sourceCurrents: {},
      });
      return;
    }
    if (netlist.warnings.some(w => w.includes("masse"))) {
      setSimResult({ error: "Aucun nœud de masse (GND) — ajoutez un composant Masse.", nodeVoltages: {}, sourceCurrents: {} });
      return;
    }
    if (netlist.warnings.some(w => w.includes("flottant"))) {
      setSimResult({ error: "Circuit ouvert — connectez tous les nœuds avant de simuler.", nodeVoltages: {}, sourceCurrents: {} });
      return;
    }
    setSimNetlist(netlist);
    accTimeSeriesRef.current = [];
    setSimResult(null);
    setSimRunning(true);
    workerRef.current?.postMessage({
      type: "simulate",
      netlist: netlist.components,
    });
  }, [state.components, state.wires]);

  const handleStop = useCallback(() => {
    workerRef.current?.postMessage({ type: "stop" });
    setSimRunning(false);
  }, []);

  // track canvas bounding rect
  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setCanvasRect(el.getBoundingClientRect()),
    );
    ro.observe(el);
    setCanvasRect(el.getBoundingClientRect());
    return () => ro.disconnect();
  }, []);

  // sync popover with selection
  useEffect(() => {
    if (state.selection.length === 1) {
      const comp = state.components.find((c) => c.id === state.selection[0]);
      if (comp) {
        setPopoverComp(comp);
        setPopoverAnchor(w2s(comp.position.x, comp.position.y, cam));
        return;
      }
    }
    setPopoverComp(null);
    setPopoverAnchor(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selection]);

  // keep anchor in sync on pan/zoom/move
  useEffect(() => {
    if (!popoverComp) return;
    const live = state.components.find((c) => c.id === popoverComp.id);
    if (live) {
      setPopoverComp(live);
      setPopoverAnchor(w2s(live.position.x, live.position.y, cam));
    } else {
      setPopoverComp(null);
      setPopoverAnchor(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cam, state.components]);

  useEffect(() => {
    console.log("updating");

    if (loaderData.id != "guest") {
      fetch(`/api/projects/circuit/${loaderData.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          circuit: { components: state.components, wires: state.wires },
        }),
      });
    }
  }, [state.components, state.wires]);

  const handleComponentClick = useCallback((_id: string, screen: Vec2) => {
    setPopoverAnchor(screen);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        fontFamily: "'JetBrains Mono','Fira Code',monospace",
        overflow: "hidden",
        background: dark ? "#0a0c14" : "#ffffff",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-thumb { background:${dark ? "#1e293b" : "#d1d5db"}; border-radius:3px; }
        button:hover { opacity:.82; }
        input[type=number] { -moz-appearance:textfield; }
        input[type=number]::-webkit-inner-spin-button { opacity:.5; }
        select option { background:${dark ? "#0e1120" : "#ffffff"}; }
        [data-radix-popper-content-wrapper] { z-index:1000 !important; }
      `}</style>

      <Toolbar
        state={state}
        dispatch={dispatch}
        cam={cam}
        onShowNetlist={() => setShowNetlist(true)}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Palette state={state} dispatch={dispatch} />

        <div
          ref={canvasWrapRef}
          style={{ flex: 1, position: "relative", overflow: "hidden" }}
        >
          <CircuitCanvas
            state={state}
            dispatch={dispatch}
            cam={cam}
            setCam={setCam}
            onComponentClick={handleComponentClick}
          />
          <CurrentOverlay
            wires={state.wires}
            components={state.components}
            wireCurrents={wireCurrents}
            componentCurrents={componentCurrents}
            cam={cam}
            active={simRunning}
          />

          {empty && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                textAlign: "center",
                pointerEvents: "none",
              }}
            > 
              <div
                style={{
                  fontSize: 11,
                  color: dark ? "#2a3050" : "#9ca3af",
                  fontFamily: "monospace",
                  lineHeight: 2.2,
                  marginTop: 8,
                }}
              >
                {UI.emptyHint.split("\n").map((l, i) => (
                  <span key={i}>
                    {l}
                    <br />
                  </span>
                ))}
              </div>
            </div>
          )}

          <ComponentPopover
            comp={popoverComp}
            anchorScreen={popoverAnchor}
            canvasRect={canvasRect}
            dark={dark}
            dispatch={dispatch}
          />
        </div>
      </div>

      <GraphPanel
        liveNetlist={liveNetlist}
        simNetlist={simNetlist}
        simResult={simResult}
        simRunning={simRunning}
        dark={dark}
        onSimulate={handleSimulate}
        onStop={handleStop}
      />

      <StatusBar state={state} />

      {showNetlist && (
        <NetlistModal
          circuit={{ components: state.components, wires: state.wires }}
          dark={dark}
          onClose={() => setShowNetlist(false)}
        />
      )}
    </div>
  );
}
