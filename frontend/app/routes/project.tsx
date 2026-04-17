/**
 * Circuit Sandbox Editor
 * ─────────────────────────────────────────────────────────────────────────────
 * Revision notes:
 *  1. Light mode by default; theme persisted in localStorage.
 *  2. Right sidebar removed — replaced with a canvas-anchored Radix popover.
 *  3. Circuit → Netlist conversion layer (generateNetlist / netlistToString)
 *     suitable for Modified Nodal Analysis (MNA).
 *
 * Install peer dependency if not already present:
 *   npm install @radix-ui/react-popover
 */

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

// ─── Constants ────────────────────────────────────────────────────────────────

const GRID = 24;
const ZOOM_MIN = 0.12;
const ZOOM_MAX = 6;
const THEME_STORAGE_KEY = "circuit-sandbox-theme";

// ─── Core Types ───────────────────────────────────────────────────────────────

export interface Vec2 { x: number; y: number; }

export interface Terminal {
  /** Grid-unit offset from component origin */
  x: number;
  y: number;
}

export type ComponentType =
  | "resistor" | "capacitor" | "inductor"
  | "vsource"  | "ground"   | "switch"  | "led";

export type Rotation = 0 | 90 | 180 | 270;

export interface Component {
  id: string;
  type: ComponentType;
  position: Vec2;
  rotation: Rotation;
  props: Record<string, unknown>;
}

export interface Wire { id: string; points: Vec2[]; }

export interface Circuit { components: Component[]; wires: Wire[]; }

// ─── Component Property Schema ────────────────────────────────────────────────
//
// Single authoritative source for:
//   • default prop values
//   • form field rendering inside the popover
//
// No per-component switch is needed in rendering code.

type PropFieldType = "number" | "boolean" | "select";

interface PropFieldBase { label: string; type: PropFieldType; default: unknown; }
interface NumberField extends PropFieldBase { type: "number"; default: number; min?: number; step?: number; }
interface BoolField   extends PropFieldBase { type: "boolean"; default: boolean; }
interface SelectField extends PropFieldBase { type: "select";  default: string;  options: string[]; }
type PropField = NumberField | BoolField | SelectField;

type ComponentPropertySchema = Record<string, PropField>;

const PROP_SCHEMAS: Record<ComponentType, ComponentPropertySchema> = {
  resistor:  { resistance:    { label: "Resistance (Ω)", type: "number",  default: 1000,    min: 0, step: 100 } },
  capacitor: { capacitance:   { label: "Capacitance (F)",type: "number",  default: 1e-6,    min: 0 } },
  inductor:  { inductance:    { label: "Inductance (H)", type: "number",  default: 1e-3,    min: 0 } },
  vsource:   { voltage:       { label: "Voltage (V)",    type: "number",  default: 5,       step: 0.5 } },
  ground:    {},
  switch:    { closed:        { label: "Closed",         type: "boolean", default: false } },
  led: {
    color:          { label: "LED Color",      type: "select",  default: "red", options: ["red","green","blue","yellow","white"] },
    forwardVoltage: { label: "Forward Vf (V)", type: "number",  default: 2.0,   min: 0, step: 0.1 },
  },
};

function defaultPropsFromSchema(schema: ComponentPropertySchema): Record<string, unknown> {
  return Object.fromEntries(Object.entries(schema).map(([k, f]) => [k, f.default]));
}

// ─── Internal PropDef shape (for draw() compat) ───────────────────────────────

interface NumberPropDef { key: string; label: string; type: "number"; min?: number; step?: number; }
interface BoolPropDef   { key: string; label: string; type: "boolean"; }
interface SelectPropDef { key: string; label: string; type: "select";  options: string[]; }
type PropDef = NumberPropDef | BoolPropDef | SelectPropDef;

// ─── Component Definition ─────────────────────────────────────────────────────

interface ComponentDef {
  label: string;
  symbol: string;
  color: string; // light-mode schematic color
  terminals: Terminal[];
  defaultProps: Record<string, unknown>;
  propDefs: PropDef[];
  draw: (ctx: CanvasRenderingContext2D, comp: Component, selected: boolean, hovered: boolean) => void;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

const snap    = (v: number): number => Math.round(v / GRID) * GRID;
const snapVec = (v: Vec2): Vec2    => ({ x: snap(v.x), y: snap(v.y) });
const dist    = (a: Vec2, b: Vec2): number => Math.hypot(b.x - a.x, b.y - a.y);
const uid     = (): string => Math.random().toString(36).slice(2, 9);

const s2w = (sx: number, sy: number, cam: Camera): Vec2 => ({
  x: (sx - cam.x) / cam.z, y: (sy - cam.y) / cam.z,
});
const w2s = (wx: number, wy: number, cam: Camera): Vec2 => ({
  x: wx * cam.z + cam.x, y: wy * cam.z + cam.y,
});

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtOhm(v: number): string {
  if (v >= 1e6) return `${+(v/1e6).toPrecision(3)}MΩ`;
  if (v >= 1e3) return `${+(v/1e3).toPrecision(3)}kΩ`;
  return `${+v.toPrecision(3)}Ω`;
}
function fmtFarad(v: number): string {
  if (v >= 1)    return `${+v.toPrecision(3)}F`;
  if (v >= 1e-3) return `${+(v*1e3).toPrecision(3)}mF`;
  if (v >= 1e-6) return `${+(v*1e6).toPrecision(3)}μF`;
  return `${+(v*1e9).toPrecision(3)}nF`;
}
function fmtHenry(v: number): string {
  if (v >= 1)    return `${+v.toPrecision(3)}H`;
  if (v >= 1e-3) return `${+(v*1e3).toPrecision(3)}mH`;
  return `${+(v*1e6).toPrecision(3)}μH`;
}

// ─── Schematic colors (accessible on both white & dark canvas) ────────────────

const colSel  = "#2563eb"; // blue — selected
const colHov  = "#7c3aed"; // violet — hovered

// ─── Component Definitions ────────────────────────────────────────────────────

const COMPONENT_DEFS: Record<ComponentType, ComponentDef> = {

  resistor: {
    label: "Resistor", symbol: "R", color: "#92400e",
    terminals: [{ x:-2, y:0 }, { x:2, y:0 }],
    defaultProps: defaultPropsFromSchema(PROP_SCHEMAS.resistor),
    propDefs: [{ key:"resistance", label:"Resistance (Ω)", type:"number", min:0, step:100 }],
    draw(ctx, comp, sel, hov) {
      const w = GRID*1.35, h = GRID*0.5, col = sel ? colSel : hov ? colHov : "#92400e";
      ctx.strokeStyle = col; ctx.lineWidth = sel ? 2.5 : 2;
      ctx.strokeRect(-w/2, -h/2, w, h);
      ctx.beginPath();
      ctx.moveTo(-GRID*2,0); ctx.lineTo(-w/2,0);
      ctx.moveTo(w/2,0); ctx.lineTo(GRID*2,0);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.font = "bold 9px 'JetBrains Mono',monospace"; ctx.textAlign = "center";
      ctx.fillText(fmtOhm(comp.props.resistance as number), 0, -h/2-5);
    },
  },

  capacitor: {
    label: "Capacitor", symbol: "C", color: "#065f46",
    terminals: [{ x:-2, y:0 }, { x:2, y:0 }],
    defaultProps: defaultPropsFromSchema(PROP_SCHEMAS.capacitor),
    propDefs: [{ key:"capacitance", label:"Capacitance (F)", type:"number", min:0 }],
    draw(ctx, comp, sel, hov) {
      const gap = 7, col = sel ? colSel : hov ? colHov : "#065f46";
      ctx.strokeStyle = col; ctx.lineWidth = sel ? 2.5 : 2;
      ctx.beginPath();
      ctx.moveTo(-GRID*2,0); ctx.lineTo(-gap,0);
      ctx.moveTo(gap,0); ctx.lineTo(GRID*2,0);
      ctx.stroke();
      ctx.lineWidth = sel ? 3 : 2.5;
      ctx.beginPath();
      ctx.moveTo(-gap,-GRID*0.7); ctx.lineTo(-gap,GRID*0.7);
      ctx.moveTo(gap,-GRID*0.7); ctx.lineTo(gap,GRID*0.7);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.font = "bold 9px 'JetBrains Mono',monospace"; ctx.textAlign = "center";
      ctx.fillText(fmtFarad(comp.props.capacitance as number), 0, -GRID*0.7-5);
    },
  },

  inductor: {
    label: "Inductor", symbol: "L", color: "#4c1d95",
    terminals: [{ x:-2, y:0 }, { x:2, y:0 }],
    defaultProps: defaultPropsFromSchema(PROP_SCHEMAS.inductor),
    propDefs: [{ key:"inductance", label:"Inductance (H)", type:"number", min:0 }],
    draw(ctx, comp, sel, hov) {
      const col = sel ? colSel : hov ? colHov : "#4c1d95";
      ctx.strokeStyle = col; ctx.lineWidth = sel ? 2.5 : 2;
      ctx.beginPath();
      ctx.moveTo(-GRID*2,0); ctx.lineTo(-GRID*1.2,0);
      for (let i=0; i<4; i++) ctx.arc(-GRID*1.2+i*GRID*0.6+GRID*0.3, 0, GRID*0.3, Math.PI, 0);
      ctx.lineTo(GRID*2,0); ctx.stroke();
      ctx.fillStyle = col;
      ctx.font = "bold 9px 'JetBrains Mono',monospace"; ctx.textAlign = "center";
      ctx.fillText(fmtHenry(comp.props.inductance as number), 0, -GRID*0.4-5);
    },
  },

  vsource: {
    label: "Voltage Source", symbol: "V", color: "#991b1b",
    terminals: [{ x:0, y:-2 }, { x:0, y:2 }],
    defaultProps: defaultPropsFromSchema(PROP_SCHEMAS.vsource),
    propDefs: [{ key:"voltage", label:"Voltage (V)", type:"number", step:0.5 }],
    draw(ctx, comp, sel, hov) {
      const r = GRID*0.85, col = sel ? colSel : hov ? colHov : "#991b1b";
      ctx.strokeStyle = col; ctx.lineWidth = sel ? 2.5 : 2;
      ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0,-GRID*2); ctx.lineTo(0,-r);
      ctx.moveTo(0,r); ctx.lineTo(0,GRID*2);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.font = "bold 10px 'JetBrains Mono',monospace"; ctx.textAlign = "center";
      ctx.fillText("+", 0, -GRID*0.22); ctx.fillText("−", 0, GRID*0.42);
      ctx.font = "bold 9px 'JetBrains Mono',monospace";
      ctx.fillText(`${comp.props.voltage as number}V`, 0, -r-5);
    },
  },

  ground: {
    label: "Ground", symbol: "GND", color: "#1f2937",
    terminals: [{ x:0, y:-1 }],
    defaultProps: {},
    propDefs: [],
    draw(ctx, _comp, sel, hov) {
      const col = sel ? colSel : hov ? colHov : "#1f2937";
      ctx.strokeStyle = col; ctx.lineWidth = sel ? 2.5 : 2;
      ctx.beginPath(); ctx.moveTo(0,-GRID); ctx.lineTo(0,0); ctx.stroke();
      const bars = [{ w:0.75, y:0 }, { w:0.5, y:GRID*0.33 }, { w:0.25, y:GRID*0.66 }];
      for (const b of bars) { ctx.beginPath(); ctx.moveTo(-b.w*GRID,b.y); ctx.lineTo(b.w*GRID,b.y); ctx.stroke(); }
    },
  },

  switch: {
    label: "Switch", symbol: "SW", color: "#14532d",
    terminals: [{ x:-2, y:0 }, { x:2, y:0 }],
    defaultProps: defaultPropsFromSchema(PROP_SCHEMAS.switch),
    propDefs: [{ key:"closed", label:"Closed", type:"boolean" }],
    draw(ctx, comp, sel, hov) {
      const col = sel ? colSel : hov ? colHov : "#14532d", r = GRID*0.2;
      ctx.strokeStyle = col; ctx.lineWidth = sel ? 2.5 : 2;
      ctx.beginPath();
      ctx.moveTo(-GRID*2,0); ctx.lineTo(-GRID,0);
      ctx.moveTo(GRID,0); ctx.lineTo(GRID*2,0);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(-GRID,0,r,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(GRID,0,r,0,Math.PI*2); ctx.stroke();
      ctx.beginPath();
      if (comp.props.closed) { ctx.moveTo(-GRID+r,0); ctx.lineTo(GRID-r,0); }
      else { ctx.moveTo(-GRID+r*0.7,-r*0.7); ctx.lineTo(GRID*0.35,-GRID*0.5); }
      ctx.stroke();
    },
  },

  led: {
    label: "LED", symbol: "▶", color: "#9a3412",
    terminals: [{ x:-2, y:0 }, { x:2, y:0 }],
    defaultProps: defaultPropsFromSchema(PROP_SCHEMAS.led),
    propDefs: [
      { key:"color", label:"LED Color", type:"select", options:["red","green","blue","yellow","white"] },
      { key:"forwardVoltage", label:"Forward Vf (V)", type:"number", min:0, step:0.1 },
    ],
    draw(ctx, comp, sel, hov) {
      const col = sel ? colSel : hov ? colHov : "#9a3412", s = GRID*0.7;
      ctx.strokeStyle = col; ctx.lineWidth = sel ? 2.5 : 2;
      ctx.beginPath();
      ctx.moveTo(-GRID*2,0); ctx.lineTo(-s,0);
      ctx.moveTo(s,0); ctx.lineTo(GRID*2,0);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s,-s); ctx.lineTo(-s,s); ctx.lineTo(s,0); ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = sel ? "rgba(37,99,235,.15)" : `${comp.props.color as string}33`; ctx.fill();
      ctx.beginPath(); ctx.moveTo(s,-s); ctx.lineTo(s,s); ctx.stroke();
      ctx.lineWidth = 1.2;
      for (let i=0; i<2; i++) {
        const ox=GRID*0.3+i*GRID*0.28, oy=-GRID*0.6-i*GRID*0.1;
        ctx.beginPath(); ctx.moveTo(ox,oy); ctx.lineTo(ox+GRID*0.28,oy-GRID*0.32); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ox+GRID*0.28,oy-GRID*0.32); ctx.lineTo(ox+GRID*0.18,oy-GRID*0.32);
        ctx.moveTo(ox+GRID*0.28,oy-GRID*0.32); ctx.lineTo(ox+GRID*0.28,oy-GRID*0.2);
        ctx.stroke();
      }
    },
  },
};

// ─── Camera ───────────────────────────────────────────────────────────────────

interface Camera { x: number; y: number; z: number; }

// ─── World-space terminal positions ──────────────────────────────────────────

function termWorlds(comp: Component): Vec2[] {
  const def = COMPONENT_DEFS[comp.type];
  if (!def) return [];
  const rad = (comp.rotation * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  return def.terminals.map((t) => {
    const wx = t.x * GRID, wy = t.y * GRID;
    return { x: comp.position.x + wx*cos - wy*sin, y: comp.position.y + wx*sin + wy*cos };
  });
}

// ─── Orthogonal routing ───────────────────────────────────────────────────────

function orthoRoute(a: Vec2, b: Vec2): Vec2[] {
  const pts: Vec2[] = [{ ...a }];
  if (a.x !== b.x) pts.push({ x: b.x, y: a.y });
  if (pts[pts.length-1].x !== b.x || pts[pts.length-1].y !== b.y) pts.push({ ...b });
  else if (pts.length === 1) pts.push({ ...b });
  return pts;
}

// ─── Snap to nearest terminal / wire endpoint ────────────────────────────────

function snapToNearby(components: Component[], wires: Wire[], world: Vec2, radius = GRID * 0.85): Vec2 {
  let best = radius, pt = snapVec(world);
  for (const c of components) for (const t of termWorlds(c)) { const d = dist(t, world); if (d < best) { best = d; pt = snapVec(t); } }
  for (const w of wires) for (const p of w.points) { const d = dist(p, world); if (d < best) { best = d; pt = snapVec(p); } }
  return pt;
}

// ─── Hit testing ─────────────────────────────────────────────────────────────

function hitComponent(comp: Component, pt: Vec2): boolean {
  const ts = termWorlds(comp);
  const allX = [comp.position.x, ...ts.map(t => t.x)];
  const allY = [comp.position.y, ...ts.map(t => t.y)];
  const pad = GRID * 0.85;
  return pt.x >= Math.min(...allX)-pad && pt.x <= Math.max(...allX)+pad
      && pt.y >= Math.min(...allY)-pad && pt.y <= Math.max(...allY)+pad;
}

function hitWire(wire: Wire, pt: Vec2): boolean {
  const ps = wire.points, thr = GRID * 0.42;
  for (let i = 0; i < ps.length-1; i++) {
    const a = ps[i], b = ps[i+1];
    const l2 = (b.x-a.x)**2 + (b.y-a.y)**2;
    if (l2 < 1) continue;
    let t = ((pt.x-a.x)*(b.x-a.x)+(pt.y-a.y)*(b.y-a.y))/l2;
    t = Math.max(0, Math.min(1, t));
    if (Math.hypot(pt.x-(a.x+t*(b.x-a.x)), pt.y-(a.y+t*(b.y-a.y))) < thr) return true;
  }
  return false;
}

function hitTest(components: Component[], wires: Wire[], pt: Vec2): string | null {
  for (let i = components.length-1; i >= 0; i--) if (hitComponent(components[i], pt)) return components[i].id;
  for (let i = wires.length-1; i >= 0; i--)  if (hitWire(wires[i], pt)) return wires[i].id;
  return null;
}

// ─── Junction detection ───────────────────────────────────────────────────────

function findJunctions(components: Component[], wires: Wire[]): Vec2[] {
  const result: Vec2[] = [], candidates: Vec2[] = [];
  for (const c of components) for (const t of termWorlds(c)) candidates.push(t);
  for (const w of wires) { candidates.push(w.points[0]); candidates.push(w.points[w.points.length-1]); }
  for (const pt of candidates) {
    let count = 0;
    for (const w of wires) for (const wp of w.points) if (dist(pt, wp) < 2) count++;
    for (const c of components) for (const t of termWorlds(c)) if (dist(pt, t) < 2) count++;
    if (count >= 3 && !result.some(r => dist(r, pt) < 2)) result.push(pt);
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
  | { type: "D"; name: string; n1: string; n2: string; vf: number   }
  | { type: "S"; name: string; n1: string; n2: string; state: boolean };

export interface Netlist {
  nodes: string[];
  components: NetlistComponent[];
  warnings: string[];
}

/**
 * Union-Find over snapped Vec2 keys for node grouping.
 */
class UnionFind {
  private parent = new Map<string, string>();

  private key(p: Vec2): string { return `${snap(p.x)},${snap(p.y)}`; }

  add(p: Vec2): string {
    const k = this.key(p);
    if (!this.parent.has(k)) this.parent.set(k, k);
    return k;
  }

  find(p: Vec2): string {
    let k = this.add(p);
    while (this.parent.get(k) !== k) {
      // path-compression one step
      this.parent.set(k, this.parent.get(this.parent.get(k)!)!);
      k = this.parent.get(k)!;
    }
    return k;
  }

  union(a: Vec2, b: Vec2): void {
    this.add(a); this.add(b);
    const ra = this.find(a), rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

/**
 * Convert the current circuit into an MNA-ready Netlist.
 *
 * Algorithm
 * ─────────
 * 1. Walk every wire, union-ing consecutive points into one electrical node.
 * 2. Register all component terminals and connect them to wire endpoints
 *    that are within snapping distance.
 * 3. Any terminal of a "ground" component forces its root to node "0".
 * 4. Remaining roots get sequential integer IDs ("1", "2", …).
 * 5. Each component is mapped to a NetlistComponent.
 */
export function generateNetlist(circuit: Circuit): Netlist {
  const warnings: string[] = [];
  const uf = new UnionFind();

  // 1. Union wire segments
  for (const wire of circuit.wires) {
    if (wire.points.length === 0) continue;
    wire.points.forEach(p => uf.add(p));
    for (let i = 0; i < wire.points.length-1; i++) uf.union(wire.points[i], wire.points[i+1]);
  }

  // 2. Register terminals, connect to nearby wire points
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

  // 3. Ground roots → node "0"
  const groundRoots = new Set<string>();
  for (const comp of circuit.components) {
    if (comp.type === "ground") {
      const tw = termWorlds(comp)[0];
      if (tw) groundRoots.add(uf.find(tw));
    }
  }
  if (groundRoots.size === 0) warnings.push("No ground component found. Node '0' will not be defined.");

  // 4. Assign node IDs
  const rootToNode = new Map<string, string>();
  for (const gr of groundRoots) rootToNode.set(gr, "0");
  let nextNode = 1;

  const nodeOf = (pt: Vec2): string => {
    const root = uf.find(pt);
    if (!rootToNode.has(root)) rootToNode.set(root, String(nextNode++));
    return rootToNode.get(root)!;
  };

  // 5. Map components
  const nlComps: NetlistComponent[] = [];
  const counters: Record<string, number> = {};
  const nextName = (prefix: string) => { counters[prefix] = (counters[prefix] ?? 0) + 1; return `${prefix}${counters[prefix]}`; };

  for (const comp of circuit.components) {
    const tw = termWorlds(comp);
    switch (comp.type) {
      case "resistor":
        nlComps.push({ type: "R", name: nextName("R"), n1: nodeOf(tw[0]), n2: nodeOf(tw[1]), value: comp.props.resistance as number });
        break;
      case "capacitor":
        nlComps.push({ type: "C", name: nextName("C"), n1: nodeOf(tw[0]), n2: nodeOf(tw[1]), value: comp.props.capacitance as number });
        break;
      case "inductor":
        nlComps.push({ type: "L", name: nextName("L"), n1: nodeOf(tw[0]), n2: nodeOf(tw[1]), value: comp.props.inductance as number });
        break;
      case "vsource":
        nlComps.push({ type: "V", name: nextName("V"), n1: nodeOf(tw[0]), n2: nodeOf(tw[1]), value: comp.props.voltage as number });
        break;
      case "led":
        nlComps.push({ type: "D", name: nextName("D"), n1: nodeOf(tw[0]), n2: nodeOf(tw[1]), vf: comp.props.forwardVoltage as number });
        break;
      case "switch":
        nlComps.push({ type: "S", name: nextName("S"), n1: nodeOf(tw[0]), n2: nodeOf(tw[1]), state: comp.props.closed as boolean });
        break;
      case "ground":
        break; // handled via node "0" assignment only
    }
  }

  // Collect nodes and detect floating ones
  const nodeSet = new Set<string>();
  for (const nc of nlComps) { nodeSet.add(nc.n1); nodeSet.add(nc.n2); }
  const nodeCount = new Map<string, number>();
  for (const nc of nlComps) {
    nodeCount.set(nc.n1, (nodeCount.get(nc.n1) ?? 0) + 1);
    nodeCount.set(nc.n2, (nodeCount.get(nc.n2) ?? 0) + 1);
  }
  for (const [node, count] of nodeCount) {
    if (count < 2) warnings.push(`Node ${node} appears to be floating (only 1 connection).`);
  }

  const nodes = Array.from(nodeSet).sort((a, b) => {
    const na = parseInt(a), nb = parseInt(b);
    return (isNaN(na) || isNaN(nb)) ? a.localeCompare(b) : na - nb;
  });

  return { nodes, components: nlComps, warnings };
}

/**
 * Serialize a Netlist to SPICE-style text.
 *
 * Example:
 *   V1 1 0 5
 *   R1 1 2 1000
 *   D1 2 0 VF=2
 */
export function netlistToString(netlist: Netlist): string {
  const lines: string[] = [];
  for (const nc of netlist.components) {
    switch (nc.type) {
      case "R": case "C": case "L": case "V":
        lines.push(`${nc.name} ${nc.n1} ${nc.n2} ${nc.value}`); break;
      case "D":
        lines.push(`${nc.name} ${nc.n1} ${nc.n2} VF=${nc.vf}`); break;
      case "S":
        lines.push(`${nc.name} ${nc.n1} ${nc.n2} ${nc.state ? "CLOSED" : "OPEN"}`); break;
    }
  }
  if (netlist.warnings.length > 0) {
    lines.push("");
    for (const w of netlist.warnings) lines.push(`* WARNING: ${w}`);
  }
  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── REDUCER / STATE ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

type ToolMode = "select" | "wire" | "place";
interface HistoryEntry { components: Component[]; wires: Wire[]; }

function readPersistedTheme(): boolean {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "dark")  return true;
    if (v === "light") return false;
  } catch { /* SSR / private browsing */ }
  return false; // ← light mode by default
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
  | { type: "SET_TOOL";        tool: ToolMode; placingType?: ComponentType | null }
  | { type: "SET_MOUSE";       pos: Vec2 }
  | { type: "SET_GHOST";       pos: Vec2; rot?: Rotation }
  | { type: "ROTATE_GHOST" }
  | { type: "ADD_COMPONENT";   comp: Component }
  | { type: "ADD_WIRE";        wire: Wire }
  | { type: "SET_WIRE_POINTS"; pts: Vec2[] }
  | { type: "DELETE_SELECTED" }
  | { type: "SELECT";          ids: string[] }
  | { type: "MOVE_SELECTION";  dx: number; dy: number }
  | { type: "ROTATE_SELECTED" }
  | { type: "UPDATE_PROP";     id: string; key: string; value: unknown }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "LOAD";            components: Component[]; wires: Wire[] }
  | { type: "TOGGLE_GRID" }
  | { type: "TOGGLE_DARK" };

const initialState: AppState = {
  components: [], wires: [], selection: [],
  tool: "select", placingType: null, wirePoints: [],
  mouseWorld: { x:0, y:0 }, ghostPos: null, ghostRot: 0,
  showGrid: true,
  darkMode: readPersistedTheme(),
  history: [{ components: [], wires: [] }],
  historyIdx: 0,
};

function cloneCircuit(s: AppState) {
  return { components: JSON.parse(JSON.stringify(s.components)), wires: JSON.parse(JSON.stringify(s.wires)) };
}
function cloneEntry(e: HistoryEntry) {
  return { components: JSON.parse(JSON.stringify(e.components)), wires: JSON.parse(JSON.stringify(e.wires)) };
}
function pushHistory(state: AppState): AppState {
  const entry = cloneCircuit(state);
  const history = [...state.history.slice(0, state.historyIdx+1), entry];
  if (history.length > 80) history.shift();
  return { ...state, history, historyIdx: history.length-1 };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_TOOL":         return { ...state, tool: action.tool, placingType: action.placingType ?? null, wirePoints: [], selection: [], ghostPos: null };
    case "SET_MOUSE":        return { ...state, mouseWorld: action.pos };
    case "SET_GHOST":        return { ...state, ghostPos: action.pos, ghostRot: action.rot ?? state.ghostRot };
    case "ROTATE_GHOST":     return { ...state, ghostRot: ((state.ghostRot+90)%360) as Rotation };
    case "ADD_COMPONENT":    return pushHistory({ ...state, components: [...state.components, action.comp] });
    case "ADD_WIRE":         return pushHistory({ ...state, wires: [...state.wires, action.wire] });
    case "SET_WIRE_POINTS":  return { ...state, wirePoints: action.pts };
    case "DELETE_SELECTED": {
      const ids = new Set(state.selection);
      return pushHistory({ ...state, components: state.components.filter(c => !ids.has(c.id)), wires: state.wires.filter(w => !ids.has(w.id)), selection: [] });
    }
    case "SELECT":           return { ...state, selection: action.ids };
    case "MOVE_SELECTION": {
      const ids = new Set(state.selection);
      return { ...state,
        components: state.components.map(c => ids.has(c.id) ? { ...c, position: { x: c.position.x+action.dx, y: c.position.y+action.dy } } : c),
        wires: state.wires.map(w => ids.has(w.id) ? { ...w, points: w.points.map(p => ({ x: p.x+action.dx, y: p.y+action.dy })) } : w),
      };
    }
    case "ROTATE_SELECTED": {
      const ids = new Set(state.selection);
      return pushHistory({ ...state, components: state.components.map(c => ids.has(c.id) ? { ...c, rotation: ((c.rotation+90)%360) as Rotation } : c) });
    }
    case "UPDATE_PROP":
      return pushHistory({ ...state, components: state.components.map(c => c.id === action.id ? { ...c, props: { ...c.props, [action.key]: action.value } } : c) });
    case "UNDO": {
      if (state.historyIdx <= 0) return state;
      const idx = state.historyIdx-1;
      return { ...state, historyIdx: idx, ...cloneEntry(state.history[idx]), selection: [] };
    }
    case "REDO": {
      if (state.historyIdx >= state.history.length-1) return state;
      const idx = state.historyIdx+1;
      return { ...state, historyIdx: idx, ...cloneEntry(state.history[idx]), selection: [] };
    }
    case "LOAD":
      return pushHistory({ ...state, components: action.components, wires: action.wires, selection: [], wirePoints: [] });
    case "TOGGLE_GRID":  return { ...state, showGrid: !state.showGrid };
    case "TOGGLE_DARK": {
      const next = !state.darkMode;
      try { localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light"); } catch {}
      return { ...state, darkMode: next };
    }
    default: return state;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── CANVAS RENDERER ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface DragBox { sx: number; sy: number; ex: number; ey: number; }

function renderCanvas(
  ctx: CanvasRenderingContext2D,
  state: AppState,
  cam: Camera,
  hoverId: string | null,
  dragBox: DragBox | null
): void {
  const W = ctx.canvas.width / (window.devicePixelRatio || 1);
  const H = ctx.canvas.height / (window.devicePixelRatio || 1);
  const dark = state.darkMode;

  // Light-mode palette (high contrast on white)
  const bg         = dark ? "#0a0c14" : "#ffffff";
  const gridLine   = dark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.07)";
  const gridAccent = dark ? "rgba(255,255,255,.1)"  : "rgba(0,0,0,.18)";
  const wireCol    = dark ? "#94a3b8" : "#1e293b";
  const juncCol    = dark ? "#e2e8f0" : "#1e293b";
  const termAlpha  = dark ? "rgba(96,165,250,.5)" : "rgba(37,99,235,.45)";

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Grid
  if (state.showGrid) {
    const tl = s2w(0,0,cam), br = s2w(W,H,cam);
    const startX = Math.floor(tl.x/GRID)*GRID, startY = Math.floor(tl.y/GRID)*GRID;
    ctx.lineWidth = 0.5;
    for (let x = startX; x <= br.x+GRID; x += GRID) {
      ctx.strokeStyle = x%(GRID*5)===0 ? gridAccent : gridLine;
      const px = x*cam.z+cam.x;
      ctx.beginPath(); ctx.moveTo(px,0); ctx.lineTo(px,H); ctx.stroke();
    }
    for (let y = startY; y <= br.y+GRID; y += GRID) {
      ctx.strokeStyle = y%(GRID*5)===0 ? gridAccent : gridLine;
      const py = y*cam.z+cam.y;
      ctx.beginPath(); ctx.moveTo(0,py); ctx.lineTo(W,py); ctx.stroke();
    }
  }

  // Wires
  for (const wire of state.wires) {
    const sel = state.selection.includes(wire.id);
    const hov = hoverId === wire.id;
    ctx.strokeStyle = sel ? colSel : hov ? colHov : wireCol;
    ctx.lineWidth = sel || hov ? 2.5 : 1.8;
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath();
    const pts = wire.points.map(p => w2s(p.x,p.y,cam));
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i=1; i<pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  // Components
  for (const comp of state.components) {
    const def = COMPONENT_DEFS[comp.type];
    if (!def) continue;
    const sel = state.selection.includes(comp.id);
    const hov = hoverId === comp.id;
    const sp  = w2s(comp.position.x, comp.position.y, cam);

    if (sel) {
      const ts   = termWorlds(comp);
      const allX = [comp.position.x, ...ts.map(t=>t.x)];
      const allY = [comp.position.y, ...ts.map(t=>t.y)];
      const pad  = GRID;
      const tl   = w2s(Math.min(...allX)-pad, Math.min(...allY)-pad, cam);
      const br   = w2s(Math.max(...allX)+pad, Math.max(...allY)+pad, cam);
      ctx.strokeStyle = "rgba(37,99,235,.35)"; ctx.lineWidth = 1; ctx.setLineDash([4,3]);
      ctx.strokeRect(tl.x, tl.y, br.x-tl.x, br.y-tl.y); ctx.setLineDash([]);
    }

    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate((comp.rotation*Math.PI)/180);
    ctx.scale(cam.z, cam.z);
    def.draw(ctx, comp, sel, hov);
    ctx.restore();

    for (const t of termWorlds(comp)) {
      const ts = w2s(t.x, t.y, cam);
      ctx.beginPath(); ctx.arc(ts.x, ts.y, 3.5, 0, Math.PI*2);
      ctx.fillStyle = sel ? "rgba(37,99,235,.8)" : hov ? "rgba(124,58,237,.6)" : termAlpha;
      ctx.fill();
    }
  }

  // Junctions
  for (const j of findJunctions(state.components, state.wires)) {
    const js = w2s(j.x, j.y, cam);
    ctx.beginPath(); ctx.arc(js.x, js.y, 4.5*cam.z, 0, Math.PI*2);
    ctx.fillStyle = juncCol; ctx.fill();
  }

  // Wire preview
  if (state.tool === "wire" && state.wirePoints.length > 0) {
    const endPt = snapToNearby(state.components, state.wires, state.mouseWorld);
    const chain = [...state.wirePoints, endPt];
    ctx.strokeStyle = "rgba(37,99,235,.75)"; ctx.lineWidth = 2; ctx.setLineDash([6,4]); ctx.lineCap = "round";
    ctx.beginPath();
    let first = true;
    for (let i=0; i<chain.length-1; i++) {
      const seg = orthoRoute(chain[i], chain[i+1]);
      for (let j=0; j<seg.length; j++) {
        const sp = w2s(seg[j].x, seg[j].y, cam);
        if (j===0 && first) { ctx.moveTo(sp.x,sp.y); first=false; } else ctx.lineTo(sp.x,sp.y);
      }
    }
    ctx.stroke(); ctx.setLineDash([]);
    const fs = w2s(state.wirePoints[0].x, state.wirePoints[0].y, cam);
    ctx.beginPath(); ctx.arc(fs.x,fs.y,5,0,Math.PI*2); ctx.fillStyle=colSel; ctx.fill();
    const ep = w2s(endPt.x,endPt.y,cam);
    ctx.beginPath(); ctx.arc(ep.x,ep.y,4,0,Math.PI*2); ctx.fillStyle="rgba(37,99,235,.55)"; ctx.fill();
  }

  // Ghost placement preview
  if (state.tool === "place" && state.ghostPos && state.placingType) {
    const def = COMPONENT_DEFS[state.placingType];
    const sp  = w2s(state.ghostPos.x, state.ghostPos.y, cam);
    ctx.save();
    ctx.translate(sp.x,sp.y); ctx.rotate((state.ghostRot*Math.PI)/180); ctx.scale(cam.z,cam.z);
    ctx.globalAlpha = 0.45;
    def.draw(ctx, { id:"__ghost__", type:state.placingType, position:{x:0,y:0}, rotation:0, props:def.defaultProps }, false, false);
    ctx.globalAlpha = 1; ctx.restore();
    ctx.strokeStyle = "rgba(37,99,235,.18)"; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(sp.x,0); ctx.lineTo(sp.x,H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,sp.y); ctx.lineTo(W,sp.y); ctx.stroke();
  }

  // Drag-select box
  if (dragBox) {
    const x=Math.min(dragBox.sx,dragBox.ex), y=Math.min(dragBox.sy,dragBox.ey);
    const w=Math.abs(dragBox.ex-dragBox.sx), h=Math.abs(dragBox.ey-dragBox.sy);
    ctx.fillStyle   = "rgba(37,99,235,.07)"; ctx.fillRect(x,y,w,h);
    ctx.strokeStyle = "rgba(37,99,235,.5)";  ctx.lineWidth=1; ctx.setLineDash([4,3]);
    ctx.strokeRect(x,y,w,h); ctx.setLineDash([]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── COMPONENT PROPERTY RENDERER  (schema-driven, no per-type switch) ─────────
// ═══════════════════════════════════════════════════════════════════════════════

interface ComponentPropertyRendererProps {
  comp: Component;
  dark: boolean;
  dispatch: React.Dispatch<Action>;
}

function ComponentPropertyRenderer({ comp, dark, dispatch }: ComponentPropertyRendererProps) {
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

  if (entries.length === 0) {
    return <p style={{ fontSize:11, color:textMuted, fontFamily:"monospace" }}>No configurable properties.</p>;
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {entries.map(([key, field]) => {
        const value = comp.props[key];
        return (
          <div key={key} style={{ display:"flex", flexDirection:"column", gap:3 }}>
            <label style={{ fontSize:10, fontFamily:"monospace", letterSpacing:"0.05em", color:textMuted }}>
              {field.label}
            </label>

            {field.type === "boolean" ? (
              /* Custom toggle — no checkbox, cleaner look */
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
                <div
                  role="checkbox"
                  aria-checked={value as boolean}
                  tabIndex={0}
                  onClick={() => dispatch({ type:"UPDATE_PROP", id:comp.id, key, value:!(value as boolean) })}
                  onKeyDown={e => { if (e.key===" "||e.key==="Enter") dispatch({ type:"UPDATE_PROP", id:comp.id, key, value:!(value as boolean) }); }}
                  style={{
                    width:36, height:20, borderRadius:10, position:"relative", cursor:"pointer", flexShrink:0,
                    background: value ? "#2563eb" : (dark ? "#334155" : "#d1d5db"),
                    transition:"background .15s",
                  }}
                >
                  <div style={{
                    position:"absolute", top:3, left: value ? 18 : 3,
                    width:14, height:14, borderRadius:"50%", background:"#fff",
                    transition:"left .15s",
                  }} />
                </div>
                <span style={{ fontSize:12, fontFamily:"monospace", color:dark?"#94a3b8":"#374151" }}>
                  {value ? "Closed" : "Open"}
                </span>
              </label>

            ) : field.type === "select" ? (
              <select
                value={value as string}
                onChange={e => dispatch({ type:"UPDATE_PROP", id:comp.id, key, value:e.target.value })}
                style={inputBase}
              >
                {(field as SelectField).options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>

            ) : (
              <input
                type="number"
                value={value as number}
                min={(field as NumberField).min}
                step={(field as NumberField).step}
                style={inputBase}
                onChange={e => dispatch({ type:"UPDATE_PROP", id:comp.id, key, value:parseFloat(e.target.value)||0 })}
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
  /** Position relative to the canvas wrapper element */
  anchorScreen: Vec2 | null;
  /** Bounding rect of the canvas wrapper (for viewport clamping) */
  canvasRect: DOMRect | null;
  dark: boolean;
  dispatch: React.Dispatch<Action>;
}

function ComponentPopover({ comp, anchorScreen, canvasRect, dark, dispatch }: ComponentPopoverProps) {
  const open = comp !== null && anchorScreen !== null;
  const def  = comp ? COMPONENT_DEFS[comp.type] : null;

  // Convert canvas-relative position → viewport-absolute
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
    width:"100%", background:"transparent", border, color:textMut,
    borderRadius:5, padding:"5px 8px", fontSize:11,
    fontFamily:"'JetBrains Mono',monospace", cursor:"pointer", textAlign:"left", marginBottom:4,
  };

  return (
    <PopoverPrimitive.Root open={open}>
      {/*
        Invisible 0×0 anchor fixed at the component's screen position.
        Radix positions PopoverContent relative to this element.
      */}
      <PopoverPrimitive.Anchor
        style={{
          position: "fixed",
          left: absAnchor?.x ?? 0,
          top:  absAnchor?.y ?? 0,
          width: 0, height: 0,
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
          onOpenAutoFocus={e => e.preventDefault()}
          onInteractOutside={() => dispatch({ type:"SELECT", ids:[] })}
          onEscapeKeyDown={()   => dispatch({ type:"SELECT", ids:[] })}
          style={{
            width: 224, background: popBg, border, borderRadius: 10,
            boxShadow: shadow, padding: 14,
            display: "flex", flexDirection: "column", gap: 10,
            zIndex: 1000, fontFamily: "'JetBrains Mono',monospace",
          }}
        >
          {comp && def && (
            <>
              {/* ── Header ── */}
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                <span style={{
                  display:"inline-flex", alignItems:"center", justifyContent:"center",
                  width:26, height:26, borderRadius:6,
                  background:`${def.color}20`, color:def.color,
                  fontSize:10, fontWeight:700,
                }}>
                  {def.symbol}
                </span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:textPri }}>{def.label}</div>
                  <div style={{ fontSize:9, color:textMut }}>{comp.id}</div>
                </div>
                <PopoverPrimitive.Close
                  onClick={() => dispatch({ type:"SELECT", ids:[] })}
                  aria-label="Close"
                  style={{ background:"transparent", border:"none", color:textMut, cursor:"pointer", fontSize:16, lineHeight:1, padding:"2px 4px", borderRadius:3 }}
                >
                  ×
                </PopoverPrimitive.Close>
              </div>

              <div style={{ fontSize:9.5, color:textMut, lineHeight:1.8 }}>
                pos ({Math.round(comp.position.x)}, {Math.round(comp.position.y)}) · rot {comp.rotation}°
              </div>

              {/* ── Schema-driven fields ── */}
              <ComponentPropertyRenderer comp={comp} dark={dark} dispatch={dispatch} />

              {/* ── Actions ── */}
              <div style={{ borderTop: dark?"1px solid #1e293b":"1px solid #e5e7eb", paddingTop:8, marginTop:2 }}>
                <button style={actBase} onClick={() => dispatch({ type:"ROTATE_SELECTED" })}>↻ Rotate 90°</button>
                <button style={{ ...actBase, color:"#dc2626", marginBottom:0 }} onClick={() => dispatch({ type:"DELETE_SELECTED" })}>✕ Delete</button>
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

interface NetlistModalProps { circuit: Circuit; dark: boolean; onClose: () => void; }

function NetlistModal({ circuit, dark, onClose }: NetlistModalProps) {
  const netlist = generateNetlist(circuit);
  const text    = netlistToString(netlist);
  const [copied, setCopied] = useState(false);

  const copy = () => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });

  const bg     = dark ? "#0f172a" : "#ffffff";
  const border = dark ? "1px solid #1e293b" : "1px solid #e5e7eb";
  const textPri= dark ? "#e2e8f0" : "#111827";
  const textMut= dark ? "#64748b" : "#6b7280";
  const codeBg = dark ? "#080a12" : "#f9fafb";

  return (
    <div
      style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:560, maxHeight:"80vh", background:bg, borderRadius:12, border,
          boxShadow:"0 16px 48px rgba(0,0,0,.25)", display:"flex", flexDirection:"column",
          overflow:"hidden", fontFamily:"'JetBrains Mono',monospace",
        }}
      >
        {/* Header */}
        <div style={{ padding:"13px 16px", borderBottom:border, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:13, fontWeight:600, color:textPri }}>Netlist  (SPICE / MNA)</span>
          <div style={{ flex:1 }} />
          {netlist.warnings.length > 0 && (
            <span style={{ fontSize:10, color:"#b45309", background:"#fef3c7", borderRadius:4, padding:"2px 8px" }}>
              {netlist.warnings.length} warning{netlist.warnings.length>1?"s":""}
            </span>
          )}
          <button onClick={copy}    style={{ fontSize:11, color:copied?"#15803d":"#2563eb", background:"transparent", border:"none", cursor:"pointer" }}>{copied ? "✓ Copied" : "Copy"}</button>
          <button onClick={onClose} style={{ fontSize:16, color:textMut, background:"transparent", border:"none", cursor:"pointer", lineHeight:1 }}>×</button>
        </div>

        {/* Node summary */}
        <div style={{ padding:"8px 16px", borderBottom:border, display:"flex", gap:14, flexWrap:"wrap" }}>
          <span style={{ fontSize:10, color:textMut }}>Nodes: <strong style={{ color:textPri }}>{netlist.nodes.join(", ")||"—"}</strong></span>
          <span style={{ fontSize:10, color:textMut }}>Elements: <strong style={{ color:textPri }}>{netlist.components.length}</strong></span>
        </div>

        {/* Netlist text */}
        <pre style={{ flex:1, overflowY:"auto", margin:0, padding:"12px 16px", fontSize:12, lineHeight:1.9, color:textPri, background:codeBg, whiteSpace:"pre-wrap", wordBreak:"break-all" }}>
          {text || "* Empty circuit"}
        </pre>

        {/* Warnings */}
        {netlist.warnings.length > 0 && (
          <div style={{ padding:"10px 16px", borderTop:border, display:"flex", flexDirection:"column", gap:4 }}>
            {netlist.warnings.map((w,i) => (
              <div key={i} style={{ fontSize:10, color:"#b45309", fontFamily:"monospace" }}>⚠ {w}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── CIRCUIT CANVAS COMPONENT ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface MoveDrag { type:"move"; startWorld:Vec2; lastDx:number; lastDy:number; }
interface BoxDrag  { type:"box";  startScreen:Vec2; }
type DragState = MoveDrag | BoxDrag;

interface CircuitCanvasProps {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  cam: Camera;
  setCam: React.Dispatch<React.SetStateAction<Camera>>;
  /** Called when user clicks a component in select mode. */
  onComponentClick: (compId: string, canvasRelativeScreen: Vec2) => void;
}

function CircuitCanvas({ state, dispatch, cam, setCam, onComponentClick }: CircuitCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverId, setHoverId] = useState<string|null>(null);
  const [dragBox, setDragBox] = useState<DragBox|null>(null);

  const dragRef  = useRef<DragState|null>(null);
  const panRef   = useRef<{ lx:number; ly:number }|null>(null);
  const stateRef = useRef(state);
  const camRef   = useRef(cam);
  stateRef.current = state;
  camRef.current   = cam;

  // Resize
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio||1;
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      canvas.getContext("2d")!.scale(dpr,dpr);
    };
    const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
    return () => ro.disconnect();
  }, []);

  // Render
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    renderCanvas(ctx, state, cam, hoverId, dragBox);
  });

  const getWorld  = useCallback((e:React.MouseEvent): Vec2 => {
    const r = canvasRef.current!.getBoundingClientRect();
    return s2w(e.clientX-r.left, e.clientY-r.top, camRef.current);
  }, []);
  const getScreen = useCallback((e:React.MouseEvent): Vec2 => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX-r.left, y: e.clientY-r.top };
  }, []);

  // Wheel (non-passive)
  const onWheel = useCallback((e:WheelEvent) => {
    e.preventDefault();
    const r = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX-r.left, sy = e.clientY-r.top;
    const f  = e.deltaY < 0 ? 1.12 : 1/1.12;
    setCam(c => { const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, c.z*f)); return { x:sx-(sx-c.x)*(z/c.z), y:sy-(sy-c.y)*(z/c.z), z }; });
  }, [setCam]);
  useEffect(() => {
    const el = canvasRef.current; if (!el) return;
    el.addEventListener("wheel", onWheel, { passive:false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  const onMouseMove = useCallback((e:React.MouseEvent) => {
    const world  = getWorld(e);
    const screen = getScreen(e);
    dispatch({ type:"SET_MOUSE", pos:world });

    if (panRef.current) {
      setCam(c => ({ ...c, x:c.x+e.clientX-panRef.current!.lx, y:c.y+e.clientY-panRef.current!.ly }));
      panRef.current = { lx:e.clientX, ly:e.clientY }; return;
    }
    const st = stateRef.current;
    if (st.tool === "place") dispatch({ type:"SET_GHOST", pos:snapToNearby(st.components,st.wires,world) });

    if (dragRef.current?.type === "move") {
      const dr = dragRef.current as MoveDrag;
      const dx = world.x-dr.startWorld.x, dy = world.y-dr.startWorld.y;
      const sdx = snap(dx)-dr.lastDx, sdy = snap(dy)-dr.lastDy;
      if (sdx!==0||sdy!==0) { dispatch({ type:"MOVE_SELECTION", dx:sdx, dy:sdy }); dr.lastDx+=sdx; dr.lastDy+=sdy; }
      return;
    }
    if (dragRef.current?.type === "box") {
      const dr = dragRef.current as BoxDrag;
      setDragBox({ sx:dr.startScreen.x, sy:dr.startScreen.y, ex:screen.x, ey:screen.y });
      const c2 = camRef.current;
      const tl = s2w(Math.min(dr.startScreen.x,screen.x), Math.min(dr.startScreen.y,screen.y), c2);
      const br = s2w(Math.max(dr.startScreen.x,screen.x), Math.max(dr.startScreen.y,screen.y), c2);
      const ids = st.components.filter(c => c.position.x>=tl.x&&c.position.x<=br.x&&c.position.y>=tl.y&&c.position.y<=br.y).map(c=>c.id);
      dispatch({ type:"SELECT", ids }); return;
    }
    setHoverId(hitTest(st.components, st.wires, world));
  }, [dispatch, getWorld, getScreen, setCam]);

  const onMouseDown = useCallback((e:React.MouseEvent) => {
    e.preventDefault();
    if (e.button===1||(e.button===0&&e.altKey)) { panRef.current={lx:e.clientX,ly:e.clientY}; return; }
    if (e.button!==0) return;

    const world  = getWorld(e);
    const screen = getScreen(e);
    const st     = stateRef.current;

    if (st.tool==="place"&&st.ghostPos&&st.placingType) {
      const def = COMPONENT_DEFS[st.placingType];
      dispatch({ type:"ADD_COMPONENT", comp:{ id:uid(), type:st.placingType, position:{...st.ghostPos}, rotation:st.ghostRot, props:JSON.parse(JSON.stringify(def.defaultProps)) } });
      return;
    }

    if (st.tool==="wire") {
      const pt = snapToNearby(st.components,st.wires,world);
      if (e.detail===2) {
        if (st.wirePoints.length>=1) {
          const chain = [...st.wirePoints, pt];
          const wirePts: Vec2[] = [];
          for (let i=0; i<chain.length-1; i++) wirePts.push(...orthoRoute(chain[i],chain[i+1]).slice(0,-1));
          wirePts.push(chain[chain.length-1]);
          if (wirePts.length>=2) dispatch({ type:"ADD_WIRE", wire:{ id:uid(), points:wirePts } });
        }
        dispatch({ type:"SET_WIRE_POINTS", pts:[] }); return;
      }
      dispatch({ type:"SET_WIRE_POINTS", pts:[...st.wirePoints, pt] }); return;
    }

    if (st.tool==="select") {
      const hit = hitTest(st.components, st.wires, world);
      if (hit) {
        const isComp = st.components.some(c=>c.id===hit);
        if (!e.shiftKey&&!st.selection.includes(hit)) dispatch({ type:"SELECT", ids:[hit] });
        else if (e.shiftKey) dispatch({ type:"SELECT", ids: st.selection.includes(hit)?st.selection.filter(x=>x!==hit):[...st.selection,hit] });
        if (isComp && !e.shiftKey) onComponentClick(hit, screen);
        dragRef.current = { type:"move", startWorld:world, lastDx:0, lastDy:0 };
      } else {
        if (!e.shiftKey) dispatch({ type:"SELECT", ids:[] });
        dragRef.current = { type:"box", startScreen:screen };
      }
    }
  }, [dispatch, getWorld, getScreen, onComponentClick]);

  const onMouseUp = useCallback(() => { panRef.current=null; dragRef.current=null; setDragBox(null); }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e:KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement|null)?.tagName;
      if (tag==="INPUT"||tag==="SELECT"||tag==="TEXTAREA") return;
      const st = stateRef.current;
      if (e.key==="Escape") {
        if (st.tool==="wire") dispatch({ type:"SET_WIRE_POINTS", pts:[] });
        else if (st.tool==="place") dispatch({ type:"SET_TOOL", tool:"select" });
        else dispatch({ type:"SELECT", ids:[] });
        return;
      }
      if (e.key==="r"||e.key==="R") {
        if (st.tool==="place") dispatch({ type:"ROTATE_GHOST" });
        else if (st.selection.length>0) dispatch({ type:"ROTATE_SELECTED" });
        return;
      }
      if (e.key==="Delete"||e.key==="Backspace") { if (st.selection.length>0) dispatch({ type:"DELETE_SELECTED" }); return; }
      if ((e.ctrlKey||e.metaKey)&&e.key==="z") { e.preventDefault(); dispatch({ type:"UNDO" }); return; }
      if ((e.ctrlKey||e.metaKey)&&(e.key==="y"||e.key==="Y")) { e.preventDefault(); dispatch({ type:"REDO" }); return; }
      if (e.key==="w"||e.key==="W") dispatch({ type:"SET_TOOL", tool:"wire" });
      if (e.key==="s"||e.key==="S") dispatch({ type:"SET_TOOL", tool:"select" });
      if (e.key==="g"||e.key==="G") dispatch({ type:"TOGGLE_GRID" });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch]);

  const cursor = state.tool==="wire" ? "crosshair" : state.tool==="place" ? "none" : "default";

  return (
    <canvas
      ref={canvasRef}
      style={{ flex:1, display:"block", width:"100%", height:"100%", cursor }}
      onMouseMove={onMouseMove}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onContextMenu={e => e.preventDefault()}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── PALETTE ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const PALETTE_GROUPS: { label:string; items:ComponentType[] }[] = [
  { label:"PASSIVE", items:["resistor","capacitor","inductor"] },
  { label:"SOURCES", items:["vsource","ground"] },
  { label:"ACTIVE",  items:["switch","led"] },
];

function Palette({ state, dispatch }: { state:AppState; dispatch:React.Dispatch<Action> }) {
  const dark = state.darkMode;
  const bg   = dark ? "#0e1120" : "#fafafa";
  const bdr  = dark ? "1px solid #1e293b" : "1px solid #e5e7eb";
  const sec  = dark ? "#374151" : "#9ca3af";

  const btn = (active:boolean): React.CSSProperties => ({
    width:"100%", textAlign:"left",
    background: active ? (dark?"#0f1f40":"#eff6ff") : "transparent",
    border:"none", color: active?"#2563eb":(dark?"#64748b":"#374151"),
    padding:"5px 8px", borderRadius:5, cursor:"pointer",
    fontSize:12, fontFamily:"'JetBrains Mono',monospace", fontWeight:active?600:400,
    display:"flex", alignItems:"center", gap:7,
  });
  const ico = (color:string): React.CSSProperties => ({
    display:"inline-flex", alignItems:"center", justifyContent:"center",
    width:18, height:18, borderRadius:3,
    background:`${color}20`, color, fontSize:9, fontWeight:700, flexShrink:0,
  });

  return (
    <div style={{ width:168, background:bg, borderRight:bdr, display:"flex", flexDirection:"column", padding:"10px 6px", gap:2, overflowY:"auto", flexShrink:0 }}>
      <div style={{ fontSize:9, letterSpacing:"0.15em", color:sec, fontWeight:700, marginBottom:6, paddingLeft:4, fontFamily:"monospace" }}>⚡ CIRCUIT SANDBOX</div>

      <div style={{ fontSize:9, letterSpacing:"0.1em", color:sec, fontWeight:700, margin:"4px 0 3px 4px", fontFamily:"monospace" }}>TOOLS</div>
      <button style={btn(state.tool==="select")} onClick={() => dispatch({ type:"SET_TOOL", tool:"select" })}>
        <span style={ico("#2563eb")}>↖</span> Select
      </button>
      <button style={btn(state.tool==="wire")} onClick={() => dispatch({ type:"SET_TOOL", tool:"wire" })}>
        <span style={ico("#7c3aed")}>⌐</span> Wire
      </button>

      {PALETTE_GROUPS.map(g => (
        <div key={g.label}>
          <div style={{ fontSize:9, letterSpacing:"0.1em", color:sec, fontWeight:700, margin:"10px 0 3px 4px", fontFamily:"monospace" }}>{g.label}</div>
          {g.items.map(t => {
            const def    = COMPONENT_DEFS[t];
            const active = state.tool==="place"&&state.placingType===t;
            return (
              <button key={t} style={btn(active)} onClick={() => dispatch({ type:"SET_TOOL", tool:"place", placingType:t })}>
                <span style={ico(def.color)}>{def.symbol}</span>{def.label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── TOOLBAR ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface ToolbarProps { state:AppState; dispatch:React.Dispatch<Action>; cam:Camera; onShowNetlist:()=>void; }

function Toolbar({ state, dispatch, cam, onShowNetlist }: ToolbarProps) {
  const dark = state.darkMode;
  const bg   = dark ? "#0e1120" : "#ffffff";
  const bdr  = dark ? "1px solid #1e293b" : "1px solid #e5e7eb";
  const btn: React.CSSProperties = {
    background:"transparent", border:"none",
    color: dark?"#64748b":"#6b7280",
    fontSize:11, fontFamily:"'JetBrains Mono',monospace",
    padding:"4px 8px", borderRadius:4, cursor:"pointer",
  };
  const sep: React.CSSProperties = { width:1, height:18, background:dark?"#1e293b":"#e5e7eb", margin:"0 3px" };

  const exportCircuit = () => {
    const json = JSON.stringify({ components:state.components, wires:state.wires }, null, 2);
    const a = Object.assign(document.createElement("a"), { href:URL.createObjectURL(new Blob([json],{type:"application/json"})), download:"circuit.json" });
    a.click();
  };
  const importCircuit = () => {
    const inp = Object.assign(document.createElement("input"), { type:"file", accept:".json" });
    inp.onchange = (e:Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
      const r = new FileReader();
      r.onload = ev => { try { const d = JSON.parse(ev.target?.result as string) as Circuit; dispatch({ type:"LOAD", components:d.components??[], wires:d.wires??[] }); } catch {} };
      r.readAsText(file);
    };
    inp.click();
  };

  return (
    <div style={{ height:40, background:bg, borderBottom:bdr, display:"flex", alignItems:"center", padding:"0 10px", gap:3, flexShrink:0 }}>
      <span style={{ fontSize:9.5, letterSpacing:"0.15em", color:dark?"#3a4060":"#9ca3af", fontWeight:700, fontFamily:"monospace", marginRight:6 }}>⚡ CIRCUIT</span>
      <button style={btn} onClick={() => dispatch({ type:"UNDO" })}>↩ Undo</button>
      <button style={btn} onClick={() => dispatch({ type:"REDO" })}>↪ Redo</button>
      <div style={sep} />
      <button style={{ ...btn, color:state.showGrid?"#2563eb":undefined }} onClick={() => dispatch({ type:"TOGGLE_GRID" })}>
        {state.showGrid?"⊞ Grid ✓":"⊞ Grid"}
      </button>
      <button style={btn} onClick={() => dispatch({ type:"TOGGLE_DARK" })}>{dark?"☀ Light":"◑ Dark"}</button>
      <div style={sep} />
      <button style={btn} onClick={exportCircuit}>↓ Export</button>
      <button style={btn} onClick={importCircuit}>↑ Import</button>
      <div style={sep} />
      <button style={{ ...btn, color:"#2563eb", fontWeight:600 }} onClick={onShowNetlist}>∑ Netlist</button>
      <div style={sep} />
      <button style={{ ...btn, color:"#dc2626" }} onClick={() => { dispatch({ type:"LOAD",components:[],wires:[] }); dispatch({ type:"SELECT",ids:[] }); }}>✕ Clear</button>
      <div style={{ flex:1 }} />
      <span style={{ fontSize:10, color:dark?"#3a4060":"#9ca3af", fontFamily:"monospace" }}>{Math.round(cam.z*100)}%</span>
    </div>
  );
}

// ─── Status Bar ───────────────────────────────────────────────────────────────

function StatusBar({ state }: { state:AppState }) {
  const dark = state.darkMode;
  const tips: Record<ToolMode,string> = {
    select: "Click to select · Shift+click / drag-box multi-select · R rotate · Del delete · Ctrl+Z/Y undo/redo",
    wire:   "Click to add vertex · Double-click or ESC to finish · Snaps to terminals",
    place:  `Click to place ${state.placingType??""} · R to rotate · ESC to cancel`,
  };
  return (
    <div style={{ height:24, background:dark?"#07090f":"#f3f4f6", borderTop:dark?"1px solid #1e293b":"1px solid #e5e7eb", display:"flex", alignItems:"center", padding:"0 10px", gap:14, fontSize:10, fontFamily:"'JetBrains Mono',monospace", color:dark?"#2a3050":"#9ca3af", flexShrink:0 }}>
      <span>{tips[state.tool]}</span>
      <div style={{ flex:1 }} />
      <span>x:{Math.round(state.mouseWorld.x)} y:{Math.round(state.mouseWorld.y)}</span>
      <span>{state.components.length} comp · {state.wires.length} wires</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ROOT APP ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [cam, setCam]     = useState<Camera>({ x:320, y:220, z:1 });

  // Popover state
  const [popoverComp,   setPopoverComp]   = useState<Component|null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<Vec2|null>(null);
  const [canvasRect,    setCanvasRect]    = useState<DOMRect|null>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const [showNetlist, setShowNetlist] = useState(false);

  const dark  = state.darkMode;
  const empty = state.components.length===0 && state.wires.length===0;

  // Track canvas bounding rect
  useEffect(() => {
    const el = canvasWrapRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setCanvasRect(el.getBoundingClientRect()));
    ro.observe(el);
    setCanvasRect(el.getBoundingClientRect());
    return () => ro.disconnect();
  }, []);

  // Sync popover with selection
  useEffect(() => {
    if (state.selection.length === 1) {
      const comp = state.components.find(c => c.id === state.selection[0]);
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

  // Keep anchor in sync when component moves or cam changes
  useEffect(() => {
    if (!popoverComp) return;
    const live = state.components.find(c => c.id === popoverComp.id);
    if (live) {
      setPopoverComp(live);
      setPopoverAnchor(w2s(live.position.x, live.position.y, cam));
    } else {
      setPopoverComp(null); setPopoverAnchor(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cam, state.components]);

  const handleComponentClick = useCallback((_id:string, screen:Vec2) => {
    setPopoverAnchor(screen);
  }, []);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", width:"100vw", fontFamily:"'JetBrains Mono','Fira Code',monospace", overflow:"hidden", background:dark?"#0a0c14":"#ffffff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-thumb { background:${dark?"#1e293b":"#d1d5db"}; border-radius:3px; }
        button:hover { opacity:.82; }
        input[type=number] { -moz-appearance:textfield; }
        input[type=number]::-webkit-inner-spin-button { opacity:.5; }
        select option { background:${dark?"#0e1120":"#ffffff"}; }
        [data-radix-popper-content-wrapper] { z-index:1000 !important; }
      `}</style>

      <Toolbar state={state} dispatch={dispatch} cam={cam} onShowNetlist={() => setShowNetlist(true)} />

      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
        <Palette state={state} dispatch={dispatch} />

        {/* Canvas — no right sidebar */}
        <div ref={canvasWrapRef} style={{ flex:1, position:"relative", overflow:"hidden" }}>
          <CircuitCanvas
            state={state} dispatch={dispatch}
            cam={cam} setCam={setCam}
            onComponentClick={handleComponentClick}
          />

          {empty && (
            <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", textAlign:"center", pointerEvents:"none" }}>
              <div style={{ fontSize:36, opacity:.07 }}>⚡</div>
              <div style={{ fontSize:11, color:dark?"#2a3050":"#9ca3af", fontFamily:"monospace", lineHeight:2.2, marginTop:8 }}>
                Select a component from the palette<br/>then click on the canvas to place it
              </div>
            </div>
          )}

          {/* Canvas-anchored property popover */}
          <ComponentPopover
            comp={popoverComp}
            anchorScreen={popoverAnchor}
            canvasRect={canvasRect}
            dark={dark}
            dispatch={dispatch}
          />
        </div>
      </div>

      <StatusBar state={state} />

      {showNetlist && (
        <NetlistModal
          circuit={{ components:state.components, wires:state.wires }}
          dark={dark}
          onClose={() => setShowNetlist(false)}
        />
      )}
    </div>
  );
}