import { Matrix } from 'ml-matrix';

export interface StampContext {
    G: Matrix;
    C: Matrix;
    b: Matrix;
    nodeIndexMap: Map<number, number>;
}

export abstract class Component {
    id: string;
    node1: number;
    node2: number;

    constructor(id: string, node1: number, node2: number) {
        this.id = id;
        this.node1 = node1;
        this.node2 = node2;
    }

    protected getNodeIndex(node: number, nodeIndexMap: Map<number, number>): number | null {
        if (node === 0) {
            return null;
        }

        const index = nodeIndexMap.get(node);
        if (index === undefined) {
            throw new Error(`Node ${node} is missing from the MNA node index map.`);
        }

        return index;
    }

    stamp(_context: StampContext): void {
        // To be implemented by subclasses
    }
}
