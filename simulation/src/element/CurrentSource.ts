import { Component, StampContext } from './Component';


export class CurrentSource extends Component {
    current: number;

    constructor(id: string, node1: number, node2: number, current: number) {
        super(id, node1, node2);
        this.current = current;
    }

    stamp({ b, nodeIndexMap }: StampContext): void {
        const node1Index = this.getNodeIndex(this.node1, nodeIndexMap);
        const node2Index = this.getNodeIndex(this.node2, nodeIndexMap);

        // le courant sort de node1 et entre dans node2
        if (node1Index !== null) {
            b.set(node1Index, 0, b.get(node1Index, 0) - this.current);
        }

        if (node2Index !== null) {
            b.set(node2Index, 0, b.get(node2Index, 0) + this.current);
        }
    }
}
