export type ElectricityConcept = {
  slug: string;
  title: string;
  shortDefinition: string;
  definition: string;
};

export const electricityConcepts: ElectricityConcept[] = [
  {
    slug: "difference-de-potentiel",
    title: "Difference de potentiel",
    shortDefinition: "Ecart d'energie electrique entre deux points d'un circuit.",
    definition:
      "La difference de potentiel correspond a l'ecart d'energie electrique par unite de charge entre deux points. Elle indique a quel point une charge peut gagner ou perdre de l'energie en se deplacant dans le circuit. On l'exprime en volts, et elle est souvent associee a la tension electrique.",
  },
  {
    slug: "tension",
    title: "Tension electrique",
    shortDefinition: "Difference de potentiel qui pousse les charges dans un circuit.",
    definition:
      "La tension electrique correspond a la difference de potentiel entre deux points d'un circuit. Elle represente l'energie fournie par unite de charge et s'exprime en volts. Dans un montage, c'est souvent la source de tension qui provoque la circulation du courant.",
  },
  {
    slug: "courant",
    title: "Courant electrique",
    shortDefinition: "Debit de charges electriques qui traverse un conducteur.",
    definition:
      "Le courant electrique est le deplacement ordonne de charges dans un materiau conducteur. Il se mesure en amperes et indique la quantite de charge qui traverse une section du circuit par unite de temps. Plus le courant est grand, plus le debit de charges est eleve.",
  },
  {
    slug: "intensite",
    title: "Intensite du courant",
    shortDefinition: "Valeur du courant electrique qui circule dans un circuit.",
    definition:
      "L'intensite du courant represente la quantite de charge electrique qui traverse un point du circuit pendant une certaine duree. Elle se note souvent I et se mesure en amperes. Plus l'intensite est grande, plus le courant transporte de charges en peu de temps.",
  },
  {
    slug: "resistance",
    title: "Resistance",
    shortDefinition: "Opposition d'un composant au passage du courant.",
    definition:
      "La resistance exprime la difficulte qu'un materiau ou qu'un composant oppose au passage du courant electrique. Elle se mesure en ohms. Une resistance elevee limite le courant pour une meme tension appliquee, selon la loi d'Ohm.",
  },
  {
    slug: "loi-ohm",
    title: "Loi d'Ohm",
    shortDefinition: "Relation entre tension, courant et resistance dans un circuit.",
    definition:
      "La loi d'Ohm relie la tension, le courant et la resistance par la relation U = R x I. Elle permet de calculer une grandeur manquante si les deux autres sont connues. Cette loi est fondamentale pour analyser des circuits simples en courant continu.",
  },
  {
    slug: "puissance",
    title: "Puissance electrique",
    shortDefinition: "Taux auquel l'energie electrique est transferee ou consommee.",
    definition:
      "La puissance electrique indique la rapidite avec laquelle un composant fournit, transforme ou consomme de l'energie electrique. Elle s'exprime en watts. Dans plusieurs cas, on la calcule avec la relation P = U x I.",
  },
  {
    slug: "circuits-serie-parallele",
    title: "Circuits en serie et en parallele",
    shortDefinition: "Deux manieres de connecter des composantes dans un circuit.",
    definition:
      "Dans un circuit en serie, les composantes sont placees sur une seule trajectoire de courant, donc le meme courant les traverse. Dans un circuit en parallele, les composantes sont branchees sur plusieurs branches, ce qui partage le courant mais maintient la meme tension aux bornes de chaque branche.",
  },
  {
    slug: "lois-kirchhoff",
    title: "Lois de Kirchhoff",
    shortDefinition: "Regles de conservation appliquees aux noeuds et aux mailles.",
    definition:
      "Les lois de Kirchhoff servent a analyser des circuits plus complexes. La loi des noeuds dit que la somme des courants entrant dans un noeud est egale a la somme des courants sortants. La loi des mailles dit que la somme des tensions dans une boucle fermee est nulle.",
  },
  {
    slug: "condensateur",
    title: "Condensateur",
    shortDefinition: "Composant qui emmagasine temporairement de l'energie dans un champ electrique.",
    definition:
      "Le condensateur est un composant capable d'accumuler des charges sur deux armatures separees par un isolant. Il se mesure en farads. Il est souvent utilise pour filtrer, temporiser ou stabiliser des signaux et des tensions dans un circuit.",
  },
];
