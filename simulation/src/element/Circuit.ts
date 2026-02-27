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
        const V1 = new VoltageSource("V1", 1, 0, 10,0);
        const R1 = new Resistor("R1", 1, 0, 5);
        circuit.addComponent(V1);
        circuit.addComponent(R1);
        return circuit;
    }
}
