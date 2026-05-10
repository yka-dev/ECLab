import { MnaSolver } from './solver/MnaSolver';
import { Resistor }      from './element/Resistor';
import { Capacitor }     from './element/Capacitor';
import { Inductor }      from './element/Inductor';
import { VoltageSource } from './element/VoltageSource';
import { Led }           from './element/Led';
import { Switch }        from './element/Switch';
import { IdealNpn }  from './element/IdealNpn';
import { Component } from './element/Component';

let running = false;
let latestNetlist: any[] = [];
let prevSolution: number[] | undefined = undefined;
let currentTime = 0;

let ledStates      = new Map<string, boolean>();
// Garde l'etat marche arret des transistors simples.
let idealNpnStates = new Map<string, boolean>();

// Reglages de la simulation.
const TIME_STEP   = 1e-4;
const CHUNK_STEPS = 8;
const CHUNK_DELAY = 60;

function buildComponents(netlist: any[]): Component[] {
    // Transforme la netlist recue en vrais objets de simulation.
    const out: Component[] = [];
    for (const nc of netlist) {
        const n1 = parseInt(nc.n1);
        const n2 = parseInt(nc.n2);
        switch (nc.type) {
            case 'R': out.push(new Resistor(nc.name, n1, n2, nc.value)); break;
            case 'C': out.push(new Capacitor(nc.name, n1, n2, nc.value)); break;
            case 'L': out.push(new Inductor(nc.name, n1, n2, nc.value)); break;
            case 'V': out.push(new VoltageSource(nc.name, n1, n2, nc.value)); break;
            case 'D': {
                if (ledStates.get(nc.name) ?? false) {
                    out.push(new Led(nc.name, n1, n2, nc.vf ?? 2.0));
                } else {
                    out.push(new Resistor('__off_' + nc.name, n1, n2, 1e6));
                }
                break;
            }
            case 'S': out.push(new Switch(nc.name, n1, n2, nc.state ?? false)); break;
            case 'NPN_IDEAL': {
                // Modele le transistor comme un interrupteur entre collecteur et emetteur.
                const inpn = new IdealNpn(
                    nc.name,
                    parseInt(nc.nb), parseInt(nc.nc), parseInt(nc.ne),
                    nc.vbe_on ?? 0.7,
                    nc.ron    ?? 10,
                );
                inpn.on = idealNpnStates.get(nc.name) ?? false;
                out.push(inpn);
                break;
            }
        }
    }
    return out;
}

function updateLedStates(netlist: any[], nodeVoltages: Record<string, number>): boolean {
    // Allume une LED si sa tension directe depasse son seuil.
    let changed = false;
    for (const nc of netlist) {
        if (nc.type !== 'D') continue;
        const v1 = nc.n1 === '0' ? 0 : (nodeVoltages[`node${nc.n1}`] ?? 0);
        const v2 = nc.n2 === '0' ? 0 : (nodeVoltages[`node${nc.n2}`] ?? 0);
        const nowOn = (v1 - v2) >= (nc.vf ?? 2.0);
        if (nowOn !== (ledStates.get(nc.name) ?? false)) {
            ledStates.set(nc.name, nowOn);
            changed = true;
        }
    }
    return changed;
}

function updateIdealNpnStates(netlist: any[], nodeVoltages: Record<string, number>): boolean {
    // Active le transistor si Vbe depasse le seuil choisi.
    let changed = false;
    for (const nc of netlist) {
        if (nc.type !== 'NPN_IDEAL') continue;
        const vb = nc.nb === '0' ? 0 : (nodeVoltages[`node${nc.nb}`] ?? 0);
        const ve = nc.ne === '0' ? 0 : (nodeVoltages[`node${nc.ne}`] ?? 0);
        const nowOn = (vb - ve) >= (nc.vbe_on ?? 0.7);
        if (nowOn !== (idealNpnStates.get(nc.name) ?? false)) {
            idealNpnStates.set(nc.name, nowOn);
            changed = true;
        }
    }
    return changed;
}

function runChunk() {
    // Calcule un petit bloc, puis relance la boucle apres une pause.
    if (!running) return;

    try {
        if (latestNetlist.length === 0) {
            setTimeout(runChunk, CHUNK_DELAY);
            return;
        }

        const solver = new MnaSolver();
        let result: any;

        for (let iter = 0; iter < 5; iter++) {
            const components = buildComponents(latestNetlist);

            try {
                result = solver.solve(components, {
                    timeStep:  TIME_STEP,
                    totalTime: CHUNK_STEPS * TIME_STEP,
                    initialSolutionVector: prevSolution,
                });
            } catch (e: any) {
                if (e?.message?.includes('mismatch')) {
                    prevSolution = undefined;
                    result = solver.solve(components, {
                        timeStep:  TIME_STEP,
                        totalTime: CHUNK_STEPS * TIME_STEP,
                    });
                } else {
                    throw e;
                }
            }

            let changed = updateLedStates(latestNetlist, result.nodeVoltages);
            changed     = updateIdealNpnStates(latestNetlist, result.nodeVoltages) || changed;
            if (!changed) break; // Les etats sont stables.
        }

        if (result.timeSeries && result.timeSeries.length > 0) {
            const offsetSeries = result.timeSeries.map((pt: any) => ({
                ...pt,
                time: currentTime + pt.time,
            }));
            currentTime += CHUNK_STEPS * TIME_STEP;
            prevSolution = result.solutionVector;

            self.postMessage({
                type: 'chunk',
                nodeVoltages:   result.nodeVoltages,
                sourceCurrents: result.sourceCurrents,
                timeSeries:     offsetSeries,
            });
        } else {
            prevSolution = result.solutionVector;
            self.postMessage({
                type: 'chunk',
                nodeVoltages:   result.nodeVoltages,
                sourceCurrents: result.sourceCurrents,
            });
        }

        setTimeout(runChunk, CHUNK_DELAY);

    } catch (err) {
        running = false;
        self.postMessage({ error: err instanceof Error ? err.message : 'Erreur de simulation' });
    }
}

self.onmessage = (event: MessageEvent) => {
    const { type, ...data } = event.data ?? {};

    if (type === 'simulate') {
        running      = true;
        currentTime  = 0;
        prevSolution = undefined;
        ledStates      = new Map();
        idealNpnStates = new Map();
        latestNetlist = data.netlist ?? [];
        runChunk();
        return;
    }

    if (type === 'updateNetlist') {
        if (data.netlist?.length !== latestNetlist.length) {
            prevSolution = undefined;
        }
        latestNetlist = data.netlist ?? [];
        return;
    }

    if (type === 'stop') {
        running = false;
        return;
    }
};
