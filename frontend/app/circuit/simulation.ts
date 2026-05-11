import type { Circuit, CircuitCurrents, SimResult } from "./types";
import type { Netlist } from "./netlist";
import { GRID } from "./constants";
import { dist } from "./utils";
import { termWorlds } from "./geometry";

export function computeCircuitCurrents(
  circuit: Circuit,
  liveNetlist: Netlist,
  simResult: SimResult,
): CircuitCurrents {
  // Calcule des courants approximatifs pour l'affichage.
  const { componentNodes, componentNames } = liveNetlist;

  const componentCurrents = new Map<string, number>();
  for (const comp of circuit.components) {
    // On utilise la tension aux bornes pour chaque composant simple.
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
        // Convention MNA: le courant de source vient directement du solveur.
        const name = componentNames.get(comp.id);
        I = name ? (simResult.sourceCurrents[name] ?? 0) : 0;
        break;
      }
      case "led": {
        const vf = comp.props.forwardVoltage as number;
        const rs = 10; // Meme resistance serie que dans le modele LED.
        const raw = (v1 - v2 - vf) / rs;
        I = raw > 0 ? raw : 0;
        break;
      }
      case "npn_ideal":
        I = 0; // Trois bornes, donc pas de courant simple entre deux noeuds.
        break;
      default:
        I = 0;
    }
    componentCurrents.set(comp.id, I);
  }

  const wireCurrents = new Map<string, number>();
  for (const wire of circuit.wires) {
    // Un fil recupere le courant du composant branche a son extremite.
    let bestCurrent = 0, bestMag = 0;
    const firstPt = wire.points[0];
    const lastPt  = wire.points[wire.points.length - 1];

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
          bestMag = Math.abs(signedI); bestCurrent = signedI;
        }
      }
    }
    wireCurrents.set(wire.id, bestCurrent);
  }

  // Propage ensuite ce courant aux fils voisins.
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

      let pIsLastA = false, pIsFirstB = false, found = false;
      if      (dist(lastA,  firstB) < GRID * 0.6) { pIsLastA = true;  pIsFirstB = true;  found = true; }
      else if (dist(lastA,  lastB)  < GRID * 0.6) { pIsLastA = true;  pIsFirstB = false; found = true; }
      else if (dist(firstA, firstB) < GRID * 0.6) { pIsLastA = false; pIsFirstB = true;  found = true; }
      else if (dist(firstA, lastB)  < GRID * 0.6) { pIsLastA = false; pIsFirstB = false; found = true; }
      if (!found) continue;

      const arrivesAtJunction = (I_A > 0 && pIsLastA) || (I_A < 0 && !pIsLastA);
      const signB = (arrivesAtJunction === pIsFirstB) ? 1 : -1;
      wireCurrents.set(wireB.id, signB * Math.abs(I_A));
      seeded.add(wireB.id);
      queue.push(wireB.id);
    }
  }

  return { wireCurrents, componentCurrents };
}
