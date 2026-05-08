import { Link } from "react-router";
import {
  ArrowRight,
  BarChart3,
  Box,
  CheckCircle2,
  CircuitBoard,
  Layers3,
  MousePointer2,
  Play,
  Save,
  Search,
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
  ["04", "Raccourcis clavier", "R pour résistance, C pour condensateur, et recherche rapide pour rester dans le flux."],
];

export default function Home() {
  return (
    <div className="min-h-svh bg-white text-zinc-950">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link to="/" className="flex items-center gap-3 font-semibold tracking-tight">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-zinc-950 text-xs font-bold text-white">
              EC
            </span>
            ECLab
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium text-zinc-500 md:flex">
            <a href="#features" className="hover:text-zinc-950">Fonctionnalités</a>
            <a href="#preview" className="hover:text-zinc-950">Simulateur</a>
            <a href="#about" className="hover:text-zinc-950">À propos</a>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-full px-4 py-2 text-sm font-medium hover:bg-zinc-100"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Signup
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden px-5 pb-16 pt-24 md:px-8 md:pt-28">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ececec_1px,transparent_1px),linear-gradient(to_bottom,#ececec_1px,transparent_1px)] bg-[size:56px_56px] opacity-70 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_30%,black,transparent_75%)]" />
          <div className="relative mx-auto max-w-7xl text-center">
            <Link
              to="/signup"
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-1.5 pl-1.5 pr-3 text-sm font-medium shadow-sm"
            >
              <span className="rounded-full bg-zinc-950 px-2 py-0.5 text-xs font-semibold text-white">
                Nouveau
              </span>
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
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-6 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-zinc-800"
              >
                Commencer
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#preview"
                className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-6 py-3 text-sm font-medium transition hover:border-zinc-950"
              >
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
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Fonctionnalités
              </p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
                Tout ce qu'il faut pour comprendre un circuit.
              </h2>
              <p className="mt-5 text-lg leading-8 text-zinc-600">
                Des outils précis pour l'étude des circuits en courant continu et alternatif, simples pour les étudiants et utiles pour les projets sérieux.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
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
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Le simulateur
              </p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
                Construit pour penser, pas pour configurer.
              </h2>
              <p className="mt-5 text-lg leading-8 text-zinc-400">
                Une interface qui s'efface: une grille, vos composants, et des résultats immédiats.
              </p>

              <div className="mt-10 space-y-3">
                {showcase.map(([number, title, text], index) => (
                  <div
                    key={title}
                    className={`flex gap-4 rounded-xl border p-5 ${
                      index === 0
                        ? "border-white bg-white text-zinc-950"
                        : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <span className="font-mono text-sm text-zinc-500">{number}</span>
                    <div>
                      <h3 className="font-semibold">{title}</h3>
                      <p className={`mt-1 text-sm leading-6 ${index === 0 ? "text-zinc-600" : "text-zinc-400"}`}>
                        {text}
                      </p>
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
              <div className="relative aspect-[1.22] bg-[radial-gradient(circle_at_1px_1px,#d4d4d4_1px,transparent_0)] bg-[size:24px_24px]">
                <CircuitSvg />
                <div className="absolute bottom-4 right-4 w-48 rounded-xl border border-zinc-200 bg-white p-3 text-zinc-950 shadow-xl">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    V(C1) · transitoire
                  </p>
                  <svg viewBox="0 0 180 60" className="mt-2 h-16 w-full" preserveAspectRatio="none">
                    <line x1="0" y1="14" x2="180" y2="14" stroke="#ececec" />
                    <line x1="0" y1="32" x2="180" y2="32" stroke="#ececec" />
                    <line x1="0" y1="50" x2="180" y2="50" stroke="#ececec" />
                    <path d="M0 55 C30 55, 50 30, 80 18 S 140 6, 180 4" fill="none" stroke="#0a0a0a" strokeWidth="1.6" />
                    <path d="M0 55 C30 55, 50 30, 80 18 S 140 6, 180 4 L180 60 L0 60 Z" fill="rgba(10,10,10,0.05)" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="px-5 py-24 md:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.82fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                À propos
              </p>
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
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                L'équipe
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                Quatre étudiants, une plateforme.
              </h3>
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
            <h2 className="text-4xl font-semibold tracking-tight">
              Prêt à dessiner votre premier circuit?
            </h2>
            <p className="mt-4 text-zinc-400">
              Inscrivez-vous gratuitement. Aucune carte de crédit.
            </p>
            <Link
              to="/signup"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-zinc-950 hover:bg-zinc-100"
            >
              Commencer
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-zinc-500 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-zinc-950 text-xs font-bold text-white">
              EC
            </span>
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
            eclab.app/projects/rc-filter
          </div>
        </div>

        <div className="grid min-h-[520px] lg:grid-cols-[220px_1fr_280px]">
          <aside className="hidden border-r border-zinc-200 bg-zinc-50 p-4 lg:block">
            <p className="px-2 pb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Composants
            </p>
            <div className="space-y-1">
              {components.map((component, index) => (
                <div
                  key={component.label}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                    index === 0 ? "bg-white shadow-sm ring-1 ring-zinc-200" : ""
                  }`}
                >
                  <Zap className="h-4 w-4" />
                  <span>{component.label}</span>
                  <span className="ml-auto font-mono text-xs text-zinc-500">{component.value}</span>
                </div>
              ))}
            </div>
          </aside>

          <div className="relative min-h-[520px] bg-[radial-gradient(circle_at_1px_1px,#d4d4d4_1px,transparent_0)] bg-[size:24px_24px]">
            <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between">
              <div className="flex items-center rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
                {[MousePointer2, CircuitBoard, Search].map((Icon, index) => (
                  <button
                    key={Icon.displayName ?? index}
                    className={`grid h-8 w-8 place-items-center rounded-lg ${
                      index === 0 ? "bg-zinc-950 text-white" : "hover:bg-zinc-100"
                    }`}
                    type="button"
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white shadow-sm"
              >
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Run
              </button>
            </div>
            <CircuitSvg />
          </div>

          <aside className="hidden border-l border-zinc-200 bg-zinc-50 lg:block">
            <div className="border-b border-zinc-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Mesures
              </p>
              <div className="mt-4 grid gap-2">
                {[
                  ["V(out)", "2.84 V"],
                  ["I(R1)", "2.16 mA"],
                  ["P(total)", "10.8 mW"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                    <span className="text-zinc-500">{label}</span>
                    <span className="font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Analyse transitoire
              </p>
              <svg viewBox="0 0 240 120" className="mt-4 h-32 w-full rounded-xl bg-white">
                <line x1="0" y1="30" x2="240" y2="30" stroke="#ececec" />
                <line x1="0" y1="60" x2="240" y2="60" stroke="#ececec" />
                <line x1="0" y1="90" x2="240" y2="90" stroke="#ececec" />
                <path d="M0 106 C36 106, 56 68, 86 45 S150 20, 240 16" fill="none" stroke="#0a0a0a" strokeWidth="2" />
              </svg>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function CircuitSvg() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 540 420" preserveAspectRatio="xMidYMid meet">
      <g stroke="#0a0a0a" strokeLinecap="round" fill="none">
        <g transform="translate(80, 210)">
          <circle r="22" fill="white" strokeWidth="1.4" />
          <text x="-4" y="4" fill="#0a0a0a" fontSize="12" fontFamily="ui-monospace, monospace" stroke="none">+</text>
        </g>
        <path d="M80 188 L80 100 L260 100" strokeWidth="1.6" strokeDasharray="4 6" />
        <g transform="translate(260, 100)">
          <path d="M0 0 L8 0 L14 -7 L26 7 L38 -7 L50 7 L62 -7 L72 0 L80 0" strokeWidth="1.4" />
        </g>
        <path d="M340 100 L460 100 L460 320 L80 320 L80 232" strokeWidth="1.6" strokeDasharray="4 6" />
        <path d="M380 100 L380 180" strokeWidth="1.6" />
        <g transform="translate(380, 200)">
          <path d="M-20 0 L-3 0 M3 0 L20 0" strokeWidth="1.6" />
          <path d="M-3 -12 L-3 12 M3 -12 L3 12" strokeWidth="1.6" />
        </g>
        <path d="M380 220 L380 320" strokeWidth="1.6" />
        <g transform="translate(180, 260) rotate(90)">
          <path d="M0 0 L8 0 L14 -7 L26 7 L38 -7 L50 7 L62 -7 L72 0 L80 0" strokeWidth="1.4" />
        </g>
        <path d="M180 100 L180 260" strokeWidth="1.6" />
        <path d="M180 340 L180 320" strokeWidth="1.6" />
        <g transform="translate(80, 340)">
          <path d="M0 0 L0 14" strokeWidth="1.6" />
          <path d="M-12 14 L12 14 M-8 19 L8 19 M-4 24 L4 24" strokeWidth="1.4" />
        </g>
        <g transform="translate(380, 100)">
          <line x1="0" y1="0" x2="40" y2="-30" strokeWidth="1.6" />
          <rect x="40" y="-50" width="60" height="22" rx="4" fill="white" strokeWidth="1" />
        </g>
      </g>
      <g fill="#0a0a0a" fontFamily="ui-monospace, monospace" fontSize="10">
        <text x="280" y="86">R1 = 1kΩ</text>
        <text x="396" y="200">C1 = 10µF</text>
        <text x="200" y="304">R2 = 2.2kΩ</text>
        <text x="40" y="262">5V</text>
        <text x="428" y="65">2.84 V</text>
        <circle cx="180" cy="100" r="2.8" />
        <circle cx="380" cy="100" r="2.8" />
        <circle cx="180" cy="320" r="2.8" />
        <circle cx="380" cy="320" r="2.8" />
        <circle cx="80" cy="320" r="2.8" />
      </g>
      <rect x="253" y="83" width="94" height="34" rx="3" fill="none" stroke="#0a0a0a" strokeDasharray="4 4" opacity="0.35" />
    </svg>
  );
}
