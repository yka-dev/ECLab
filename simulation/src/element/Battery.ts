import { Component, StampContext } from './Component';

// Une batterie c'est une source de tension avec une résistance interne.
// La résistance interne fait que la tension baisse un peu quand on tire du courant.
// Ex: une pile AA a environ 0.1 ohm de résistance interne.
export class Battery extends Component {
    voltage: number;
    internalResistance: number;
    private mnaRow: number | null = null;

    constructor(id: string, node1: number, node2: number, voltage: number, internalResistance: number = 0.1) {
        super(id, node1, node2);
        this.voltage = voltage;
        this.internalResistance = internalResistance;
    }

    setMnaRow(row: number): void {
        this.mnaRow = row;
    }

    stamp({ G, b, nodeIndexMap }: StampContext): void {
        if (this.mnaRow === null) {
            throw new Error(`La batterie ${this.id} n'a pas de ligne assignée dans la matrice MNA.`);
        }

        const node1Index = this.getNodeIndex(this.node1, nodeIndexMap);
        const node2Index = this.getNodeIndex(this.node2, nodeIndexMap);

        // on stamp la source de tension (comme VoltageSource)
        if (node1Index !== null) {
            G.set(node1Index, this.mnaRow, 1);
            G.set(this.mnaRow, node1Index, 1);
        }

        if (node2Index !== null) {
            G.set(node2Index, this.mnaRow, -1);
            G.set(this.mnaRow, node2Index, -1);
        }

        b.set(this.mnaRow, 0, this.voltage);

        // on stamp la résistance interne (comme Resistor)
        // elle est en série donc entre node1 et node2
        const g = 1 / this.internalResistance;

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
