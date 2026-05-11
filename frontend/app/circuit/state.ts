import type { AppState, Action, HistoryEntry, Rotation } from "./types";
import { THEME_STORAGE_KEY } from "./constants";

export function readPersistedTheme(): boolean {
  // Recupere le theme sauvegarde, si le navigateur le permet.
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "dark") return true;
    if (v === "light") return false;
  } catch {}
  return false;
}

// Etat de depart de l'editeur.
export const initialState: AppState = {
  components: [],
  wires: [],
  selection: [],
  tool: "select",
  placingType: null,
  wirePoints: [],
  mouseWorld: { x: 0, y: 0 },
  ghostPos: null,
  ghostRot: 0,
  showGrid: true,
  darkMode: readPersistedTheme(),
  history: [{ components: [], wires: [] }],
  historyIdx: 0,
};

function cloneCircuit(s: AppState) {
  // Copie le circuit pour eviter de modifier l'historique.
  return {
    components: JSON.parse(JSON.stringify(s.components)),
    wires: JSON.parse(JSON.stringify(s.wires)),
  };
}
function cloneEntry(e: HistoryEntry) {
  // Copie une entree d'historique avant de la restaurer.
  return {
    components: JSON.parse(JSON.stringify(e.components)),
    wires: JSON.parse(JSON.stringify(e.wires)),
  };
}
function pushHistory(state: AppState): AppState {
  // Ajoute une nouvelle version du circuit dans undo redo.
  const entry = cloneCircuit(state);
  const history = [...state.history.slice(0, state.historyIdx + 1), entry];
  if (history.length > 80) history.shift();
  return { ...state, history, historyIdx: history.length - 1 };
}

export function reducer(state: AppState, action: Action): AppState {
  // Centralise toutes les modifications de l'etat.
  switch (action.type) {
    case "SET_TOOL":
      return { ...state, tool: action.tool, placingType: action.placingType ?? null, wirePoints: [], selection: [], ghostPos: null };
    case "SET_MOUSE":
      return { ...state, mouseWorld: action.pos };
    case "SET_GHOST":
      return { ...state, ghostPos: action.pos, ghostRot: action.rot ?? state.ghostRot };
    case "ROTATE_GHOST":
      return { ...state, ghostRot: ((state.ghostRot + 90) % 360) as Rotation };
    case "ADD_COMPONENT":
      return pushHistory({ ...state, components: [...state.components, action.comp] });
    case "ADD_WIRE":
      return pushHistory({ ...state, wires: [...state.wires, action.wire] });
    case "SET_WIRE_POINTS":
      return { ...state, wirePoints: action.pts };
    case "DELETE_SELECTED": {
      const ids = new Set(state.selection);
      return pushHistory({ ...state, components: state.components.filter((c) => !ids.has(c.id)), wires: state.wires.filter((w) => !ids.has(w.id)), selection: [] });
    }
    case "SELECT":
      return { ...state, selection: action.ids };
    case "MOVE_SELECTION": {
      const ids = new Set(state.selection);
      return {
        ...state,
        components: state.components.map((c) =>
          ids.has(c.id) ? { ...c, position: { x: c.position.x + action.dx, y: c.position.y + action.dy } } : c,
        ),
        wires: state.wires.map((w) =>
          ids.has(w.id) ? { ...w, points: w.points.map((p) => ({ x: p.x + action.dx, y: p.y + action.dy })) } : w,
        ),
      };
    }
    case "ROTATE_SELECTED": {
      const ids = new Set(state.selection);
      return pushHistory({ ...state, components: state.components.map((c) => ids.has(c.id) ? { ...c, rotation: ((c.rotation + 90) % 360) as Rotation } : c) });
    }
    case "UPDATE_PROP":
      return pushHistory({ ...state, components: state.components.map((c) => c.id === action.id ? { ...c, props: { ...c.props, [action.key]: action.value } } : c) });
    case "UNDO": {
      if (state.historyIdx <= 0) return state;
      const idx = state.historyIdx - 1;
      return { ...state, historyIdx: idx, ...cloneEntry(state.history[idx]), selection: [] };
    }
    case "REDO": {
      if (state.historyIdx >= state.history.length - 1) return state;
      const idx = state.historyIdx + 1;
      return { ...state, historyIdx: idx, ...cloneEntry(state.history[idx]), selection: [] };
    }
    case "LOAD":
      return pushHistory({ ...state, components: action.components, wires: action.wires, selection: [], wirePoints: [] });
    case "TOGGLE_GRID":
      return { ...state, showGrid: !state.showGrid };
    case "TOGGLE_DARK": {
      const next = !state.darkMode;
      try { localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light"); } catch {}
      return { ...state, darkMode: next };
    }
    default:
      return state;
  }
}
