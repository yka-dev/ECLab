// simulation — boucle continue jusqu'à réception de 'stop'
import { MnaSolver } from './solver/MnaSolver';
import { Resistor } from './element/Resistor';
import { Capacitor } from './element/Capacitor';
import { Inductor } from './element/Inductor';
import { VoltageSource } from './element/VoltageSource';
import { Led } from './element/Led';
import { Switch } from './element/Switch';
import { Component } from './element/Component';

let running = false;
let latestNetlist: any[] = [];
let prevSolution: number[] | undefined = undefined;
let currentTime = 0;

let ledStates = new Map<string, boolean>();

// ── Paramètres de simulation ──────────────────────────────────────────────────
const TIME_STEP   = 1e-4;  
const CHUNK_STEPS = 8;    
const CHUNK_DELAY = 60;    

// ── Construction des composants ───────────────────────────────────────────────
function buildComponents(netlist: any[]): Component[] {
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
                    // LED passante : équivalent Norton Vf/Rs || Rs — aucun conflit MNA
                    out.push(new Led(nc.name, n1, n2, nc.vf ?? 2.0));
                } else {
                    // LED bloquée : grande résistance (même taille de matrice que Led)
                    out.push(new Resistor('__off_' + nc.name, n1, n2, 1e6));
                }
                break;
            }
            case 'S': out.push(new Switch(nc.name, n1, n2, nc.state ?? false)); break;
        }
    }
    return out;
}


function updateLedStates(netlist: any[], nodeVoltages: Record<string, number>): boolean {
    let changed = false;
    for (const nc of netlist) {
        if (nc.type !== 'D') continue;
        const v1   = nc.n1 === '0' ? 0 : (nodeVoltages[`node${nc.n1}`] ?? 0);
        const v2   = nc.n2 === '0' ? 0 : (nodeVoltages[`node${nc.n2}`] ?? 0);
        const vf   = nc.vf ?? 2.0;
        const nowOn = (v1 - v2) >= vf;
        if (nowOn !== (ledStates.get(nc.name) ?? false)) {
            ledStates.set(nc.name, nowOn);
            changed = true;
        }
    }
    return changed;
}

function runChunk() {
    if (!running) return;

    try {
        if (latestNetlist.length === 0) {
            setTimeout(runChunk, CHUNK_DELAY);
            return;
        }

        const solver = new MnaSolver();
        let result: any;

      
        for (let iter = 0; iter < 3; iter++) {
            const components = buildComponents(latestNetlist);

            try {
                result = solver.solve(components, {
                    timeStep:  TIME_STEP,
                    totalTime: CHUNK_STEPS * TIME_STEP,
                    initialSolutionVector: prevSolution,
                });
            } catch (e: any) {
                // Changement de taille dû à un ajout/suppression de composant externe
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

            const changed = updateLedStates(latestNetlist, result.nodeVoltages);
            if (!changed) break; // convergé
            // Pas de reset de prevSolution — taille stable avec le modèle Norton
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
        running       = true;
        currentTime   = 0;
        prevSolution  = undefined;
        ledStates     = new Map(); // tout OFF au démarrage
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
