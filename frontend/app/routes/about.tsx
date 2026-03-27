import { Link } from "react-router";
import type { Route } from "./+types/about";
import { Button } from "~/components/ui/button";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ECLab | A propos de nous" },
    {
      name: "description",
      content: "Page de presentation de l'equipe ECLab.",
    },
  ];
}

export default function About() {
  return (
    <div className="bg-muted min-h-svh">
      <div className="flex min-h-svh w-full flex-col border border-zinc-200 bg-white">
        <header className="border-b border-zinc-200 px-5 py-4 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <p className="text-lg font-semibold tracking-tight text-zinc-900">
              ECLab
            </p>
            <Button asChild variant="ghost" className="rounded-full px-5">
              <Link to="/">Retour</Link>
            </Button>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-5 py-10 md:px-8">
          <section className="w-full max-w-3xl space-y-6 text-left">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-zinc-500">
              A propos de nous
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 md:text-5xl">
              A propos de nous
            </h1>
            <div className="space-y-4 text-base leading-7 text-zinc-600 md:text-lg">
              <p>
                Nous sommes une equipe de quatre etudiants au cegep travaillant
                dans le cadre de notre projet d'integration. Notre site web a
                ete concu pour faciliter la schematisation de circuits
                electriques tout en fournissant des donnees precises et utiles
                pour leur analyse.
              </p>
              <p>
                Notre objectif est de rendre la comprehension et la conception
                de circuits plus accessibles, intuitives et efficaces, autant
                pour les etudiants que pour toute personne interessee par
                l'electricite.
              </p>
              <p>
                A travers ce projet, nous avons mis en pratique nos
                connaissances en programmation, en electronique et en
                resolution de problemes afin de creer un outil a la fois
                performant et facile a utiliser.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
