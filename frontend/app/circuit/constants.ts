import type { ComponentType, ComponentPropertySchema } from "./types";

export const GRID = 24;
export const ZOOM_MIN = 0.12;
export const ZOOM_MAX = 6;
export const THEME_STORAGE_KEY = "circuit-sandbox-theme";

export const UI = {
  appTitle: "CIRCUIT",
  sandboxTitle: "CIRCUIT SANDBOX",
  toolsHeader: "OUTILS",
  select: "Sélection",
  wire: "Fil",
  passive: "PASSIFS",
  sources: "SOURCES",
  active: "ACTIFS",

  undo: "↩ Annuler",
  redo: "↪ Rétablir",
  gridOff: "⊞ Grille",
  gridOn: "⊞ Grille ✓",
  light: "☀ Clair",
  dark: "◑ Sombre",
  netlistBtn: "∑ Netlist",
  clearBtn: "✕ Effacer",

  tipSelect:
    "Cliquer pour sélectionner · Shift+clic / glisser multi-sélect · R rotation · Suppr · Ctrl+Z/Y annuler/rétablir",
  tipWire:
    "Cliquer pour ajouter un point · Double-clic ou ESC pour terminer · Accrochage aux bornes",
  tipPlace: (t: string) =>
    `Cliquer pour placer ${t} · R rotation · ESC pour annuler`,

  noProps: "Aucune propriété configurable.",
  closed: "Fermé",
  open: "Ouvert",
  rotate: "↻ Rotation 90°",
  deleteComp: "✕ Supprimer",

  netlistTitle: "Netlist",
  warnings: (n: number) => `${n} avertissement${n > 1 ? "s" : ""}`,
  copy: "Copier",
  copied: "✓ Copié",
  nodes: "Nœuds :",
  elements: "Éléments :",
  emptyCircuit: "* Circuit vide",

  emptyHint:
    "Sélectionnez un composant dans la palette\npuis cliquez sur la toile pour le placer",

  graphTitle: "GRAPHIQUES",
  addGraph: "+",
  chooseComp: "Choisir un composant...",
  simulate: "▶ Simuler",
  stop: "■ Arrêter",
  simRunning: "Simulation...",
  noData: "Aucune donnée — lancez la simulation",
  noCompSel: "Sélectionnez un composant",
  dcResult: (v: number) => `Régime continu : ${v.toPrecision(4)} V`,
  simErrPrefix: "Erreur : ",
} as const;

export const PROP_SCHEMAS: Record<ComponentType, ComponentPropertySchema> = {
  resistor: {
    resistance: { label: "Résistance (Ω)", type: "number", default: 1000, min: 0, step: 100 },
  },
  capacitor: {
    capacitance: { label: "Capacité (F)", type: "number", default: 1e-6, min: 0 },
  },
  inductor: {
    inductance: { label: "Inductance (H)", type: "number", default: 1e-3, min: 0 },
  },
  vsource: {
    voltage: { label: "Tension (V)", type: "number", default: 5, step: 0.5 },
  },
  ground: {},
  switch: { closed: { label: "Fermé", type: "boolean", default: false } },
  led: {
    color: { label: "Couleur LED", type: "select", default: "red", options: ["red", "green", "blue", "yellow", "white"] },
    forwardVoltage: { label: "Tension seuil Vf (V)", type: "number", default: 2.0, min: 0, step: 0.1 },
  },
  // ⚠️ TRANSISTOR FICTIF — pas de vraie simulation
  npn_ideal: {
    vbe_on: { label: "Seuil Vbe (V)",   type: "number", default: 0.7, min: 0,   step: 0.05 },
    ron:    { label: "Ron passant (Ω)", type: "number", default: 10,  min: 0.1, step: 1    },
  },
};

export function defaultPropsFromSchema(schema: ComponentPropertySchema): Record<string, unknown> {
  return Object.fromEntries(Object.entries(schema).map(([k, f]) => [k, f.default]));
}

export const colSel = "#2563eb";
export const colHov = "#7c3aed";

export const PALETTE_GROUPS: { label: string; items: ComponentType[] }[] = [
  { label: UI.passive,    items: ["resistor", "capacitor", "inductor"] },
  { label: UI.sources,    items: ["vsource", "ground"] },
  { label: UI.active,     items: ["switch", "led"] },
  { label: "TRANSISTORS", items: ["npn_ideal"] },
];
