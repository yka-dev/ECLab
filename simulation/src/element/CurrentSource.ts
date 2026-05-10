import { Composant, ContexteStamp } from "./Component";

// Une source de courant ideale impose un courant constant dans la branche,
// independamment de la tension a ses bornes.
//
// Dans la MNA, elle ne contribue qu'au vecteur b (aucune entree dans G ni C).
// Convention de signe : le courant entre par node2 et sort par node1
// (convention generateur, coherente avec la convention recepteur des resistances).
//
//   b[i1] -= courant   (le courant quitte le noeud node1)
//   b[i2] += courant   (le courant arrive au noeud node2)
export class CurrentSource extends Composant {
  readonly courant: number;

  constructor(id: string, node1: number, node2: number, courant: number) {
    super(id, node1, node2);
    this.courant = courant;
  }

  // N'estampille que b — une source de courant ideale n'a pas de resistance interne
  // et n'ajoute donc aucune entree dans la matrice de conductance G.
  stamp({ b, nodeIndexMap }: ContexteStamp): void {
    const i1 = this.obtenirIndiceNoeud(this.node1, nodeIndexMap);
    const i2 = this.obtenirIndiceNoeud(this.node2, nodeIndexMap);

    if (i1 !== null) b.set(i1, 0, b.get(i1, 0) - this.courant);
    if (i2 !== null) b.set(i2, 0, b.get(i2, 0) + this.courant);
  }
}
