import { Battery } from '../element/Battery';
import { Capacitor } from '../element/Capacitor';
import { Component } from '../element/Component';
import { CurrentSource } from '../element/CurrentSource';
import { Led } from '../element/Led';
import { Resistor } from '../element/Resistor';
import { Switch } from '../element/Switch';
import { VoltageSource } from '../element/VoltageSource';
import { Wire } from '../element/Wire';

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

        static createLedCircuit(): Circuit {
        const circuit = new Circuit();

        const B1 = new Battery("B1", 1, 0, 9, 0.5);   // batterie 9V, 0.5 ohm interne
        const S1 = new Switch("S1", 1, 2, true);        // switch fermé
        const R1 = new Resistor("R1", 2, 3, 100);       // résistance de protection
        const L1 = new Led("L1", 3, 0, 1.8, 'rouge');   // LED rouge, tension choisie manuellement : 1.8V

        circuit.addComponent(B1);
        circuit.addComponent(S1);
        circuit.addComponent(R1);
        circuit.addComponent(L1);

        return circuit;
    }

    // batterie → switch → jonction → deux branches
    // branche 1 : R1 + LED verte
    // branche 2 : C1 + C2 + source de courant
    static createMixedCircuit(): Circuit {
        const circuit = new Circuit();

                const B1   = new Battery("B1", 1, 0, 9, 0.5);
        const W1   = new Wire("W1", 1, 2);
        const S1   = new Switch("S1", 2, 3, true);
        const W2   = new Wire("W2", 3, 4);

        // branche LED
        const W3   = new Wire("W3", 4, 5);
        const R1   = new Resistor("R1", 5, 6, 220);
        const W4   = new Wire("W4", 6, 7);
        const LED1 = new Led("LED1", 7, 8, 2.1, 'vert');
        const W5   = new Wire("W5", 8, 0);

        // branche capacitors
        const W6   = new Wire("W6", 4, 9);
        const C1   = new Capacitor("C1", 9, 10, 100e-6);
        const W7   = new Wire("W7", 10, 11);
        const C2   = new Capacitor("C2", 11, 12, 47e-6);
        const W8   = new Wire("W8", 12, 13);
const I1   = new CurrentSource("I1", 13, 0, 0.01);

        [B1, W1, S1, W2, W3, R1, W4, LED1, W5, W6, C1, W7, C2, W8, I1].forEach(c => circuit.addComponent(c));

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
