/**
 * Web Worker de démonstration : construit un circuit de test, le résout avec MnaSolver
 * et poste la solution au thread principal.
 */

import { MnaSolver } from '../src/solver/MnaSolver';
import { Circuit } from '../src/element/Circuit';

self.onmessage = (event: MessageEvent) => {
    if (event.data?.type !== 'runTest') {
        self.postMessage({ error: 'Message non supporté' });
        return;
    }

    const circuit: Circuit = Circuit.createRcTestCircuit();
    const solver = new MnaSolver();

    const result = solver.solve(circuit.components, {
    timeStep: 1e-4,
    totalTime: 5e-3,
    });

    self.postMessage(result);
};
