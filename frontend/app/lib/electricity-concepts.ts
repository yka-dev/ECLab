export type ElectricityConcept = {
  slug: string;
  title: string;
  shortDefinition: string;
  definition: string;
};

export const electricityConcepts: ElectricityConcept[] = [
  {
    slug: "difference-de-potentiel",
    title: "Différence de potentiel",
    shortDefinition: "Écart d'énergie électrique entre deux points d'un circuit.",
    definition:
      "La différence de potentiel correspond à l'écart d'énergie électrique par unité de charge entre deux points. Elle indique à quel point une charge peut gagner ou perdre de l'énergie en se déplaçant dans le circuit. On l'exprime en volts, et elle est souvent associée à la tension électrique.",
  },
  {
    slug: "tension",
    title: "Tension électrique",
    shortDefinition: "Différence de potentiel qui pousse les charges dans un circuit.",
    definition:
      "La tension électrique correspond à la différence de potentiel entre deux points d'un circuit. Elle représente l'énergie fournie par unité de charge et s'exprime en volts. Dans un montage, c'est souvent la source de tension qui provoque la circulation du courant.",
  },
  {
    slug: "courant",
    title: "Courant électrique",
    shortDefinition: "Débit de charges électriques qui traverse un conducteur.",
    definition:
      "Le courant électrique est le déplacement ordonné de charges dans un matériau conducteur. Il se mesure en ampères et indique la quantité de charge qui traverse une section du circuit par unité de temps. Plus le courant est grand, plus le débit de charges est élevé.",
  },
  {
    slug: "intensite",
    title: "Intensité du courant",
    shortDefinition: "Valeur du courant électrique qui circule dans un circuit.",
    definition:
      "L'intensité du courant représente la quantité de charge électrique qui traverse un point du circuit pendant une certaine durée. Elle se note souvent I et se mesure en ampères. Plus l'intensité est grande, plus le courant transporte de charges en peu de temps.",
  },
  {
    slug: "resistance",
    title: "Résistance",
    shortDefinition: "Opposition d'un composant au passage du courant.",
    definition:
      "La résistance exprime la difficulté qu'un matériau ou qu'un composant oppose au passage du courant électrique. Elle se mesure en ohms. Une résistance élevée limite le courant pour une même tension appliquée, selon la loi d'Ohm.",
  },
  {
    slug: "loi-ohm",
    title: "Loi d'Ohm",
    shortDefinition: "Relation entre tension, courant et résistance dans un circuit.",
    definition:
      "La loi d'Ohm relie la tension, le courant et la résistance par la relation U = R x I. Elle permet de calculer une grandeur manquante si les deux autres sont connues. Cette loi est fondamentale pour analyser des circuits simples en courant continu.",
  },
  {
    slug: "puissance",
    title: "Puissance électrique",
    shortDefinition: "Taux auquel l'énergie électrique est transférée ou consommée.",
    definition:
      "La puissance électrique indique la rapidité avec laquelle un composant fournit, transforme ou consomme de l'énergie électrique. Elle s'exprime en watts. Dans plusieurs cas, on la calcule avec la relation P = U x I.",
  },
  {
    slug: "circuits-serie-parallele",
    title: "Circuits en série et en parallèle",
    shortDefinition: "Deux manières de connecter des composantes dans un circuit.",
    definition:
      "Dans un circuit en série, les composantes sont placées sur une seule trajectoire de courant, donc le même courant les traverse. Dans un circuit en parallèle, les composantes sont branchées sur plusieurs branches, ce qui partage le courant mais maintient la même tension aux bornes de chaque branche.",
  },
  {
    slug: "lois-kirchhoff",
    title: "Lois de Kirchhoff",
    shortDefinition: "Règles de conservation appliquées aux nœuds et aux mailles.",
    definition:
      "Les lois de Kirchhoff servent à analyser des circuits plus complexes. La loi des nœuds dit que la somme des courants entrant dans un nœud est égale à la somme des courants sortants. La loi des mailles dit que la somme des tensions dans une boucle fermée est nulle.",
  },
  {
    slug: "condensateur",
    title: "Condensateur",
    shortDefinition: "Composant qui emmagasine temporairement de l'énergie dans un champ électrique.",
    definition:
      "Le condensateur est un composant capable d'accumuler des charges sur deux armatures séparées par un isolant. Il se mesure en farads. Il est souvent utilisé pour filtrer, temporiser ou stabiliser des signaux et des tensions dans un circuit.",
  },
];
