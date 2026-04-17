import { Matrix } from 'ml-matrix';

/**
 * Classe abstraite de composant électrique.
 * Définit les identifiants de nœuds et la méthode stamp() à implémenter par les sous-classes.
 */
export abstract class Component {
    id : string
    node1 : number
    node2 : number

    constructor(id: string, node1: number, node2: number){
        this.id= id;
        this.node1 = node1;
        this.node2 = node2;
    }
    stamp(matrixGx: Matrix, matrixBx : Matrix): void {
        // To be implemented by subclasses  
    }
}