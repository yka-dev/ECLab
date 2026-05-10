// Ce NPN est un modele simple, pas un vrai modele BJT.
// Il agit comme un interrupteur entre collecteur et emetteur.
import { Component, StampContext } from './Component';

export class IdealNpn extends Component {
    vbeOn: number;
    ron:   number;

    // true signifie passant, false signifie bloque.
    on: boolean = false;

    constructor(
        id:    string,
        nodeB: number,
        nodeC: number,
        nodeE: number,
        vbeOn: number = 0.7,
        ron:   number = 10,
    ) {
        super(id, nodeB, nodeC);
        this.node3 = nodeE;
        this.vbeOn = vbeOn;
        this.ron   = ron;
    }

    stamp({ G, nodeIndexMap }: StampContext): void {
        const nB = this.getNodeIndex(this.node1,  nodeIndexMap);
        const nC = this.getNodeIndex(this.node2,  nodeIndexMap);
        const nE = this.getNodeIndex(this.node3!, nodeIndexMap);

        // Petite fuite entre base et emetteur pour eviter un noeud flottant.
        this.#stampG(G, nB, nE, 1e-6);

        // Le passage collecteur emetteur conduit beaucoup si le transistor est passant.
        const gCE = this.on ? 1 / this.ron : 1e-6;
        this.#stampG(G, nC, nE, gCE);
    }

    #stampG(
        G:  StampContext['G'],
        ni: number | null,
        nj: number | null,
        g:  number,
    ): void {
        if (ni !== null) G.set(ni, ni, G.get(ni, ni) + g);
        if (nj !== null) G.set(nj, nj, G.get(nj, nj) + g);
        if (ni !== null && nj !== null) {
            G.set(ni, nj, G.get(ni, nj) - g);
            G.set(nj, ni, G.get(nj, ni) - g);
        }
    }
}
