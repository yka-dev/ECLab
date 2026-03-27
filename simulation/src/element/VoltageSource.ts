import { Component, StampContext } from './Component';

export class VoltageSource extends Component {
    voltage: number;
    private mnaRow: number | null = null;

    constructor(
        id: string,
        node1: number,
        node2: number,
        voltage: number
    ) {
        super(id, node1, node2);
        this.voltage = voltage;
    }

    setMnaRow(row: number): void {
        this.mnaRow = row;
    }

    stamp({ G, b, nodeIndexMap }: StampContext): void {
        if (this.mnaRow === null) {
            throw new Error(` La source de tension ${this.id} na pas de ligne assignée dans la matrice MNA. `);
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

        b.set(this.mnaRow, 0, this.voltage);
    }
}
