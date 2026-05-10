import { Component, StampContext } from "./Component";

// Un inducteur stocke de l'energie dans un champ magnetique et
// s'oppose aux variations brusques de courant.
//
// Equation physique :
//   v = L * di/dt
//
// En MNA, un inducteur ajoute une inconnue supplementaire :
// le courant qui le traverse. On lui reserve donc une ligne MNA,
// comme pour une source de tension.
//
// La matrice G relie ce courant aux tensions des noeuds,
// tandis que C contient l'inductance pour representer
// la dynamique temporelle du composant.
export class Inductor extends Component {
  inductance: number;
  private ligneMna: number | null = null;

  constructor(id: string, noeud1: number, noeud2: number, inductance: number) {
    super(id, noeud1, noeud2);
    this.inductance = inductance;
  }

  setLigneMna(ligne: number): void {
    this.ligneMna = ligne;
  }

  // Estampille les contraintes reliant le courant de l'inducteur
  // aux tensions des noeuds, puis ajoute L dans C.
  stamp({ G, C, nodeIndexMap }: StampContext): void {
    if (this.ligneMna === null) {
      throw new Error(`L'inducteur ${this.id} n'a pas de ligne MNA assignée.`);
    }

    const indexNoeud1 = this.getNodeIndex(this.node1, nodeIndexMap);
    const indexNoeud2 = this.getNodeIndex(this.node2, nodeIndexMap);

    if (indexNoeud1 !== null) {
      G.set(indexNoeud1, this.ligneMna, 1);
      G.set(this.ligneMna, indexNoeud1, 1);
    }

    if (indexNoeud2 !== null) {
      G.set(indexNoeud2, this.ligneMna, -1);
      G.set(this.ligneMna, indexNoeud2, -1);
    }

    // L'inductance est ajoutee dans C pour modeliser
    // le terme temporel de l'equation v = L * di/dt.
    C.set(this.ligneMna, this.ligneMna, this.inductance);
  }
}
