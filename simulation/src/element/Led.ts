import { Component, StampContext } from "./Component";

// Une DEL (LED) est approximée ici par un modele lineaire simple :
// une source de tension Vf (tension de seuil) en serie avec
// une petite resistance Rs.
//
// Ce modele ne reproduit pas exactement le comportement non lineaire
// d'une vraie diode, mais il est suffisant pour une simulation simple.
//
// Equivalent du modele :
//   anode ──[ Rs ]──(+ Vf -)── cathode
//
// La resistance contribue a G, tandis que la tension de seuil
// contribue au vecteur b.
export class Led extends Component {
  tensionSeuil: number;
  resistanceSerie: number;
  couleur: string;

  constructor(
    id: string,
    noeud1: number,
    noeud2: number,
    tensionSeuil: number,
    couleur: string = "inconnu",
    resistanceSerie: number = 10,
  ) {
    super(id, noeud1, noeud2);
    this.tensionSeuil = tensionSeuil;
    this.couleur = couleur;
    this.resistanceSerie = resistanceSerie;
  }

  // Estampille la resistance serie dans G et la tension
  // de seuil dans le vecteur b.
  stamp({ G, b, nodeIndexMap }: StampContext): void {
    const indexNoeud1 = this.getNodeIndex(this.node1, nodeIndexMap);
    const indexNoeud2 = this.getNodeIndex(this.node2, nodeIndexMap);
    const conductance = 1 / this.resistanceSerie;

    // Contribution de la resistance serie Rs.
    if (indexNoeud1 !== null) {
      G.set(
        indexNoeud1,
        indexNoeud1,
        G.get(indexNoeud1, indexNoeud1) + conductance,
      );
    }

    if (indexNoeud2 !== null) {
      G.set(
        indexNoeud2,
        indexNoeud2,
        G.get(indexNoeud2, indexNoeud2) + conductance,
      );
    }

    if (indexNoeud1 !== null && indexNoeud2 !== null) {
      G.set(
        indexNoeud1,
        indexNoeud2,
        G.get(indexNoeud1, indexNoeud2) - conductance,
      );

      G.set(
        indexNoeud2,
        indexNoeud1,
        G.get(indexNoeud2, indexNoeud1) - conductance,
      );
    }

    // Ajoute la tension de seuil Vf dans b.
    // La DEL impose une chute de tension de l'anode vers la cathode.
    if (indexNoeud1 !== null) {
      b.set(
        indexNoeud1,
        0,
        b.get(indexNoeud1, 0) + conductance * this.tensionSeuil,
      );
    }

    if (indexNoeud2 !== null) {
      b.set(
        indexNoeud2,
        0,
        b.get(indexNoeud2, 0) - conductance * this.tensionSeuil,
      );
    }
  }
}
