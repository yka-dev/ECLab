import type { Circuit, Vec2 } from "./types";
import { GRID, UI } from "./constants";
import { snap, dist } from "./utils";
import { termWorlds } from "./geometry";
import { fmtOhm, fmtFarad, fmtHenry } from "./utils";

export type NetlistComponent =
  | { type: "R"; name: string; n1: string; n2: string; value: number }
  | { type: "V"; name: string; n1: string; n2: string; value: number }
  | { type: "C"; name: string; n1: string; n2: string; value: number }
  | { type: "L"; name: string; n1: string; n2: string; value: number }
  | { type: "D"; name: string; n1: string; n2: string; vf: number }
  | { type: "S"; name: string; n1: string; n2: string; state: boolean }
  // Transistor simplifie avec base, collecteur et emetteur.
  | { type: "NPN_IDEAL"; name: string; nb: string; nc: string; ne: string; vbe_on: number; ron: number };

export interface Netlist {
  nodes: string[];
  components: NetlistComponent[];
  warnings: string[];
  componentNodes: Map<string, string[]>;
  componentNames: Map<string, string>;
}

class UnionFind {
  private parent = new Map<string, string>();
  private key(p: Vec2): string { return `${snap(p.x)},${snap(p.y)}`; }
  add(p: Vec2): string {
    // Ajoute un point dans un groupe de connexion.
    const k = this.key(p);
    if (!this.parent.has(k)) this.parent.set(k, k);
    return k;
  }
  find(p: Vec2): string {
    // Retrouve le groupe final du point.
    let k = this.add(p);
    while (this.parent.get(k) !== k) {
      this.parent.set(k, this.parent.get(this.parent.get(k)!)!);
      k = this.parent.get(k)!;
    }
    return k;
  }
  union(a: Vec2, b: Vec2): void {
    // Fusionne deux points qui sont electriquement relies.
    this.add(a); this.add(b);
    const ra = this.find(a), rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

export function generateNetlist(circuit: Circuit): Netlist {
  // Convertit le dessin du circuit en liste de composants pour le solveur.
  const warnings: string[] = [];
  const uf = new UnionFind();

  for (const wire of circuit.wires) {
    // Tous les points d'un meme fil partagent le meme noeud.
    if (wire.points.length === 0) continue;
    wire.points.forEach((p) => uf.add(p));
    for (let i = 0; i < wire.points.length - 1; i++)
      uf.union(wire.points[i], wire.points[i + 1]);
  }

  for (const comp of circuit.components) {
    // Une borne proche d'un fil appartient au meme noeud.
    for (const tw of termWorlds(comp)) {
      uf.add(tw);
      for (const wire of circuit.wires)
        for (const wp of wire.points)
          if (dist(tw, wp) < GRID * 0.5) uf.union(tw, wp);
    }
  }

  const groundRoots = new Set<string>();
  for (const comp of circuit.components) {
    // La masse devient toujours le noeud 0.
    if (comp.type === "ground") {
      const tw = termWorlds(comp)[0];
      if (tw) groundRoots.add(uf.find(tw));
    }
  }
  if (groundRoots.size === 0)
    warnings.push("Aucun composant de masse trouvé. Le nœud '0' ne sera pas défini.");

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
  const componentNodes = new Map<string, string[]>();
  const componentNames = new Map<string, string>();

  for (const comp of circuit.components) {
    // Chaque composant graphique devient une ligne de netlist.
    const tw = termWorlds(comp);
    const n1 = () => nodeOf(tw[0]);
    const n2 = () => nodeOf(tw[1]);
    const n3 = () => nodeOf(tw[2]);
    const reg = (prefix: string, ...nodes: string[]) => {
      const name = nextName(prefix);
      componentNodes.set(comp.id, nodes);
      componentNames.set(comp.id, name);
      return name;
    };
    switch (comp.type) {
      case "resistor": { const a = n1(), b = n2(); nlComps.push({ type: "R", name: reg("R", a, b), n1: a, n2: b, value: comp.props.resistance as number }); break; }
      case "capacitor": { const a = n1(), b = n2(); nlComps.push({ type: "C", name: reg("C", a, b), n1: a, n2: b, value: comp.props.capacitance as number }); break; }
      case "inductor": { const a = n1(), b = n2(); nlComps.push({ type: "L", name: reg("L", a, b), n1: a, n2: b, value: comp.props.inductance as number }); break; }
      case "vsource": { const a = n1(), b = n2(); nlComps.push({ type: "V", name: reg("V", a, b), n1: a, n2: b, value: comp.props.voltage as number }); break; }
      case "led": { const a = n1(), b = n2(); nlComps.push({ type: "D", name: reg("D", a, b), n1: a, n2: b, vf: comp.props.forwardVoltage as number }); break; }
      case "switch": { const a = n1(), b = n2(); nlComps.push({ type: "S", name: reg("S", a, b), n1: a, n2: b, state: comp.props.closed as boolean }); break; }
      case "npn_ideal": {
        // Le NPN simplifie garde ses trois bornes dans la netlist.
        const nb = n1(), nc = n2(), ne = n3();
        nlComps.push({ type: "NPN_IDEAL", name: reg("Q", nb, nc, ne), nb, nc, ne, vbe_on: comp.props.vbe_on as number, ron: comp.props.ron as number });
        break;
      }
      case "ground": break;
    }
  }

  const ncNodes = (nc: NetlistComponent): string[] =>
    nc.type === "NPN_IDEAL" ? [nc.nb, nc.nc, nc.ne] : [nc.n1, nc.n2];

  const nodeSet = new Set<string>();
  for (const nc of nlComps) ncNodes(nc).forEach(n => nodeSet.add(n));

  const nodeCount = new Map<string, number>();
  for (const nc of nlComps)
    ncNodes(nc).forEach(n => nodeCount.set(n, (nodeCount.get(n) ?? 0) + 1));
  // Un noeud avec une seule connexion risque de flotter.
  for (const [node, count] of nodeCount)
    if (count < 2) warnings.push(`Le nœud ${node} semble flottant (1 seule connexion).`);

  const nodes = Array.from(nodeSet).sort((a, b) => {
    const na = parseInt(a), nb = parseInt(b);
    return isNaN(na) || isNaN(nb) ? a.localeCompare(b) : na - nb;
  });

  return { nodes, components: nlComps, warnings, componentNodes, componentNames };
}

export function netlistToString(netlist: Netlist): string {
  // Formate la netlist pour l'afficher dans la fenetre.
  const lines: string[] = [];
  for (const nc of netlist.components) {
    switch (nc.type) {
      case "R": case "C": case "L": case "V":
        lines.push(`${nc.name} ${nc.n1} ${nc.n2} ${nc.value}`); break;
      case "D":
        lines.push(`${nc.name} ${nc.n1} ${nc.n2} VF=${nc.vf}`); break;
      case "S":
        lines.push(`${nc.name} ${nc.n1} ${nc.n2} ${nc.state ? "CLOSED" : "OPEN"}`); break;
      case "NPN_IDEAL":
        lines.push(`${nc.name} NPN_IDEAL b=${nc.nb} c=${nc.nc} e=${nc.ne} Vbe=${nc.vbe_on}V Ron=${nc.ron}Ω`); break;
    }
  }
  if (netlist.warnings.length > 0) {
    lines.push("");
    for (const w of netlist.warnings) lines.push(`* AVERT: ${w}`);
  }
  return lines.join("\n");
}

export function fmtNetlistComp(nc: NetlistComponent): string {
  // Resume une ligne de netlist pour l'interface.
  switch (nc.type) {
    case "R": return `${nc.name} — ${fmtOhm(nc.value)}`;
    case "C": return `${nc.name} — ${fmtFarad(nc.value)}`;
    case "L": return `${nc.name} — ${fmtHenry(nc.value)}`;
    case "V": return `${nc.name} — ${nc.value}V`;
    case "D": return `${nc.name} — DEL ${nc.vf}V`;
    case "S": return `${nc.name} — ${nc.state ? UI.closed : UI.open}`;
    case "NPN_IDEAL": return `${nc.name} — NPN idéal`;
  }
}
