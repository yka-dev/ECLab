import { Component, StampContext } from './Component';

// Un interrupteur est une resistance qui change selon son etat.
export class Switch extends Component {
    closed: boolean;

    constructor(id: string, node1: number, node2: number, closed: boolean = false) {
        super(id, node1, node2);
        this.closed = closed;
    }

    toggle(): void {
        this.closed = !this.closed;
    }

    stamp({ G, nodeIndexMap }: StampContext): void {
        // Ferme, il laisse passer le courant. Ouvert, il bloque presque tout.
        const resistance = this.closed ? 0.001 : 1e9;
        const g = 1 / resistance;

        const node1Index = this.getNodeIndex(this.node1, nodeIndexMap);
        const node2Index = this.getNodeIndex(this.node2, nodeIndexMap);

        if (node1Index !== null) {
            G.set(node1Index, node1Index, G.get(node1Index, node1Index) + g);
        }

        if (node2Index !== null) {
            G.set(node2Index, node2Index, G.get(node2Index, node2Index) + g);
        }

        if (node1Index !== null && node2Index !== null) {
            G.set(node1Index, node2Index, G.get(node1Index, node2Index) - g);
            G.set(node2Index, node1Index, G.get(node2Index, node1Index) - g);
        }
    }
}
