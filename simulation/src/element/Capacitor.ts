import { Component, StampContext } from './Component';

export class Capacitor extends Component {
    capacitance: number;

    constructor(id: string, node1: number, node2: number, capacitance: number) {
        super(id, node1, node2);
        this.capacitance = capacitance;
    }

    stamp({ C, nodeIndexMap }: StampContext): void {
        const node1Index = this.getNodeIndex(this.node1, nodeIndexMap);
        const node2Index = this.getNodeIndex(this.node2, nodeIndexMap);

        if (node1Index !== null) {
            C.set(
                node1Index,
                node1Index,
                C.get(node1Index, node1Index) + this.capacitance
            );
        }

        if (node2Index !== null) {
            C.set(
                node2Index,
                node2Index,
                C.get(node2Index, node2Index) + this.capacitance
            );
        }

        if (node1Index !== null && node2Index !== null) {
            C.set(
                node1Index,
                node2Index,
                C.get(node1Index, node2Index) - this.capacitance
            );
            C.set(
                node2Index,
                node1Index,
                C.get(node2Index, node1Index) - this.capacitance
            );
        }
    }
}
