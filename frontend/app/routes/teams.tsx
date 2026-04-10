import { Link } from "react-router";
import type { Route } from "./+types/teams";
import { Button } from "~/components/ui/button";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ECLab | Teams" },
    {
      name: "description",
      content: "Page des équipes ECLab.",
    },
  ];
}

export default function Teams() {
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
          <section className="w-full max-w-3xl space-y-6 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-zinc-500">
              Équipes
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 md:text-5xl">
              Les équipes ECLab arriveront bientôt
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-7 text-zinc-600 md:text-lg">
              Cette page servira à afficher toutes les équipes. On pourra y
              ajouter la liste, les détails et la navigation plus tard.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
