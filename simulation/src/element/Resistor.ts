import { Component, StampContext } from "./Component";

// Une resistance s'oppose au passage du courant selon la loi d'Ohm :
//   V = R * I
//
// En MNA, une resistance ajoute une conductance dans la matrice G :
//   G = 1 / R
//
// La diagonale represente les connexions du noeud avec lui-meme,
// tandis que les termes hors diagonale representent les liens
// entre deux noeuds.
export class Resistor extends Component {
  resistance: number;

  constructor(id: string, noeud1: number, noeud2: number, resistance: number) {
    super(id, noeud1, noeud2);
    this.resistance = resistance;
  }

  // Ajoute la contribution de la resistance a la matrice G.
  stamp({ G, nodeIndexMap }: StampContext): void {
    const conductance = 1 / this.resistance;
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
