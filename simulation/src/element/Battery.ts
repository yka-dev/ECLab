import { Component, StampContext } from "./Component";

// Une batterie est modelisee comme une source de tension ideale en serie
// avec une resistance interne. Cette resistance interne fait chuter la tension
// aux bornes quand un courant est tire (loi d'Ohm : U_chute = R_int * I).
//
// Exemple : une pile AA a environ 0,1 ohm de resistance interne, ce qui explique
// pourquoi sa tension chute sous charge.
//
// Representation MNA : la source de tension ajoute une inconnue supplementaire
// (le courant de branche) et une ligne/colonne dans la matrice systeme.
// La resistance interne est estampillee comme un Resistor classique entre node1 et node2.
export class Battery extends Component {
  readonly tension: number;
  readonly resistanceInterne: number;
  private ligneMna: number | null = null;

  constructor(
    id: string,
    node1: number,
    node2: number,
    tension: number,
    resistanceInterne: number = 0.1,
  ) {
    super(id, node1, node2);
    this.tension = tension;
    this.resistanceInterne = resistanceInterne;
  }

  // Appele par le solveur avant stamp() pour assigner la ligne MNA
  // correspondant au courant de branche de cette source.
  setMnaRow(ligne: number): void {
    this.ligneMna = ligne;
  }

  stamp({ G, b, nodeIndexMap }: StampContext): void {
    if (this.ligneMna === null) {
      throw new Error(
        `La batterie "${this.id}" n'a pas de ligne assignee dans la matrice MNA.`,
      );
    }

    const i1 = this.getNodeIndex(this.node1, nodeIndexMap);
    const i2 = this.getNodeIndex(this.node2, nodeIndexMap);

    // --- Estampillage de la source de tension ideale ---
    // La MNA impose V(node1) - V(node2) = tension en ajoutant :
    //   - +1 / -1 dans la colonne du courant de branche (contribution au bilan nodal)
    //   - +1 / -1 dans la ligne du courant de branche (equation de maille)
    if (i1 !== null) {
      G.set(i1, this.ligneMna, 1);
      G.set(this.ligneMna, i1, 1);
    }
    if (i2 !== null) {
      G.set(i2, this.ligneMna, -1);
      G.set(this.ligneMna, i2, -1);
    }
    b.set(this.ligneMna, 0, this.tension);

    // --- Estampillage de la resistance interne ---
    // Identique a un Resistor entre node1 et node2 :
    // contribution diagonale (+g) et hors-diagonale (-g) dans G.
    const g = 1 / this.resistanceInterne;

    if (i1 !== null) {
      G.set(i1, i1, G.get(i1, i1) + g);
    }
    if (i2 !== null) {
      G.set(i2, i2, G.get(i2, i2) + g);
    }
    if (i1 !== null && i2 !== null) {
      G.set(i1, i2, G.get(i1, i2) - g);
      G.set(i2, i1, G.get(i2, i1) - g);
    }
  }
}
