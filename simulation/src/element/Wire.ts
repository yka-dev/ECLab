import { Component, StampContext } from "./Component";

// Un fil est modele comme une resistance tres faible.
//
// En theorie, un fil ideal aurait une resistance de 0 ohm.
// En pratique, une valeur nulle poserait un probleme numerique
// (division par zero et matrice instable).
//
// On utilise donc une petite resistance par defaut
// pour approximer un conducteur presque parfait.
export class Wire extends Component {
  resistance: number;

  constructor(
    id: string,
    node1: number,
    node2: number,
    resistance: number = 0.001,
  ) {
    super(id, node1, node2);
    this.resistance = resistance;
  }

  // Ajoute la contribution du fil a G
  // comme une resistance classique tres faible.
  stamp({ G, nodeIndexMap }: StampContext): void {
    const conductance = 1 / this.resistance;
    const node1Index = this.getNodeIndex(this.node1, nodeIndexMap);
    const node2Index = this.getNodeIndex(this.node2, nodeIndexMap);

    if (node1Index !== null) {
      G.set(
        node1Index,
        node1Index,
        G.get(node1Index, node1Index) + conductance,
      );
    }

    if (node2Index !== null) {
      G.set(
        node2Index,
        node2Index,
        G.get(node2Index, node2Index) + conductance,
      );
    }

    if (node1Index !== null && node2Index !== null) {
      G.set(
        node1Index,
        node2Index,
        G.get(node1Index, node2Index) - conductance,
      );

      G.set(
        node2Index,
        node1Index,
        G.get(node2Index, node1Index) - conductance,
      );
    }
  }
}
