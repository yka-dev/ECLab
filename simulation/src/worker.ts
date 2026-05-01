// simulation continue — tourne en boucle jusqu'à réception de 'stop'
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

// ── Paramètres de simulation (physique) ───────────────────────────────────────
const TIME_STEP   = 1e-4;  // 0.1 ms — précision élevée, stable pour RC avec τ ≥ 0.5 ms
const CHUNK_STEPS = 8;     // 8 pas par chunk = 0.8 ms de temps simulé par envoi
const CHUNK_DELAY = 60;    // 60 ms de pause réelle entre chunks → ~13× ralenti vs temps réel
// Ratio temps réel : (CHUNK_STEPS × TIME_STEP) / (CHUNK_DELAY ms) = 0.8 ms / 60 ms ≈ 0.013×
// → un transitoire RC de τ = 1 ms se déroule en ~5 s de temps réel (très lisible)

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
            case 'D': out.push(new Led(nc.name, n1, n2, nc.vf ?? 2.0)); break;
            case 'S': out.push(new Switch(nc.name, n1, n2, nc.state ?? false)); break;
        }
    }
    return out;
}

function runChunk() {
    if (!running) return;

    try {
        const components = buildComponents(latestNetlist);

        if (components.length === 0) {
            setTimeout(runChunk, CHUNK_DELAY);
            return;
        }

        const solver = new MnaSolver();
        let result;

        try {
            result = solver.solve(components, {
                timeStep:  TIME_STEP,
                totalTime: CHUNK_STEPS * TIME_STEP,
                initialSolutionVector: prevSolution,
            });
        } catch (e: any) {
            // dimensions ont changé (composant ajouté/supprimé) — on repart de zéro
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

        if (result.timeSeries && result.timeSeries.length > 0) {
            const offsetSeries = result.timeSeries.map(pt => ({
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
            // circuit DC pur — on envoie quand même les tensions et on continue la boucle
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
        latestNetlist = data.netlist ?? [];
        runChunk();
        return;
    }

    if (type === 'updateNetlist') {
        // le prochain chunk utilisera ce nouveau netlist
        // on remet prevSolution à undefined si le netlist a changé de taille
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
