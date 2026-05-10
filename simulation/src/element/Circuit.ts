import { Battery } from "../element/Battery";
import { Capacitor } from "../element/Capacitor";
import { Component } from "../element/Component";
import { CurrentSource } from "../element/CurrentSource";
import { Inductor } from "../element/Inductor";
import { Led } from "../element/Led";
import { Resistor } from "../element/Resistor";
import { Switch } from "../element/Switch";
import { VoltageSource } from "../element/VoltageSource";
import { Wire } from "../element/Wire";

// Circuit est un conteneur de composants passe directement au MnaSolver.
// Les methodes statiques sont des circuits de reference utilises pour
// tester et valider le solveur — elles ne font pas partie de la logique metier.
export class Circuit {
  composants: Component[] = [];

  ajouterComposant(composant: Component): void {
    this.composants.push(composant);
  }

  // Ajoute plusieurs composants d'un coup pour eviter les appels repetitifs.
  ajouterComposants(...composants: Component[]): void {
    this.composants.push(...composants);
  }

  // Circuit minimal : source de tension + resistor en parallele.
  // Resultat attendu : I = V/R = 10/5 = 2 A.
  static creerCircuitSimple(): Circuit {
    const circuit = new Circuit();
    circuit.ajouterComposants(
      new VoltageSource("V1", 1, 0, 10),
      new Resistor("R1", 1, 0, 5),
    );
    return circuit;
  }

  // Circuit multi-sources avec pont resistif.
  // Permet de valider la superposition des sources et les bilans de courant sur les noeuds.
  static creerCircuitComplexe(): Circuit {
    const circuit = new Circuit();
    circuit.ajouterComposants(
      new VoltageSource("V1", 1, 0, 12),
      new VoltageSource("V2", 3, 0, 5),
      new Resistor("R1", 1, 2, 4),
      new Resistor("R2", 2, 0, 6),
      new Resistor("R3", 2, 3, 8),
      new Resistor("R4", 3, 0, 10),
      new Resistor("R5", 1, 3, 12),
    );
    return circuit;
  }

  // Circuit LED typique : batterie → interrupteur → resistance de protection → LED.
  // La resistance R1 limite le courant pour ne pas griller la LED.
  // Topologie : B1(1-0) → S1(1-2) → R1(2-3) → LED(3-0)
  static creerCircuitLed(): Circuit {
    const circuit = new Circuit();
    circuit.ajouterComposants(
      new Battery("B1", 1, 0, 9, 0.5), // 9 V, 0,5 ohm de resistance interne
      new Switch("S1", 1, 2, true), // interrupteur ferme
      new Resistor("R1", 2, 3, 100), // resistance de protection
      new Led("L1", 3, 0, 1.8, "rouge"), // LED rouge, seuil 1,8 V
    );
    return circuit;
  }

  // Circuit mixte avec deux branches paralleles apres la jonction (noeud 4) :
  //   - Branche 1 : resistance + LED verte
  //   - Branche 2 : deux condensateurs en serie + source de courant
  // Ce circuit valide le traitement simultane d'elements lineaires et non lineaires.
  // Topologie : B1(1-0) → W1 → S1(2-3) → W2 → noeud 4
  static creerCircuitMixte(): Circuit {
    const circuit = new Circuit();
    circuit.ajouterComposants(
      // Tronc principal
      new Battery("B1", 1, 0, 9, 0.5),
      new Wire("W1", 1, 2),
      new Switch("S1", 2, 3, true),
      new Wire("W2", 3, 4),

      // Branche 1 : LED verte avec resistance de protection
      new Wire("W3", 4, 5),
      new Resistor("R1", 5, 6, 220),
      new Wire("W4", 6, 7),
      new Led("LED1", 7, 8, 2.1, "vert"),
      new Wire("W5", 8, 0),

      // Branche 2 : condensateurs en serie alimentes par une source de courant
      new Wire("W6", 4, 9),
      new Capacitor("C1", 9, 10, 100e-6),
      new Wire("W7", 10, 11),
      new Capacitor("C2", 11, 12, 47e-6),
      new Wire("W8", 12, 13),
      new CurrentSource("I1", 13, 0, 0.01),
    );
    return circuit;
  }

  // Circuit RLC serie classique. La tension sur le condensateur oscille
  // (reponse sous-amortie) avant de se stabiliser a la valeur de la source.
  // Frequence de resonance : f0 = 1 / (2*pi*sqrt(L*C)) ≈ 159 Hz ici.
  // Topologie : V1(1-0) → R1(1-2) → L1(2-3) → C1(3-0)
  static creerCircuitRlc(): Circuit {
    const circuit = new Circuit();
    circuit.ajouterComposants(
      new VoltageSource("V1", 1, 0, 10),
      new Resistor("R1", 1, 2, 10),
      new Inductor("L1", 2, 3, 0.01), // 10 mH
      new Capacitor("C1", 3, 0, 100e-6), // 100 uF
    );
    return circuit;
  }

  // Circuit RC serie. La tension sur le condensateur monte exponentiellement
  // avec une constante de temps tau = R*C = 1000 * 1e-6 = 1 ms.
  // Topologie : V1(1-0) → R1(1-2) → C1(2-0)
  static creerCircuitRc(): Circuit {
    const circuit = new Circuit();
    circuit.ajouterComposants(
      new VoltageSource("V1", 1, 0, 10),
      new Resistor("R1", 1, 2, 1000),
      new Capacitor("C1", 2, 0, 1e-6),
    );
    return circuit;
  }
}
