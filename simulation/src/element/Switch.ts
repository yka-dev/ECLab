import { Component, StampContext } from "./Component";

// Un interrupteur est modelise comme une resistance variable.
//
// Ferme  : resistance tres faible → le courant circule presque librement
// Ouvert : resistance tres elevee → le courant est pratiquement bloque
//
// En MNA, il contribue a G exactement comme une resistance classique,
// seule la valeur de la resistance change selon l'etat.
export class Switch extends Component {
  ferme: boolean;

  constructor(
    id: string,
    noeud1: number,
    noeud2: number,
    ferme: boolean = false,
  ) {
    super(id, noeud1, noeud2);
    this.ferme = ferme;
  }

  // Inverse l'etat de l'interrupteur.
  basculer(): void {
    this.ferme = !this.ferme;
  }

  // Ajoute la contribution de l'interrupteur a G
  // en fonction de son etat actuel.
  stamp({ G, nodeIndexMap }: StampContext): void {
    // Ferme : quasi un fil conducteur.
    // Ouvert : quasi un circuit coupe.
    const resistance = this.ferme ? 0.001 : 1e9;
    const conductance = 1 / resistance;

    const indexNoeud1 = this.getNodeIndex(this.node1, nodeIndexMap);
    const indexNoeud2 = this.getNodeIndex(this.node2, nodeIndexMap);

    if (indexNoeud1 !== null) {
      G.set(
        indexNoeud1,
        indexNoeud1,
        G.get(indexNoeud1, indexNoeud1) + conductance,
      );
    }

    if (indexNoeud2 !== null) {
      G.set(
        indexNoeud2,
        indexNoeud2,
        G.get(indexNoeud2, indexNoeud2) + conductance,
      );
    }

    if (indexNoeud1 !== null && indexNoeud2 !== null) {
      G.set(
        indexNoeud1,
        indexNoeud2,
        G.get(indexNoeud1, indexNoeud2) - conductance,
      );

      G.set(
        indexNoeud2,
        indexNoeud1,
        G.get(indexNoeud2, indexNoeud1) - conductance,
      );
    }
  }
}
