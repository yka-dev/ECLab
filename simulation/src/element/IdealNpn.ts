//  TRANSISTOR FICTIF — résultat attendu sans simulation réelle
// Ce composant n'est PAS un vrai modèle BJT. Il simule un transistor NPN
// comme un simple interrupteur commandé par V_BE 
// Aucun gain β, aucune source de courant, aucun modèle Ebers-Moll.
// Avantage : toujours stable, jamais de courant parasite.
import { Component, StampContext } from './Component';

export class IdealNpn extends Component {
    vbeOn: number;
    ron:   number;

    /**
     * État actuel :
     *   true  = passant  (C-E court-circuité via Ron)
     *   false = bloqué   (C-E quasi ouvert, 1 MΩ)
     */
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

        // Fuite 1 MΩ sur B-E : permet de lire V_BE sans nœud flottant,
        // sans introduire de courant mesurable dans le circuit.
        this.#stampG(G, nB, nE, 1e-6);

        // C-E : conductance forte si passant, quasi nulle si bloqué
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
