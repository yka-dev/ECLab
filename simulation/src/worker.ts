// lance le solver quand le main thread envoie un message
import { MnaSolver } from './solver/MnaSolver';
import { Circuit } from './element/Circuit';
import { Resistor } from './element/Resistor';
import { Capacitor } from './element/Capacitor';
import { Inductor } from './element/Inductor';
import { VoltageSource } from './element/VoltageSource';
import { Led } from './element/Led';
import { Switch } from './element/Switch';
import { Component } from './element/Component';

self.onmessage = (event: MessageEvent) => {
    const { type, ...data } = event.data ?? {};

    if (type === 'runTest') {
        const circuit = Circuit.createRcTestCircuit();
        const solver = new MnaSolver();
        const result = solver.solve(circuit.components, {
            timeStep: 1e-4,
            totalTime: 5e-3,
        });
        self.postMessage(result);
        return;
    }

    if (type === 'simulate') {
        const { netlist, timeStep = 1e-4, totalTime = 1e-2 } = data;

        try {
            const components: Component[] = [];

            for (const nc of netlist) {
                const n1 = parseInt(nc.n1);
                const n2 = parseInt(nc.n2);

                switch (nc.type) {
                    case 'R': components.push(new Resistor(nc.name, n1, n2, nc.value)); break;
                    case 'C': components.push(new Capacitor(nc.name, n1, n2, nc.value)); break;
                    case 'L': components.push(new Inductor(nc.name, n1, n2, nc.value)); break;
                    case 'V': components.push(new VoltageSource(nc.name, n1, n2, nc.value)); break;
                    case 'D': components.push(new Led(nc.name, n1, n2, nc.vf ?? 2.0)); break;
                    case 'S': components.push(new Switch(nc.name, n1, n2, nc.state ?? false)); break;
                }
            }

            if (components.length === 0) {
                self.postMessage({ error: 'Circuit vide' });
                return;
            }

            const solver = new MnaSolver();
            const result = solver.solve(components, { timeStep, totalTime });
            self.postMessage(result);

        } catch (err) {
            self.postMessage({ error: err instanceof Error ? err.message : 'Erreur de simulation' });
        }
        return;
    }

    self.postMessage({ error: 'Message non supporté' });
};
