import { Matrix } from 'ml-matrix';
import { Component } from './Component';

export class Resistor extends Component {
    resistance: number;

    constructor(id: string, node1: number, node2: number, resistance: number) {
        super(id, node1, node2);
        this.resistance = resistance;
    }

    stamp(G: Matrix): void {
        const g = 1 / this.resistance;

        if (this.node1 !== 0) {
            G.set(this.node1 - 1, this.node1 - 1,
                G.get(this.node1 - 1, this.node1 - 1) + g);
        }

        if (this.node2 !== 0) {
            G.set(this.node2 - 1, this.node2 - 1,
                G.get(this.node2 - 1, this.node2 - 1) + g);
        }

        if (this.node1 !== 0 && this.node2 !== 0) {
            G.set(this.node1 - 1, this.node2 - 1,
                G.get(this.node1 - 1, this.node2 - 1) - g);

            G.set(this.node2 - 1, this.node1 - 1,
                G.get(this.node2 - 1, this.node1 - 1) - g);
        } 
    }
}