import { Capacitor } from '../element/Capacitor';
import { Component } from '../element/Component';
import { Resistor } from '../element/Resistor';
import { VoltageSource } from '../element/VoltageSource';

export class Circuit {
    components: Component[] = [];

    addComponent(component: Component): void {
        this.components.push(component);
    }

    static createSimpleTestCircuit(): Circuit {
        const circuit = new Circuit();
        const V1 = new VoltageSource("V1", 1, 0, 10);
        const R1 = new Resistor("R1", 1, 0, 5);
        circuit.addComponent(V1);
        circuit.addComponent(R1);
        return circuit;
    }

    static createComplexTestCircuit(): Circuit {
        const circuit = new Circuit();

        const V1 = new VoltageSource("V1", 1, 0, 12);
        const V2 = new VoltageSource("V2", 3, 0, 5);

        const R1 = new Resistor("R1", 1, 2, 4);
        const R2 = new Resistor("R2", 2, 0, 6);
        const R3 = new Resistor("R3", 2, 3, 8);
        const R4 = new Resistor("R4", 3, 0, 10);
        const R5 = new Resistor("R5", 1, 3, 12);

        circuit.addComponent(V1);
        circuit.addComponent(V2);
        circuit.addComponent(R1);
        circuit.addComponent(R2);
        circuit.addComponent(R3);
        circuit.addComponent(R4);
        circuit.addComponent(R5);

        return circuit;
    }

    static createRcTestCircuit(): Circuit {
        const circuit = new Circuit();

        const V1 = new VoltageSource("V1", 1, 0, 10);
        const R1 = new Resistor("R1", 1, 2, 1000);
        const C1 = new Capacitor("C1", 2, 0, 1e-6);

        circuit.addComponent(V1);
        circuit.addComponent(R1);
        circuit.addComponent(C1);

        return circuit;
    }
}
