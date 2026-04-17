import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/electricity-concepts";
import { Button } from "~/components/ui/button";
import { electricityConcepts } from "~/lib/electricity-concepts";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ECLab | Définitions en électricité" },
    {
      name: "description",
      content: "Définitions de concepts d'électricité de niveau cégep.",
    },
  ];
}

export default function ElectricityConcepts() {
  const mainRef = useRef<HTMLElement | null>(null);
  const kirchhoffRef = useRef<HTMLElement | null>(null);
  const [imageHeight, setImageHeight] = useState<number | null>(null);

  useEffect(() => {
    const updateImageHeight = () => {
      if (!mainRef.current || !kirchhoffRef.current) {
        return;
      }

      const mainTop = mainRef.current.getBoundingClientRect().top + window.scrollY;
      const kirchhoffBottom =
        kirchhoffRef.current.getBoundingClientRect().bottom + window.scrollY;

      setImageHeight(Math.max(kirchhoffBottom - mainTop, 420));
    };

    updateImageHeight();

    const resizeObserver = new ResizeObserver(() => updateImageHeight());

    if (mainRef.current) {
      resizeObserver.observe(mainRef.current);
    }

    if (kirchhoffRef.current) {
      resizeObserver.observe(kirchhoffRef.current);
    }

    window.addEventListener("resize", updateImageHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateImageHeight);
    };
  }, []);

  return (
    <div className="bg-muted min-h-svh">
      <div className="relative flex min-h-svh w-full flex-col overflow-hidden border border-zinc-200 bg-white">
        <header className="relative z-10 border-b border-zinc-200 px-5 py-4 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold tracking-tight text-zinc-900">
                ECLab
              </p>
              <p className="text-sm text-zinc-500">
                Concepts d'électricité niveau cégep
              </p>
            </div>
            <Button asChild variant="ghost" className="rounded-full px-5">
              <Link to="/">Retour</Link>
            </Button>
          </div>
        </header>

        <main
          ref={mainRef}
          className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-5 py-10 md:px-8"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 overflow-hidden rounded-r-[3rem]"
            style={{
              width: "min(44%, 32rem)",
              left: "calc((100vw - 100%) / -2)",
              height: imageHeight ?? 520,
            }}
          >
            <div
              className="absolute inset-0 bg-cover bg-left-center opacity-95"
              style={{ backgroundImage: "url('/Kirchoff.jpg')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-white" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white" />
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 overflow-hidden rounded-l-[3rem]"
            style={{
              width: "min(44%, 32rem)",
              right: "calc((100vw - 100%) / -2)",
              top: Math.max((imageHeight ?? 520) / 2, 210),
              height: imageHeight ?? 520,
            }}
          >
            <div
              className="absolute inset-0 bg-cover bg-right-center opacity-95 grayscale"
              style={{ backgroundImage: "url('/Ohm.jpg')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/40 to-white" />
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white" />
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 flex items-center justify-center overflow-hidden rounded-l-[2rem]"
            style={{
              width: "min(44%, 32rem)",
              right: "calc((100vw - 100%) / -2)",
              top: 72,
              height: Math.max(((imageHeight ?? 520) / 2) - 96, 140),
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-l from-black via-black to-transparent" />
            <img
              src="/LOGO.png"
              alt=""
              className="relative h-auto w-[min(14rem,60%)] opacity-90 drop-shadow-[0_18px_30px_rgba(255,255,255,0.08)]"
            />
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 overflow-hidden rounded-r-[3rem]"
            style={{
              width: "min(44%, 32rem)",
              left: "calc((100vw - 100%) / -2)",
              top: Math.max(((imageHeight ?? 520) / 2) + ((imageHeight ?? 520) / 2), 470),
              height: imageHeight ?? 520,
            }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-95 scale-x-[-1]"
              style={{ backgroundImage: "url('/Tesla_circa_1890.jpeg')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-white" />
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white" />
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 overflow-hidden rounded-l-[3rem]"
            style={{
              width: "min(44%, 32rem)",
              right: "calc((100vw - 100%) / -2)",
              top: Math.max((((imageHeight ?? 520) / 2) + ((imageHeight ?? 520) / 2)) + ((imageHeight ?? 520) / 2), 730),
              height: imageHeight ?? 520,
            }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-95"
              style={{ backgroundImage: "url('/albert-einstein.avif')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/40 to-white" />
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white" />
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 overflow-hidden rounded-r-[3rem]"
            style={{
              width: "min(44%, 32rem)",
              left: "calc((100vw - 100%) / -2)",
              top: Math.max(((imageHeight ?? 520) * 2), 990),
              height: imageHeight ?? 520,
            }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-95 grayscale"
              style={{ backgroundImage: "url('/Ampere_portrait.jpg')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-white" />
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white" />
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 overflow-hidden rounded-l-[3rem]"
            style={{
              width: "min(44%, 32rem)",
              right: "calc((100vw - 100%) / -2)",
              top: Math.max(((imageHeight ?? 520) * 2) + ((imageHeight ?? 520) / 2), 1250),
              height: imageHeight ?? 520,
            }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-95 grayscale"
              style={{ backgroundImage: "url('/Alessandro_Volta.jpeg')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/40 to-white" />
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white" />
          </div>

          <section className="relative space-y-4 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-zinc-500">
              Définitions
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 md:text-5xl">
              Notions essentielles en électricité
            </h1>
            <p className="mx-auto max-w-3xl text-base leading-7 text-zinc-600 md:text-lg">
              Cette page rassemble des concepts utiles pour comprendre les bases
              de l'électricité au niveau cégep.
            </p>
          </section>

          <section className="relative grid gap-4 md:grid-cols-2">
            {electricityConcepts.map((concept) => (
              <a
                key={concept.slug}
                href={`#${concept.slug}`}
                ref={concept.slug === "lois-kirchhoff" ? kirchhoffRef : undefined}
                className="rounded-2xl border border-zinc-200 bg-white/88 px-5 py-4 text-left backdrop-blur-sm transition-colors hover:bg-white"
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

          <section className="relative space-y-6">
            {electricityConcepts.map((concept) => (
              <article
                key={concept.slug}
                id={concept.slug}
                className="scroll-mt-24 rounded-3xl border border-zinc-200 bg-white/92 px-6 py-6 backdrop-blur-sm"
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
