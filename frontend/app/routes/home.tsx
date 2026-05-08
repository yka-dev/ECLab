import { Link } from "react-router";
import {
  ArrowRight,
  BarChart3,
  Box,
  CheckCircle2,
  CircuitBoard,
  Layers3,
  Save,
  Zap,
} from "lucide-react";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ECLab | Simulation de circuits électriques" },
    {
      name: "description",
      content:
        "ECLab est une plateforme web pour dessiner, simuler et comprendre les circuits électriques.",
    },
  ];
}

const components = [
  { label: "Résistance", value: "1kΩ" },
  { label: "Condensateur", value: "10µF" },
  { label: "Source DC", value: "5V" },
  { label: "Inductance", value: "100mH" },
  { label: "Diode", value: "1N4148" },
];

const features = [
  {
    title: "Simulation de circuits",
    text: "Schématisez en glissant-déposant. Les tensions, courants et puissances se mettent à jour à chaque modification.",
    icon: CircuitBoard,
  },
  {
    title: "Graphiques interactifs",
    text: "Visualisez les réponses temporelles et fréquentielles, puis lisez les valeurs exactes sur vos courbes.",
    icon: BarChart3,
  },
  {
    title: "Bibliothèque complète",
    text: "Résistances, condensateurs, sources, diodes et modèles utiles pour apprendre sans friction.",
    icon: Layers3,
  },
  {
    title: "Netlist SPICE",
    text: "Exportez vos circuits en netlist standard pour garder une compatibilité avec vos outils avancés.",
    icon: Box,
  },
  {
    title: "Sauvegarde de projets",
    text: "Vos circuits restent accessibles dans votre espace, prêts à être repris en classe ou à la maison.",
    icon: Save,
  },
];

const showcase = [
  ["01", "Grille intelligente", "Snap automatique au pas de grille pour des schémas alignés sans effort."],
  ["02", "Connexions automatiques", "ECLab détecte les jonctions et résout le circuit pendant que vous travaillez."],
  ["03", "Mesures en direct", "Placez des sondes de tension et de courant, puis lisez les valeurs instantanément."],
  ["04", "Raccourcis clavier", "R pour pivoter les pièces, CTRL+Z pour annuler."],
];

export default function Home() {
  return (
    <div className="min-h-svh bg-white text-zinc-950">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link to="/" className="flex items-center">
            <img
              src="/Add a heading-2 1.svg"
              alt="ECLab"
              className="h-14 w-auto"
            />
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium text-zinc-500 md:flex">
            <a href="#features" className="hover:text-zinc-950">Fonctionnalités</a>
            <a href="#preview" className="hover:text-zinc-950">Simulateur</a>
            <a href="#about" className="hover:text-zinc-950">À propos</a>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-full px-4 py-2 text-sm font-medium hover:bg-zinc-100">
              Login
            </Link>
            <Link to="/signup" className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
              Signup
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden px-5 pb-16 pt-24 md:px-8 md:pt-28">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ececec_1px,transparent_1px),linear-gradient(to_bottom,#ececec_1px,transparent_1px)] bg-[size:56px_56px] opacity-70 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_30%,black,transparent_75%)]" />
          <div className="relative mx-auto max-w-7xl text-center">
            <Link to="/signup" className="mb-7 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-1.5 pl-1.5 pr-3 text-sm font-medium shadow-sm">
              <span className="rounded-full bg-zinc-950 px-2 py-0.5 text-xs font-semibold text-white">Nouveau</span>
              Créez votre premier circuit
              <ArrowRight className="h-4 w-4 text-zinc-500" />
            </Link>

            <h1 className="mx-auto max-w-4xl text-balance text-5xl font-bold leading-none tracking-tight text-zinc-950 md:text-7xl lg:text-8xl">
              Simulez vos circuits. <span className="text-zinc-500">Comprenez-les.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-7 text-zinc-600 md:text-lg">
              ECLab réunit dessin de schémas, calculs en direct et visualisation dans une interface web claire, pensée pour apprendre l'électricité.
            </p>

            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link to="/signup" className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-6 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-zinc-800">
                Commencer
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#preview" className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-6 py-3 text-sm font-medium transition hover:border-zinc-950">
                Voir le simulateur
              </a>
            </div>

            <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_0_4px_rgba(34,197,94,0.16)]" />
                Web, sans installation
              </span>
              <span>Projet d'intégration</span>
              <span>Cégep Bois-de-Boulogne</span>
            </div>
          </div>

          <SimulatorPreview />
        </section>

        <section id="features" className="border-t border-zinc-200 px-5 py-24 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Fonctionnalités</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
                Tout ce qu'il faut pour comprendre un circuit.
              </h2>
              <p className="mt-5 text-lg leading-8 text-zinc-600">
                Des outils précis pour l'étude des circuits en courant continu et alternatif, simples pour les étudiants et utiles pour les projets sérieux.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {features.map((feature) => (
                <article key={feature.title} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="mb-8 grid h-12 w-12 place-items-center rounded-lg bg-zinc-100">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-600">{feature.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="preview" className="bg-zinc-950 px-5 py-24 text-white md:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">Le simulateur</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
                Construit pour penser, pas pour configurer.
              </h2>
              <p className="mt-5 text-lg leading-8 text-zinc-400">
                Une interface qui s'efface: une grille, vos composants, et des résultats immédiats.
              </p>

              <div className="mt-10 space-y-3">
                {showcase.map(([number, title, text], index) => (
                  <div key={title} className={`flex gap-4 rounded-xl border p-5 ${index === 0 ? "border-white bg-white text-zinc-950" : "border-white/10 bg-white/[0.03]"}`}>
                    <span className="font-mono text-sm text-zinc-500">{number}</span>
                    <div>
                      <h3 className="font-semibold">{title}</h3>
                      <p className={`mt-1 text-sm leading-6 ${index === 0 ? "text-zinc-600" : "text-zinc-400"}`}>{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
              <div className="flex h-10 items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              </div>
              <img
                src="/the one.png"
                alt="Aperçu du simulateur ECLab"
                className="block h-auto w-full"
              />
            </div>
          </div>
        </section>

        <section id="about" className="px-5 py-24 md:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.82fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">À propos</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
                Un projet étudiant, une ambition réelle.
              </h2>
              <p className="mt-8 text-lg leading-8 text-zinc-700">
                ECLab est né d'un projet d'intégration au <strong>Cégep Bois-de-Boulogne</strong>. Quatre étudiants, une question simple: pourquoi simuler un circuit doit-il être aussi compliqué?
              </p>
              <p className="mt-5 text-lg leading-8 text-zinc-600">
                Notre objectif est de rendre la conception et l'analyse de circuits accessibles aux étudiants comme aux passionnés.
              </p>
              <div className="mt-7 inline-flex items-center gap-3 rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium">
                <CheckCircle2 className="h-5 w-5" />
                Cégep Bois-de-Boulogne · Projet d'intégration
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">L'équipe</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">Quatre étudiants, une plateforme.</h3>
              <p className="mt-3 leading-7 text-zinc-600">
                Programmation, électronique, design et résolution de problèmes: chaque membre a apporté sa pièce du circuit.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {[
                  ["4", "Étudiants"],
                  ["30+", "Composants modélisés"],
                  ["100%", "Web · sans installation"],
                  ["∞", "Circuits possibles"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-xl border border-zinc-200 bg-white p-4">
                    <div className="text-3xl font-semibold tracking-tight">{value}</div>
                    <div className="mt-1 text-sm text-zinc-500">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pb-24 md:px-8">
          <div className="mx-auto max-w-5xl rounded-3xl bg-zinc-950 px-6 py-14 text-center text-white md:px-12">
            <h2 className="text-4xl font-semibold tracking-tight">Prêt à dessiner votre premier circuit?</h2>
            <p className="mt-4 text-zinc-400">Inscrivez-vous gratuitement. Aucune carte de crédit.</p>
            <Link to="/signup" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-zinc-950 hover:bg-zinc-100">
              Commencer
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-zinc-500 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-zinc-950 text-xs font-bold text-white">EC</span>
            <span className="font-semibold text-zinc-950">ECLab</span>
            <span>© 2026 · Cégep Bois-de-Boulogne</span>
          </div>
          <div className="flex flex-wrap gap-5">
            <a href="#features" className="hover:text-zinc-950">Fonctionnalités</a>
            <a href="#preview" className="hover:text-zinc-950">Simulateur</a>
            <a href="#about" className="hover:text-zinc-950">À propos</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SimulatorPreview() {
  return (
    <div className="relative mx-auto mt-16 max-w-7xl px-0 md:px-8">
      <div className="absolute inset-x-0 -top-10 h-40 rounded-full bg-zinc-950/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-zinc-300 bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,0.2)]">
        <div className="flex h-10 items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <div className="ml-4 hidden h-6 w-80 items-center rounded-md border border-zinc-200 bg-white px-3 font-mono text-xs text-zinc-500 md:flex">
            ec-lab-frontend/projects/guest
          </div>
        </div>
        <img
          src="/the one.png"
          alt="Aperçu du simulateur ECLab"
          className="block h-auto w-full"
        />
      </div>
    </div>
  );
}
