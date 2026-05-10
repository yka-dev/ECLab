import { Component, StampContext } from './Component';

// Une LED est approximee par une resistance serie et une tension de seuil.
export class Led extends Component {
    forwardVoltage: number;
    seriesResistance: number;
    color: string;

    constructor(
        id: string,
        node1: number,
        node2: number,
        forwardVoltage: number,
        color: string = 'inconnu',
        seriesResistance: number = 10
    ) {
        super(id, node1, node2);
        this.forwardVoltage = forwardVoltage;
        this.color = color;
        this.seriesResistance = seriesResistance;
    }

    stamp({ G, b, nodeIndexMap }: StampContext): void {
        const node1Index = this.getNodeIndex(this.node1, nodeIndexMap);
        const node2Index = this.getNodeIndex(this.node2, nodeIndexMap);
        const g = 1 / this.seriesResistance;

        // Ajoute la resistance serie entre l'anode et la cathode.
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

        // Ajoute la tension de seuil dans le vecteur b.
        if (node1Index !== null) {
            b.set(node1Index, 0, b.get(node1Index, 0) + g * this.forwardVoltage);
        }
        if (node2Index !== null) {
            b.set(node2Index, 0, b.get(node2Index, 0) - g * this.forwardVoltage);
        }
    }
}
