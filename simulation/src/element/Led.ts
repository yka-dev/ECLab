import { Component, StampContext } from './Component';

// Une LED en vrai c'est non-linéaire, mais on peut la modéliser simplement :
// - une tension de seuil Vf (forward voltage) que tu choisis toi-même
// - une petite résistance série pour limiter le courant
export class Led extends Component {
    forwardVoltage: number;
    seriesResistance: number;
    color: string;
    private mnaRow: number | null = null;

    constructor(
        id: string,
        node1: number,
        node2: number,
        forwardVoltage: number,       // tu mets la tension que tu veux, ex: 2.1
        color: string = 'inconnu',    // juste pour nommer la LED, aucun effet sur le calcul
        seriesResistance: number = 10
    ) {
        super(id, node1, node2);
        this.forwardVoltage = forwardVoltage;
        this.color = color;
        this.seriesResistance = seriesResistance;
    }

    setMnaRow(row: number): void {
        this.mnaRow = row;
    }

    stamp({ G, b, nodeIndexMap }: StampContext): void {
        if (this.mnaRow === null) {
            throw new Error(`La LED ${this.id} n'a pas de ligne assignée dans la matrice MNA.`);
        }

        const node1Index = this.getNodeIndex(this.node1, nodeIndexMap);
        const node2Index = this.getNodeIndex(this.node2, nodeIndexMap);

        // stamp la tension de seuil Vf (comme une VoltageSource)
        if (node1Index !== null) {
            G.set(node1Index, this.mnaRow, 1);
            G.set(this.mnaRow, node1Index, 1);
        }

        if (node2Index !== null) {
            G.set(node2Index, this.mnaRow, -1);
            G.set(this.mnaRow, node2Index, -1);
        }

        b.set(this.mnaRow, 0, this.forwardVoltage);

        // stamp la résistance série (comme un Resistor)
        const g = 1 / this.seriesResistance;

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
