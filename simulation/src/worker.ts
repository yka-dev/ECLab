import { MnaSolver } from '../src/solver/MnaSolver';
import { Circuit } from '../src/element/Circuit';

self.onmessage = (event: MessageEvent) => {
    if (event.data?.type !== 'runTest') {
        self.postMessage({ error: 'Message non supporté' });
        return;
    }


    const circuit: Circuit = Circuit.createComplexTestCircuit();
    const solver = new MnaSolver();
    const result = solver.solve(circuit.components);

    self.postMessage(result);
};
