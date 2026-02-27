import { Matrix, solve } from 'ml-matrix';
import { Component } from '../element/Component.ts';
import { VoltageSource } from '../element/VoltageSource.ts';

export class MnaSolver {
    solve(components: Component[]): Matrix {
        const nodeSet = new Set<number>();
        let voltageSources: VoltageSource[] = [];

        components.forEach(c => {
            if (c.node1 !== 0) nodeSet.add(c.node1);
            if (c.node2 !== 0) nodeSet.add(c.node2);

            if (c instanceof VoltageSource) {
                voltageSources.push(c);
            }
        });

        const nodeCount = nodeSet.size;
        const sourceCount = voltageSources.length;
        const size = nodeCount + sourceCount;

        const G = Matrix.zeros(size, size);
        const b = Matrix.zeros(size, 1);
       
        voltageSources.forEach((vs, index) => {
            vs.index = index;
        });

        components.forEach(c => {
            c.stamp(G, b);
        });

        const solution = solve(G, b);

        return solution;
    }
}