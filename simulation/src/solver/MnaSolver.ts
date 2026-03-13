import { Matrix, solve } from 'ml-matrix';
import { Component } from '../element/Component.ts';
import { VoltageSource } from '../element/VoltageSource.ts';

export class MnaSolver {
    solve(components: Component[]) {
        const nodeSet = new Set<number>();
        const voltageSources: VoltageSource[] = [];

        components.forEach(c => {
            if (c.node1 !== 0) nodeSet.add(c.node1);
            if (c.node2 !== 0) nodeSet.add(c.node2);

            if (c instanceof VoltageSource) {
                voltageSources.push(c);
            }
        });

        const nodes = Array.from(nodeSet).sort((a, b) => a - b);
        const nodeCount = nodes.length;
        const sourceCount = voltageSources.length;
        const size = nodeCount + sourceCount;

        const G = Matrix.zeros(size, size);
        const b = Matrix.zeros(size, 1);

        voltageSources.forEach((vs, index) => {
            vs.setMnaRow(nodeCount + index);
        });

        components.forEach(c => {
            c.stamp(G, b);
        });

        const solution = solve(G, b);
        const solutionVector = solution.to1DArray();
        const nodeVoltages: Record<string, number> = {};
        const sourceCurrents: Record<string, number> = {};

        nodes.forEach((node, index) => {
            nodeVoltages[`node${node}`] = solutionVector[index];
        });

        voltageSources.forEach((source, index) => {
            sourceCurrents[source.id] = solutionVector[nodeCount + index];
        });

        return { nodeVoltages, sourceCurrents, solutionVector };
    }
}
