import { Component, StampContext } from './Component';

// Un switch c'est simplement une résistance qui change de valeur.
// Fermé  → résistance quasi nulle  → le courant passe librement
// Ouvert → résistance quasi infinie → plus rien ne passe
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
        // fermé = 0.001 ohm (quasi un fil)
        // ouvert = 1 000 000 000 ohm (quasi l'air)
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
