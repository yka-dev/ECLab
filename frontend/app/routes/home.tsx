import { Link } from "react-router";
import { useEffect } from "react";
import type { Route } from "./+types/home";
import { Button } from "~/components/ui/button";
import { createSimulationWorker } from "simulation";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ECLab | Home" },
    {
      name: "description",
      content: "Accueil ECLab pour se connecter et gérer ses projets.",
    },
  ];
}

export default function Home() {
   useEffect(() => {
    const worker = createSimulationWorker();

    worker.onmessage = (event) => {
      console.log("result from worker:", event.data);
    };

    worker.onerror = (error) => {
      console.error("worker error:", error);
    };

    worker.postMessage({ type: "runTest" });

    return () => {
      worker.terminate();
    };
  }, []);
  return (
    <div className="bg-muted min-h-svh">
      <div className="flex min-h-svh w-full flex-col border border-zinc-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <header className="border-b border-zinc-200 px-5 py-4 md:px-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
            <div className="text-center md:text-left">
              <p className="text-lg font-semibold tracking-tight text-zinc-900">
                ECLab
              </p>
            </div>

            <div />

            <div className="flex items-center justify-center gap-2 md:justify-end">
              <Button asChild variant="ghost" className="rounded-full px-5">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild className="rounded-full px-5">
                <Link to="/signup">Signup</Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-between px-5 py-8 md:px-8 md:py-10">
          <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center text-center">
            <div className="space-y-5">
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-zinc-500">
                Plateforme de projets
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 md:text-5xl">
                Gérez vos projets ECLab dans un espace clair et simple.
              </h1>
              <p className="mx-auto max-w-2xl text-base leading-7 text-zinc-600 md:text-lg">
                Inscrivez-vous pour commencer à créer vos projets.
              </p>
              <div className="flex justify-center">
                <Button asChild size="lg" className="rounded-full px-8">
                  <Link to="/signup">Commencer</Link>
                </Button>
              </div>
            </div>

          </section>

        </main>
      </div>
    </div>
  );
}
