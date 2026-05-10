import { Matrix } from "ml-matrix";

// StampContext regroupe les matrices MNA passees a chaque composant lors du stamping.
// Chaque composant modifie directement ces matrices par effet de bord —
// c'est le mecanisme central de la MNA (Modified Nodal Analysis).
//
//   G : matrice de conductance (elements resistifs et sources de tension)
//   C : matrice capacitive (condensateurs et inductances)
//   b : vecteur source (tensions et courants imposes)
//   nodeIndexMap : correspondance noeud physique → indice de ligne/colonne dans G et C
export interface ContexteStamp {
  G: Matrix;
  C: Matrix;
  b: Matrix;
  nodeIndexMap: Map<number, number>;
}

// Classe de base de tous les composants du circuit.
//
// Convention des noeuds :
//   - Le noeud 0 est la masse (ground) — il n'a pas de ligne dans la matrice.
//   - node1 et node2 sont les bornes principales (present sur tous les composants).
//   - node3 est optionnel, reserve aux composants a trois bornes (ex: BJT, FET).
//
// Chaque sous-classe implemente stamp() pour inscrire sa contribution
// dans les matrices du solveur. Ne pas appeler stamp() directement —
// c'est le MnaSolver qui orchestre les appels dans le bon ordre.
export abstract class Component {
  readonly id: string;
  node1: number;
  node2: number;
  node3?: number;

  constructor(id: string, node1: number, node2: number) {
    this.id = id;
    this.node1 = node1;
    this.node2 = node2;
  }

  // Traduit un numero de noeud physique en indice matriciel.
  // Retourne null pour le noeud 0 (masse) car il n'a pas de ligne dans la matrice MNA —
  // toutes les tensions sont relatives a la masse, elle n'est donc jamais une inconnue.
  // Leve une erreur si le noeud est absent de la map, ce qui signifie que le circuit
  // est mal forme (composant branche sur un noeud non repertorie).
  protected obtenirIndiceNoeud(
    noeud: number,
    indexNoeuds: Map<number, number>,
  ): number | null {
    if (noeud === 0) return null;

    const indice = indexNoeuds.get(noeud);
    if (indice === undefined) {
      throw new Error(`Le noeud ${noeud} est absent de la carte d'index MNA.`);
    }
    return indice;
  }

  // Methode de stamping par defaut : ne fait rien.
  // Les composants purement passifs sans contribution (ex: Wire ideal)
  // n'ont pas besoin de la surcharger.
  stamp(_contexte: ContexteStamp): void {}
}
