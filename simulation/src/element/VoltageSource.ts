import { Matrix } from 'ml-matrix';
import { Component } from './Component';

export class VoltageSource extends Component {
    voltage: number;
    index: number; 

    constructor(
        id: string,
        node1: number,
        node2: number,
        voltage: number,
        index: number
    ) {
        super(id, node1, node2);
        this.voltage = voltage;
        this.index = index;
    }

    stamp(G: Matrix, b: Matrix): void {
        const n = G.rows;
        const k = this.index;

        if (this.node1 !== 0) {
            G.set(this.node1 - 1, n - 1 - k, 1);
            G.set(n - 1 - k, this.node1 - 1, 1);
        }

        if (this.node2 !== 0) {
            G.set(this.node2 - 1, n - 1 - k, -1);
            G.set(n - 1 - k, this.node2 - 1, -1);
        }
        b.set(n - 1 - k, 0, this.voltage);
    }
}