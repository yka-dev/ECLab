// Solveur MNA (Modified Nodal Analysis)
//
// La MNA etend l'analyse nodale classique en ajoutant une ligne/colonne
// par source de tension (ou inductance), ce qui permet de resoudre
// des circuits avec des elements imposes en tension et pas seulement en courant.
//
// Pour les circuits avec capacites ou inductances, on utilise l'integration
// d'Euler implicite (backward Euler) :
//
//   (G + C/h) * x(t) = b + C/h * x(t-1)
//
// ou h = pas de temps, G = matrice de conductance, C = matrice capacitive,
// b = vecteur source et x = vecteur solution (tensions nodales + courants de source).

import { Matrix, solve } from "ml-matrix";
import { Battery } from "../element/Battery.ts";
import { Capacitor } from "../element/Capacitor.ts";
import { Component, StampContext } from "../element/Component.ts";
import { Inductor } from "../element/Inductor.ts";
import { VoltageSource } from "../element/VoltageSource.ts";

// --- Types publics -----------------------------------------------------------

export interface OptionsSolveTransitoire {
  // Pas de temps en secondes (defaut : 1 ms)
  pasDeTemps?: number;
  // Duree totale de la simulation en secondes (defaut : 10 * pasDeTemps)
  tempsTotal?: number;
  // Vecteur solution du chunk precedent, pour la continuite de l'integration.
  // Undefined signifie qu'on demarre de l'etat zero (condensateurs decharges).
  vecteurSolutionInitial?: number[];
}

interface PointTemporel {
  temps: number;
  tensionsNodales: Record<string, number>;
  courantsSources: Record<string, number>;
  vecteurSolution: number[];
}

interface ResultatSolve {
  tensionsNodales: Record<string, number>;
  courantsSources: Record<string, number>;
  vecteurSolution: number[];
  serieTemporelle?: PointTemporel[];
}

// --- Solveur -----------------------------------------------------------------

export class MnaSolver {
  // Point d'entree principal. Resout le circuit pour la liste de composants donnee.
  // Si le circuit est purement resistif (pas de C ni L), une resolution directe
  // (une seule inversion de matrice) suffit. Sinon, on integre pas a pas.
  solve(
    composants: Component[],
    options: OptionsSolveTransitoire = {},
  ): ResultatSolve {
    const { G, C, b, noeuds, sourcesDeTension } =
      this.construireMatrices(composants);

    const aDesElementsDynamiques = !C.isColumnVector() || C.norm() > 0;

    if (!aDesElementsDynamiques) {
      const solution = solve(G, b);
      return this.formaterResultat(solution, noeuds, sourcesDeTension);
    }

    return this.resoudreTransitoire(G, C, b, noeuds, sourcesDeTension, options);
  }

  // Parcourt les composants pour identifier les noeuds, les sources de tension
  // et construire les matrices G (conductance) et C (capacitive/inductive).
  private construireMatrices(composants: Component[]) {
    const ensembleNoeuds = new Set<number>();
    const sourcesDeTension: (VoltageSource | Battery | Inductor)[] = [];
    let possedeElementDynamique = false;

    for (const composant of composants) {
      if (composant.node1 !== 0) ensembleNoeuds.add(composant.node1);
      if (composant.node2 !== 0) ensembleNoeuds.add(composant.node2);
      if (composant.node3 !== undefined && composant.node3 !== 0) {
        ensembleNoeuds.add(composant.node3);
      }

      if (
        composant instanceof VoltageSource ||
        composant instanceof Battery ||
        composant instanceof Inductor
      ) {
        sourcesDeTension.push(composant);
      }

      if (composant instanceof Capacitor || composant instanceof Inductor) {
        possedeElementDynamique = true;
      }
    }

    const noeuds = Array.from(ensembleNoeuds).sort((a, b) => a - b);
    const indexNoeuds = new Map(noeuds.map((noeud, i) => [noeud, i]));
    const nbNoeuds = noeuds.length;
    const nbSources = sourcesDeTension.length;
    const taille = nbNoeuds + nbSources;

    const G = Matrix.zeros(taille, taille);
    const C = Matrix.zeros(taille, taille);
    const b = Matrix.zeros(taille, 1);

    // Chaque source de tension occupe une ligne supplementaire dans la matrice.
    // On lui attribue son indice de ligne avant le stamping.
    sourcesDeTension.forEach((source, i) => {
      source.setMnaRow(nbNoeuds + i);
    });

    const contexteStamp: StampContext = { G, C, b, nodeIndexMap: indexNoeuds };
    for (const composant of composants) {
      composant.stamp(contexteStamp);
    }

    return { G, C, b, noeuds, sourcesDeTension, possedeElementDynamique };
  }

  // Integration temporelle par la methode d'Euler implicite (backward Euler).
  // Chaque pas resout : (G + C/h) * x(t) = b + (C/h) * x(t-1)
  // Cette methode est inconditionnellement stable, ce qui est essentiel pour
  // des circuits avec de petites constantes de temps (RC ou RL).
  private resoudreTransitoire(
    G: Matrix,
    C: Matrix,
    b: Matrix,
    noeuds: number[],
    sourcesDeTension: (VoltageSource | Battery | Inductor)[],
    options: OptionsSolveTransitoire,
  ): ResultatSolve {
    const h = options.pasDeTemps ?? 1e-3;
    const tTotal = options.tempsTotal ?? 10 * h;

    if (h <= 0) throw new Error("pasDeTemps doit etre strictement positif.");
    if (tTotal < 0) throw new Error("tempsTotal ne peut pas etre negatif.");

    const nbPas = Math.max(1, Math.ceil(tTotal / h));
    const taille = G.rows;
    let xPrecedent = this.creerEtatInitial(
      taille,
      options.vecteurSolutionInitial,
    );
    const serie: PointTemporel[] = [];

    // Precalcul de C/h : cette matrice est constante sur toute la simulation.
    const CsurH = C.clone().mul(1 / h);
    // La matrice systeme A = G + C/h est elle aussi constante (circuit lineaire).
    const A = G.clone().add(CsurH);

    for (let pas = 1; pas <= nbPas; pas++) {
      // Membre droit : b + (C/h) * x(t-1)
      const rhs = b.clone().add(CsurH.mmul(xPrecedent));
      const solution = solve(A, rhs);
      const formate = this.formaterResultat(solution, noeuds, sourcesDeTension);

      serie.push({
        temps: pas * h,
        tensionsNodales: formate.tensionsNodales,
        courantsSources: formate.courantsSources,
        vecteurSolution: formate.vecteurSolution,
      });

      xPrecedent = solution;
    }

    const dernier = serie[serie.length - 1];
    return {
      tensionsNodales: dernier.tensionsNodales,
      courantsSources: dernier.courantsSources,
      vecteurSolution: dernier.vecteurSolution,
      serieTemporelle: serie,
    };
  }

  // Construit le vecteur colonne de l'etat initial.
  // Un vecteur nul signifie que tous les condensateurs sont decharges et
  // toutes les inductances parcourues par un courant nul.
  private creerEtatInitial(taille: number, vecteurInitial?: number[]): Matrix {
    if (vecteurInitial === undefined) {
      return Matrix.zeros(taille, 1);
    }

    if (vecteurInitial.length !== taille) {
      throw new Error(
        `Taille du vecteur initial incorrecte : attendu ${taille}, recu ${vecteurInitial.length}.`,
      );
    }

    return Matrix.columnVector(vecteurInitial);
  }

  // Traduit le vecteur solution brut en objets nommes pour le reste de l'application.
  // Convention : les nbNoeuds premiers elements sont les tensions nodales,
  // les elements suivants sont les courants traversant chaque source de tension.
  private formaterResultat(
    solution: Matrix,
    noeuds: number[],
    sourcesDeTension: (VoltageSource | Battery | Inductor)[],
  ): ResultatSolve {
    const vecteur = solution.to1DArray();
    const tensionsNodales: Record<string, number> = {};
    const courantsSources: Record<string, number> = {};
    const nbNoeuds = noeuds.length;

    noeuds.forEach((noeud, i) => {
      tensionsNodales[`node${noeud}`] = vecteur[i];
    });

    sourcesDeTension.forEach((source, i) => {
      courantsSources[source.id] = vecteur[nbNoeuds + i];
    });

    return { tensionsNodales, courantsSources, vecteurSolution: vecteur };
  }
}
