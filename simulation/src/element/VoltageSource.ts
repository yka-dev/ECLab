import { Component, StampContext } from "./Component";

// Une source de tension ideale impose une difference
// de potentiel fixe entre deux noeuds, peu importe le courant.
//
// En MNA, elle ajoute une inconnue supplementaire :
// le courant traversant la source. Une ligne MNA
// doit donc lui etre reservee.
//
// Convention :
//   V(node1) - V(node2) = voltage
export class VoltageSource extends Component {
  voltage: number;
  private mnaRow: number | null = null;

  constructor(id: string, node1: number, node2: number, voltage: number) {
    super(id, node1, node2);
    this.voltage = voltage;
  }

  setMnaRow(row: number): void {
    this.mnaRow = row;
  }

  // Relie le courant de la source aux tensions des noeuds
  // et impose la tension dans le vecteur b.
  stamp({ G, b, nodeIndexMap }: StampContext): void {
    if (this.mnaRow === null) {
      throw new Error(
        `La source de tension ${this.id} n'a pas de ligne MNA assignée.`,
      );
    }

    const node1Index = this.getNodeIndex(this.node1, nodeIndexMap);
    const node2Index = this.getNodeIndex(this.node2, nodeIndexMap);

    if (node1Index !== null) {
      G.set(node1Index, this.mnaRow, 1);
      G.set(this.mnaRow, node1Index, 1);
    }

    if (node2Index !== null) {
      G.set(node2Index, this.mnaRow, -1);
      G.set(this.mnaRow, node2Index, -1);
    }

    // Impose la tension de la source :
    // V(node1) - V(node2) = voltage
    b.set(this.mnaRow, 0, this.voltage);
  }
}
