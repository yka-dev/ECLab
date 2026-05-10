import { Component, StampContext } from './Component';


// Une inductance utilise une ligne MNA pour suivre son courant.
export class Inductor extends Component {
    inductance: number;
    private mnaRow: number | null = null;

    constructor(id: string, node1: number, node2: number, inductance: number) {
        super(id, node1, node2);
        this.inductance = inductance;
    }

    setMnaRow(row: number): void {
        this.mnaRow = row;
    }

    stamp({ G, C, nodeIndexMap }: StampContext): void {
        if (this.mnaRow === null) {
            throw new Error(`L'inducteur ${this.id} n'a pas de ligne MNA assignée.`);
        }

        const node1Index = this.getNodeIndex(this.node1, nodeIndexMap);
        const node2Index = this.getNodeIndex(this.node2, nodeIndexMap);

        // Relie le courant de l'inducteur aux tensions des noeuds.
        if (node1Index !== null) {
            G.set(node1Index, this.mnaRow, 1);
            G.set(this.mnaRow, node1Index, 1);
        }

        if (node2Index !== null) {
            G.set(node2Index, this.mnaRow, -1);
            G.set(this.mnaRow, node2Index, -1);
        }

        // La valeur dans C donne la dynamique temporelle de l'inductance.
        C.set(this.mnaRow, this.mnaRow, this.inductance);
    }
}
