import { Matrix } from 'ml-matrix';
import { Component } from './Component';

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

    stamp(G: Matrix, b: Matrix): void {
        if (this.mnaRow === null) {
            throw new Error(` La source de tension ${this.id} na pas de ligne assignée dans la matrice MNA. `);
        }

        if (this.node1 !== 0) {
            G.set(this.node1 - 1, this.mnaRow, 1);
            G.set(this.mnaRow, this.node1 - 1, 1);
        }

        if (this.node2 !== 0) {
            G.set(this.node2 - 1, this.mnaRow, -1);
            G.set(this.mnaRow, this.node2 - 1, -1);
        }

        b.set(this.mnaRow, 0, this.voltage);
    }
}
