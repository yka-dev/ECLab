import { MnaSolver } from '../src/solver/MnaSolver';
import { Resistor } from '../src/element/Resistor';
import { VoltageSource } from '../src/element/VoltageSource';
import { Circuit } from '../src/element/Circuit';


const c1 : Circuit = Circuit.createSimpleTestCircuit();
const solver = new MnaSolver();
const solution = solver.solve(c1.components);


self.onmessage = (event: MessageEvent) => {
    
    console.log(event.data)
    self.postMessage("Solution vector x =\n" + solution.toString())
    self.postMessage("Hello from worker!")

    self.postMessage("test result")
}

