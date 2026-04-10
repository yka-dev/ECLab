import { Component, StampContext } from './Component';

// Un fil c'est juste une résistance très très faible.
// En vrai un fil a 0 ohm, mais dans le solver on peut pas diviser par zéro.
// Donc par défaut on met 0.001 ohm, mais tu peux choisir ta propre valeur.
export class Wire extends Component {
    resistance: number;

    constructor(id: string, node1: number, node2: number, resistance: number = 0.001) {
        super(id, node1, node2);
        this.resistance = resistance;
    }

    stamp({ G, nodeIndexMap }: StampContext): void {
        const g = 1 / this.resistance;
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
