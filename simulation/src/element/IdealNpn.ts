import { Component, StampContext } from "./Component";

// Transistor NPN simplifie.
//
// Ce composant n'utilise pas un vrai modele physique de transistor (BJT).
// Il se comporte plutot comme un interrupteur commande par V_BE :
//
//   • V_BE >= vbeOn → transistor passant
//   • V_BE <  vbeOn → transistor bloque
//
// Lorsqu'il est passant, le courant circule entre le collecteur
// et l'emetteur via une faible resistance (Ron).
// Lorsqu'il est bloque, une tres faible conductance est conservee
// pour eviter les problemes numeriques dans la simulation.
//
// Ce modele est volontairement simple :
// pas de gain β, pas de source de courant,
// pas de modele Ebers-Moll.
export class IdealNpn extends Component {
  vbeOn: number;
  ron: number;

  // Etat actuel du transistor :
  // true  = passant
  // false = bloque
  on: boolean = false;

  constructor(
    id: string,
    nodeB: number,
    nodeC: number,
    nodeE: number,
    vbeOn: number = 0.7,
    ron: number = 10,
  ) {
    super(id, nodeB, nodeC);
    this.node3 = nodeE;
    this.vbeOn = vbeOn;
    this.ron = ron;
  }

  // Ajoute les conductances equivalentes du transistor dans G.
  stamp({ G, nodeIndexMap }: StampContext): void {
    const nB = this.getNodeIndex(this.node1, nodeIndexMap);
    const nC = this.getNodeIndex(this.node2, nodeIndexMap);
    const nE = this.getNodeIndex(this.node3!, nodeIndexMap);

    // Petite fuite entre base et emetteur pour eviter
    // un noeud flottant et permettre la lecture de V_BE.
    this.#stampG(G, nB, nE, 1e-6);

    // Liaison collecteur-emetteur :
    // forte conductance si passant, tres faible sinon.
    const gCE = this.on ? 1 / this.ron : 1e-6;
    this.#stampG(G, nC, nE, gCE);
  }

  // Ajoute une conductance entre deux noeuds dans G.
  // Equivalent a l'estampillage d'une resistance.
  #stampG(
    G: StampContext["G"],
    ni: number | null,
    nj: number | null,
    g: number,
  ): void {
    if (ni !== null) {
      G.set(ni, ni, G.get(ni, ni) + g);
    }

    if (nj !== null) {
      G.set(nj, nj, G.get(nj, nj) + g);
    }

    if (ni !== null && nj !== null) {
      G.set(ni, nj, G.get(ni, nj) - g);
      G.set(nj, ni, G.get(nj, ni) - g);
    }
  }
}
