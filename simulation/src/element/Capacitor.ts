import { Component, StampContext } from "./Component";

// Un condensateur est modelise dans la MNA via la matrice capacitive C
// (distincte de la matrice de conductance G).
//
// En integration d'Euler implicite, le condensateur contribue a la matrice C
// avec la meme structure qu'une conductance dans G :
//
//   C[i1][i1] += capacite      C[i1][i2] -= capacite
//   C[i2][i1] -= capacite      C[i2][i2] += capacite
//
// Le solveur MNA combine ensuite G et C pour former la matrice systeme :
//   A = G + C/h  (ou h est le pas de temps)
export class Capacitor extends Component {
  readonly capacite: number;

  constructor(id: string, node1: number, node2: number, capacite: number) {
    super(id, node1, node2);
    this.capacite = capacite;
  }

  // Le condensateur n'estampille que la matrice C, jamais G ni b.
  // Son effet sur le circuit n'est visible qu'en regime transitoire
  // (en regime continu etabli, il se comporte comme un circuit ouvert).
  stamp({ C, nodeIndexMap }: StampContext): void {
    const i1 = this.getNodeIndex(this.node1, nodeIndexMap);
    const i2 = this.getNodeIndex(this.node2, nodeIndexMap);

    if (i1 !== null) {
      C.set(i1, i1, C.get(i1, i1) + this.capacite);
    }
    if (i2 !== null) {
      C.set(i2, i2, C.get(i2, i2) + this.capacite);
    }
    if (i1 !== null && i2 !== null) {
      C.set(i1, i2, C.get(i1, i2) - this.capacite);
      C.set(i2, i1, C.get(i2, i1) - this.capacite);
    }
  }
}
