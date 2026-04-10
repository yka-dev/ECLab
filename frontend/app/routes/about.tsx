import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/about";
import { Button } from "~/components/ui/button";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ECLab | À propos de nous" },
    {
      name: "description",
      content: "Page de présentation de l'équipe ECLab.",
    },
  ];
}

export default function About() {
  const imageRef = useRef<HTMLDivElement | null>(null);
  const [isImageVisible, setIsImageVisible] = useState(false);

  useEffect(() => {
    const node = imageRef.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsImageVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.35,
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

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

        <main className="flex flex-1 justify-center px-5 py-12 md:px-8 md:py-16">
          <section className="w-full max-w-5xl space-y-8 text-left">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-zinc-500">
              À propos de nous
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-zinc-950 md:text-6xl">
              À propos de nous
            </h1>
            <div className="max-w-3xl space-y-5 text-base leading-8 text-zinc-600 md:text-xl">
              <p>
                Nous sommes une équipe de quatre étudiants au cégep travaillant
                dans le cadre de notre projet d'intégration. Notre site web a
                été conçu pour faciliter la schématisation de circuits
                électriques tout en fournissant des données précises et utiles
                pour leur analyse.
              </p>
              <p>
                Notre objectif est de rendre la compréhension et la conception
                de circuits plus accessibles, intuitives et efficaces, autant
                pour les étudiants que pour toute personne intéressée par
                l'électricité.
              </p>
              <p>
                À travers ce projet, nous avons mis en pratique nos
                connaissances en programmation, en électronique et en
                résolution de problèmes afin de créer un outil à la fois
                performant et facile à utiliser.
              </p>
            </div>

            <div className="pt-20 md:pt-28">
              <div className="mb-6 space-y-3 md:mb-8">
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-zinc-500">
                  Notre parcours
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
                  Notre parcours
                </h2>
              </div>
              <div
                ref={imageRef}
                className={`overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-100 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.35)] transition-all duration-1000 ease-out ${
                  isImageVisible
                    ? "translate-y-0 opacity-100 blur-0"
                    : "translate-y-16 opacity-0 blur-sm"
                }`}
              >
                <img
                  src="/Bois-de-Boulogne.jpg"
                  alt="Campus du Bois-de-Boulogne"
                  className="h-[320px] w-full object-cover md:h-[520px]"
                />
              </div>
              <div className="mt-8 max-w-4xl space-y-5 text-base leading-8 text-zinc-600 md:mt-10 md:text-xl">
                <p>
                  Ce projet n'aurait pas été possible sans l'apport essentiel
                  du Cégep Bois-de-Boulogne. À travers notre formation, nous
                  avons acquis les bases solides en programmation et en
                  électronique qui nous ont permis de donner vie à cette
                  plateforme.
                </p>
                <p>
                  Au-delà des connaissances techniques, le cégep a su stimuler
                  notre curiosité, développer notre rigueur et surtout nourrir
                  notre passion pour la technologie. Les défis rencontrés au
                  fil de notre parcours nous ont poussés à nous dépasser et à
                  travailler en équipe pour trouver des solutions concrètes.
                </p>
                <p>
                  C'est dans cet environnement dynamique et motivant que nous
                  avons pu transformer une idée en un projet réel, combinant
                  créativité, innovation et apprentissage continu.
                </p>
                <p>
                  Nous souhaitons également souligner l'impact important de nos
                  enseignants au Cégep Bois-de-Boulogne. Leur expertise, leur
                  disponibilité et leur engagement ont joué un rôle clé dans
                  notre parcours.
                </p>
                <p>
                  Grâce à leur encadrement, nous avons non seulement appris les
                  concepts essentiels, mais aussi développé une manière de
                  penser plus logique, structurée et orientée vers la
                  résolution de problèmes. Leur passion pour leur domaine s'est
                  transmise à nous et a contribué à renforcer notre motivation.
                </p>
                <p>
                  Toujours présents pour répondre à nos questions et nous
                  guider à travers les défis, ils ont su créer un environnement
                  d'apprentissage stimulant qui nous a permis de progresser et
                  de prendre confiance en nos capacités.
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
