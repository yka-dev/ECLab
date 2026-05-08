// ─── Shared types for the circuit editor ─────────────────────────────────────

export interface Vec2 { x: number; y: number; }
export interface Terminal { x: number; y: number; }

export type ComponentType =
  | "resistor" | "capacitor" | "inductor" | "vsource"
  | "ground" | "switch" | "led" | "npn_ideal";

export type Rotation = 0 | 90 | 180 | 270;

export interface Component {
  id: string;
  type: ComponentType;
  position: Vec2;
  rotation: Rotation;
  props: Record<string, unknown>;
}

export interface Wire { id: string; points: Vec2[]; }
export interface Circuit { components: Component[]; wires: Wire[]; }

export interface SimPoint {
  time: number;
  nodeVoltages: Record<string, number>;
  sourceCurrents: Record<string, number>;
}

export interface SimResult {
  nodeVoltages: Record<string, number>;
  sourceCurrents: Record<string, number>;
  timeSeries?: SimPoint[];
  error?: string;
}

export interface GraphConfig {
  id: string;
  componentName: string | null;
  metric: "tension" | "courant";
}

export type PropFieldType = "number" | "boolean" | "select";
interface PropFieldBase { label: string; type: PropFieldType; default: unknown; }
export interface NumberField extends PropFieldBase { type: "number"; default: number; min?: number; step?: number; }
export interface BoolField   extends PropFieldBase { type: "boolean"; default: boolean; }
export interface SelectField extends PropFieldBase { type: "select"; default: string; options: string[]; }
export type PropField = NumberField | BoolField | SelectField;
export type ComponentPropertySchema = Record<string, PropField>;

export interface NumberPropDef { key: string; label: string; type: "number"; min?: number; step?: number; }
export interface BoolPropDef   { key: string; label: string; type: "boolean"; }
export interface SelectPropDef { key: string; label: string; type: "select"; options: string[]; }
export type PropDef = NumberPropDef | BoolPropDef | SelectPropDef;

export interface ComponentDef {
  label: string;
  symbol: string;
  color: string;
  terminals: Terminal[];
  defaultProps: Record<string, unknown>;
  propDefs: PropDef[];
  draw: (ctx: CanvasRenderingContext2D, comp: Component, selected: boolean, hovered: boolean) => void;
}

export interface Camera { x: number; y: number; z: number; }

export interface DragBox { sx: number; sy: number; ex: number; ey: number; }

export type ToolMode = "select" | "wire" | "place";
export interface HistoryEntry { components: Component[]; wires: Wire[]; }

export interface AppState {
  components: Component[];
  wires: Wire[];
  selection: string[];
  tool: ToolMode;
  placingType: ComponentType | null;
  wirePoints: Vec2[];
  mouseWorld: Vec2;
  ghostPos: Vec2 | null;
  ghostRot: Rotation;
  showGrid: boolean;
  darkMode: boolean;
  history: HistoryEntry[];
  historyIdx: number;
}

export type Action =
  | { type: "SET_TOOL"; tool: ToolMode; placingType?: ComponentType | null }
  | { type: "SET_MOUSE"; pos: Vec2 }
  | { type: "SET_GHOST"; pos: Vec2; rot?: Rotation }
  | { type: "ROTATE_GHOST" }
  | { type: "ADD_COMPONENT"; comp: Component }
  | { type: "ADD_WIRE"; wire: Wire }
  | { type: "SET_WIRE_POINTS"; pts: Vec2[] }
  | { type: "DELETE_SELECTED" }
  | { type: "SELECT"; ids: string[] }
  | { type: "MOVE_SELECTION"; dx: number; dy: number }
  | { type: "ROTATE_SELECTED" }
  | { type: "UPDATE_PROP"; id: string; key: string; value: unknown }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "LOAD"; components: Component[]; wires: Wire[] }
  | { type: "TOGGLE_GRID" }
  | { type: "TOGGLE_DARK" };

export interface MoveDrag { type: "move"; startWorld: Vec2; lastDx: number; lastDy: number; }
export interface BoxDrag  { type: "box"; startScreen: Vec2; }
export type DragState = MoveDrag | BoxDrag;

export interface CircuitCurrents {
  wireCurrents: Map<string, number>;
  componentCurrents: Map<string, number>;
}

export interface ExampleCircuit { label: string; circuit: Circuit; }

// NetlistComponent and Netlist are exported from netlist.ts
