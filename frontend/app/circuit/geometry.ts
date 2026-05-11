import type { Component, Vec2, Wire } from "./types";
import { GRID } from "./constants";
import { dist, snap, snapVec } from "./utils";
import { COMPONENT_DEFS } from "./componentDefs";

// Les fonctions se trouvant dans se fichier ont été généré par IA.
// Ces fonctions sont utilisés afin de calculer la position des composants et des fils dans le sandbox

export function termWorlds(comp: Component): Vec2[] {
  // Calcule la position reelle des bornes apres rotation.
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

export function orthoRoute(a: Vec2, b: Vec2): Vec2[] {
  // Cree un chemin horizontal puis vertical entre deux points.
  const pts: Vec2[] = [{ ...a }];
  if (a.x !== b.x) pts.push({ x: b.x, y: a.y });
  if (pts[pts.length - 1].x !== b.x || pts[pts.length - 1].y !== b.y)
    pts.push({ ...b });
  else if (pts.length === 1) pts.push({ ...b });
  return pts;
}

export function snapToNearby(
  components: Component[],
  wires: Wire[],
  world: Vec2,
  radius = GRID * 0.85,
): Vec2 {
  // Accroche le point a la grille, aux bornes ou aux fils proches.
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

export function hitComponent(comp: Component, pt: Vec2): boolean {
  // Test simple avec une boite autour du composant.
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

export function hitWire(wire: Wire, pt: Vec2): boolean {
  // Verifie si le point est assez proche d'un segment du fil.
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

export function hitTest(
  components: Component[],
  wires: Wire[],
  pt: Vec2,
): string | null {
  // Cherche l'element sous la souris, du plus recent au plus ancien.
  for (let i = components.length - 1; i >= 0; i--)
    if (hitComponent(components[i], pt)) return components[i].id;
  for (let i = wires.length - 1; i >= 0; i--)
    if (hitWire(wires[i], pt)) return wires[i].id;
  return null;
}

export function findJunctions(components: Component[], wires: Wire[]): Vec2[] {
  // Trouve les points ou au moins trois connexions se rejoignent.
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

// Reexporte snap pour netlist.ts.
export { snap };
