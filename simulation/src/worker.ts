// Worker de simulation MNA (Modified Nodal Analysis)
// Ce fichier tourne dans un Web Worker : il recoit des netlists via postMessage,
// resout le circuit par tranches de temps (chunks) et renvoie les tensions/courants.

import { MnaSolver } from "./solver/MnaSolver";
import { Resistor } from "./element/Resistor";
import { Capacitor } from "./element/Capacitor";
import { Inductor } from "./element/Inductor";
import { VoltageSource } from "./element/VoltageSource";
import { Led } from "./element/Led";
import { Switch } from "./element/Switch";
import { IdealNpn } from "./element/IdealNpn";
import { Component } from "./element/Component";

// --- Etat de la simulation ---------------------------------------------------

let enCours = false;
let netlistCourante: any[] = [];
let solutionPrecedente: number[] | undefined = undefined;
let tempsEcoule = 0;

// Ces Maps conservent l'etat binaire (allume/eteint) des composants non lineaires
// entre chaque chunk, car le solveur MNA est lineaire et ne gere pas cet etat lui-meme.
let etatLeds = new Map<string, boolean>();
let etatNpn = new Map<string, boolean>();

// --- Parametres de simulation ------------------------------------------------

// PAS_DE_TEMPS : resolution temporelle de chaque etape d'integration (en secondes).
// ETAPES_PAR_CHUNK : nombre d'etapes calculees avant de ceder la main au thread principal.
// DELAI_CHUNK_MS : pause entre chaque chunk pour ne pas bloquer le thread du worker.
const PAS_DE_TEMPS = 1e-4;
const ETAPES_PAR_CHUNK = 8;
const DELAI_CHUNK_MS = 60;

// --- Construction des composants ---------------------------------------------

// Traduit la netlist (format JSON brut) en instances de composants typees.
// Les LEDs non conductrices sont modelisees comme des resistances tres elevees (1 MOhm)
// car le solveur MNA requiert que tous les noeuds soient connectes.
function construireComposants(netlist: any[]): Component[] {
  const composants: Component[] = [];

  for (const nc of netlist) {
    const n1 = parseInt(nc.n1);
    const n2 = parseInt(nc.n2);

    switch (nc.type) {
      case "R":
        composants.push(new Resistor(nc.name, n1, n2, nc.value));
        break;
      case "C":
        composants.push(new Capacitor(nc.name, n1, n2, nc.value));
        break;
      case "L":
        composants.push(new Inductor(nc.name, n1, n2, nc.value));
        break;
      case "V":
        composants.push(new VoltageSource(nc.name, n1, n2, nc.value));
        break;
      case "D": {
        // La LED est modelisee comme une source de tension de seuil (vf) quand
        // elle conduit, ou comme une resistance infinie quand elle est bloquee.
        const conduit = etatLeds.get(nc.name) ?? false;
        if (conduit) {
          composants.push(new Led(nc.name, n1, n2, nc.vf ?? 2.0));
        } else {
          composants.push(new Resistor(`__off_${nc.name}`, n1, n2, 1e6));
        }
        break;
      }
      case "S":
        composants.push(new Switch(nc.name, n1, n2, nc.state ?? false));
        break;
      case "NPN_IDEAL": {
        // Transistor NPN simplifie : interrupteur collecteur-emetteur
        // commande par le depassement du seuil V_BE.
        // Aucune simulation de region active ou de gain n'est effectuee.
        const npn = new IdealNpn(
          nc.name,
          parseInt(nc.nb),
          parseInt(nc.nc),
          parseInt(nc.ne),
          nc.vbe_on ?? 0.7,
          nc.ron ?? 10,
        );
        npn.on = etatNpn.get(nc.name) ?? false;
        composants.push(npn);
        break;
      }
    }
  }

  return composants;
}

// --- Mise a jour des etats non lineaires ------------------------------------

// Determine si chaque LED conduit en comparant la tension a ses bornes au seuil vf.
// Retourne true si au moins un etat a change (necessite une nouvelle iteration MNA).
function mettreAJourLeds(
  netlist: any[],
  tensions: Record<string, number>,
): boolean {
  let changement = false;

  for (const nc of netlist) {
    if (nc.type !== "D") continue;

    const v1 = nc.n1 === "0" ? 0 : (tensions[`node${nc.n1}`] ?? 0);
    const v2 = nc.n2 === "0" ? 0 : (tensions[`node${nc.n2}`] ?? 0);
    const conduit = v1 - v2 >= (nc.vf ?? 2.0);

    if (conduit !== (etatLeds.get(nc.name) ?? false)) {
      etatLeds.set(nc.name, conduit);
      changement = true;
    }
  }

  return changement;
}

// Determine si chaque NPN ideal est passant en comparant V_BE au seuil vbe_on.
// Meme logique de convergence que pour les LEDs.
function mettreAJourNpn(
  netlist: any[],
  tensions: Record<string, number>,
): boolean {
  let changement = false;

  for (const nc of netlist) {
    if (nc.type !== "NPN_IDEAL") continue;

    const vb = nc.nb === "0" ? 0 : (tensions[`node${nc.nb}`] ?? 0);
    const ve = nc.ne === "0" ? 0 : (tensions[`node${nc.ne}`] ?? 0);
    const passant = vb - ve >= (nc.vbe_on ?? 0.7);

    if (passant !== (etatNpn.get(nc.name) ?? false)) {
      etatNpn.set(nc.name, passant);
      changement = true;
    }
  }

  return changement;
}

// --- Boucle de simulation par chunk -----------------------------------------

// Chaque appel a executerChunk calcule ETAPES_PAR_CHUNK pas de temps,
// puis replanifie le prochain chunk via setTimeout pour rester non bloquant.
// La boucle interne (iter < 5) gere la convergence des composants non lineaires :
// on recalcule jusqu'a ce que les etats LED/NPN se stabilisent.
function executerChunk() {
  if (!enCours) return;

  try {
    if (netlistCourante.length === 0) {
      setTimeout(executerChunk, DELAI_CHUNK_MS);
      return;
    }

    const solveur = new MnaSolver();
    let resultat: any;

    for (let iter = 0; iter < 5; iter++) {
      const composants = construireComposants(netlistCourante);

      try {
        resultat = solveur.solve(composants, {
          timeStep: PAS_DE_TEMPS,
          totalTime: ETAPES_PAR_CHUNK * PAS_DE_TEMPS,
          initialSolutionVector: solutionPrecedente,
        });
      } catch (e: any) {
        // Un mismatch survient quand la netlist a change de taille entre deux chunks
        // (ajout/suppression d'un composant). On repart sans vecteur initial.
        if (e?.message?.includes("mismatch")) {
          solutionPrecedente = undefined;
          resultat = solveur.solve(composants, {
            timeStep: PAS_DE_TEMPS,
            totalTime: ETAPES_PAR_CHUNK * PAS_DE_TEMPS,
          });
        } else {
          throw e;
        }
      }

      const ledsChangees = mettreAJourLeds(
        netlistCourante,
        resultat.nodeVoltages,
      );
      const npnChanges = mettreAJourNpn(netlistCourante, resultat.nodeVoltages);
      if (!ledsChangees && !npnChanges) break; // etats stabilises, on sort
    }

    solutionPrecedente = resultat.solutionVector;

    // On decale les horodatages de la serie temporelle pour qu'ils soient
    // absolus (relatifs au debut de la simulation) et non relatifs au chunk.
    if (resultat.timeSeries?.length > 0) {
      const serieDecalee = resultat.timeSeries.map((pt: any) => ({
        ...pt,
        time: tempsEcoule + pt.time,
      }));
      tempsEcoule += ETAPES_PAR_CHUNK * PAS_DE_TEMPS;

      self.postMessage({
        type: "chunk",
        nodeVoltages: resultat.nodeVoltages,
        sourceCurrents: resultat.sourceCurrents,
        timeSeries: serieDecalee,
      });
    } else {
      self.postMessage({
        type: "chunk",
        nodeVoltages: resultat.nodeVoltages,
        sourceCurrents: resultat.sourceCurrents,
      });
    }

    setTimeout(executerChunk, DELAI_CHUNK_MS);
  } catch (err) {
    enCours = false;
    self.postMessage({
      error: err instanceof Error ? err.message : "Erreur de simulation",
    });
  }
}

// --- Interface du Worker (messages entrants) ---------------------------------

self.onmessage = (event: MessageEvent) => {
  const { type, ...donnees } = event.data ?? {};

  switch (type) {
    // Demarre une nouvelle simulation depuis zero.
    case "simulate":
      enCours = true;
      tempsEcoule = 0;
      solutionPrecedente = undefined;
      etatLeds = new Map();
      etatNpn = new Map();
      netlistCourante = donnees.netlist ?? [];
      executerChunk();
      break;

    // Met a jour la netlist a la volee (modification en cours de simulation).
    // Si la taille change, on invalide le vecteur solution pour eviter un mismatch.
    case "updateNetlist":
      if (donnees.netlist?.length !== netlistCourante.length) {
        solutionPrecedente = undefined;
      }
      netlistCourante = donnees.netlist ?? [];
      break;

    case "stop":
      enCours = false;
      break;
  }
};
