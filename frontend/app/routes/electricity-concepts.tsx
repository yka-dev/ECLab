import { Link } from "react-router";
import type { Route } from "./+types/electricity-concepts";
import { Button } from "~/components/ui/button";
import { electricityConcepts } from "~/lib/electricity-concepts";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ECLab | Definitions en electricite" },
    {
      name: "description",
      content: "Definitions de concepts d'electricite de niveau cegep.",
    },
  ];
}

export default function ElectricityConcepts() {
  return (
    <div className="bg-muted min-h-svh">
      <div className="flex min-h-svh w-full flex-col border border-zinc-200 bg-white">
        <header className="border-b border-zinc-200 px-5 py-4 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold tracking-tight text-zinc-900">
                ECLab
              </p>
              <p className="text-sm text-zinc-500">
                Concepts d'electricite niveau cegep
              </p>
            </div>
            <Button asChild variant="ghost" className="rounded-full px-5">
              <Link to="/">Retour</Link>
            </Button>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-5 py-10 md:px-8">
          <section className="space-y-4 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-zinc-500">
              Definitions
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 md:text-5xl">
              Notions essentielles en electricite
            </h1>
            <p className="mx-auto max-w-3xl text-base leading-7 text-zinc-600 md:text-lg">
              Cette page rassemble des concepts utiles pour comprendre les bases
              de l'electricite au niveau cegep.
            </p>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            {electricityConcepts.map((concept) => (
              <a
                key={concept.slug}
                href={`#${concept.slug}`}
                className="rounded-2xl border border-zinc-200 px-5 py-4 text-left transition-colors hover:bg-zinc-50"
              >
                <h2 className="text-lg font-semibold text-zinc-900">
                  {concept.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {concept.shortDefinition}
                </p>
              </a>
            ))}
          </section>

          <section className="space-y-6">
            {electricityConcepts.map((concept) => (
              <article
                key={concept.slug}
                id={concept.slug}
                className="scroll-mt-24 rounded-3xl border border-zinc-200 px-6 py-6"
              >
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
                  {concept.title}
                </p>
                <p className="mt-4 text-base leading-7 text-zinc-700">
                  {concept.definition}
                </p>
              </article>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}
