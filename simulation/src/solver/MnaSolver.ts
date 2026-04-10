import { Matrix, solve } from 'ml-matrix';
import { Battery } from '../element/Battery.ts';
import { Capacitor } from '../element/Capacitor.ts';
import { Component, StampContext } from '../element/Component.ts';
import { Led } from '../element/Led.ts';
import { VoltageSource } from '../element/VoltageSource.ts';

export interface TransientSolveOptions {
    timeStep?: number;
    totalTime?: number;
    initialSolutionVector?: number[];
}

interface TimePoint {
    time: number;
    nodeVoltages: Record<string, number>;
    sourceCurrents: Record<string, number>;
    solutionVector: number[];
}

interface SolveResult {
    nodeVoltages: Record<string, number>;
    sourceCurrents: Record<string, number>;
    solutionVector: number[];
    timeSeries?: TimePoint[];
}

export class MnaSolver {
    solve(components: Component[], options: TransientSolveOptions = {}): SolveResult {
        const nodeSet = new Set<number>();
        // on regroupe tout ce qui a besoin d'une ligne MNA extra (sources de tension, batteries, leds)
        const voltageSources: (VoltageSource | Battery | Led)[] = [];
        let hasCapacitor = false;

        components.forEach(component => {
            if (component.node1 !== 0) nodeSet.add(component.node1);
            if (component.node2 !== 0) nodeSet.add(component.node2);

            if (component instanceof VoltageSource || component instanceof Battery || component instanceof Led) {
                voltageSources.push(component);
            }

            if (component instanceof Capacitor) {
                hasCapacitor = true;
            }
        });

        const nodes = Array.from(nodeSet).sort((a, b) => a - b);
        const nodeIndexMap = new Map(nodes.map((node, index) => [node, index]));
        const nodeCount = nodes.length;
        const sourceCount = voltageSources.length;
        const size = nodeCount + sourceCount;

        const G = Matrix.zeros(size, size);
        const C = Matrix.zeros(size, size);
        const b = Matrix.zeros(size, 1);

        voltageSources.forEach((vs, index) => {
            vs.setMnaRow(nodeCount + index);
        });

        const stampContext: StampContext = { G, C, b, nodeIndexMap };
        components.forEach(component => {
            component.stamp(stampContext);
        });

        if (!hasCapacitor) {
            const solution = solve(G, b);
            return this.formatResult(solution, nodes, voltageSources);
        }

        const timeStep = options.timeStep ?? 1e-3;
        const totalTime = options.totalTime ?? 10 * timeStep;

        if (timeStep <= 0) {
            throw new Error('timeStep must be greater than zero.');
        }

        if (totalTime < 0) {
            throw new Error('totalTime cannot be negative.');
        }

        const stepCount = Math.max(1, Math.ceil(totalTime / timeStep));
        let previousSolution = this.createInitialState(size, options.initialSolutionVector);
        const timeSeries: TimePoint[] = [];

        for (let step = 1; step <= stepCount; step += 1) {
            const A = G.clone().add(C.clone().mul(1 / timeStep));
            const rhs = b.clone().add(C.mmul(previousSolution).mul(1 / timeStep));
            const solution = solve(A, rhs);
            const formatted = this.formatResult(solution, nodes, voltageSources);

            timeSeries.push({
                time: step * timeStep,
                nodeVoltages: formatted.nodeVoltages,
                sourceCurrents: formatted.sourceCurrents,
                solutionVector: formatted.solutionVector,
            });

            previousSolution = solution;
        }

        const lastResult = timeSeries[timeSeries.length - 1];
        return {
            nodeVoltages: lastResult.nodeVoltages,
            sourceCurrents: lastResult.sourceCurrents,
            solutionVector: lastResult.solutionVector,
            timeSeries,
        };
    }

    private createInitialState(size: number, initialSolutionVector?: number[]): Matrix {
        if (initialSolutionVector === undefined) {
            return Matrix.zeros(size, 1);
        }

        if (initialSolutionVector.length !== size) {
            throw new Error(
                `initialSolutionVector size mismatch: expected ${size}, received ${initialSolutionVector.length}.`
            );
        }

        return Matrix.columnVector(initialSolutionVector);
    }

    private formatResult(solution: Matrix, nodes: number[], voltageSources: (VoltageSource | Battery | Led)[]): SolveResult {
        const solutionVector = solution.to1DArray();
        const nodeVoltages: Record<string, number> = {};
        const sourceCurrents: Record<string, number> = {};
        const nodeCount = nodes.length;

        nodes.forEach((node, index) => {
            nodeVoltages[`node${node}`] = solutionVector[index];
        });

        voltageSources.forEach((source, index) => {
            sourceCurrents[source.id] = solutionVector[nodeCount + index];
        });

        return { nodeVoltages, sourceCurrents, solutionVector };
    }
}
