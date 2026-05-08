import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { createSimulationWorker } from "simulation";
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { getCookie } from "~/lib/utils";
import { useLoaderData } from "react-router";

import type { Vec2, Camera, Component, SimPoint, SimResult, Netlist, AppState } from "../circuit/types";
import { UI } from "../circuit/constants";
import { w2s, uid } from "../circuit/utils";
import { reducer, readPersistedTheme } from "../circuit/state";
import { generateNetlist } from "../circuit/netlist";
import { computeCircuitCurrents } from "../circuit/simulation";

import { Toolbar }            from "../circuit/components/Toolbar";
import { Palette }            from "../circuit/components/Palette";
import { CircuitCanvas }      from "../circuit/components/CircuitCanvas";
import { CurrentOverlay }     from "../circuit/components/CurrentOverlay";
import { ComponentPopover }   from "../circuit/components/ComponentPopover";
import { NetlistModal }       from "../circuit/components/NetlistModal";
import { GraphPanel }         from "../circuit/components/GraphPanel";
import { StatusBar }          from "../circuit/components/StatusBar";

// ── Loader ────────────────────────────────────────────────────────────────────

export async function loader({ request, params }: LoaderFunctionArgs) {
  console.log(params.id);
  if (params.id == undefined || (params.id != "guest" && isNaN(+params.id))) {
    console.log("redirecting due to invalid id");
    return redirect("/projects/guest");
  }

  if (params.id == "guest") {
    return { id: params.id, components: [], wires: [] };
  }

  const cookieHeader = request.headers.get("Cookie");
  const session = getCookie(cookieHeader, "eclab_session_id");
  if (session === null) {
    console.log("redirecting due to invalid session");
    return redirect("/projects/guest");
  }

  const resp = await fetch(
    `${import.meta.env.VITE_API_ENDPOINT}/projects/${params.id}`,
    { method: "GET", headers: request.headers },
  );

  if (!resp.ok) {
    return redirect("/projects/guest");
  }

  const project = await resp.json();
  const circuit = { components: [], wires: [] };

  if (project.circuit !== null) {
    circuit.components = project.circuit.components ?? [];
    circuit.wires = project.circuit.wires ?? [];
  }

  console.log(project);
  console.log(circuit);

  return { id: params.id, components: circuit.components, wires: circuit.wires };
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const loaderData = useLoaderData<typeof loader>();
  const [state, dispatch] = useReducer(reducer, {
    components: loaderData.components ?? [],
    wires: loaderData.wires ?? [],
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
  } as AppState);
  const [cam, setCam] = useState<Camera>({ x: 320, y: 220, z: 1 });

  const [popoverComp,   setPopoverComp]   = useState<Component | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<Vec2 | null>(null);
  const [canvasRect,    setCanvasRect]    = useState<DOMRect | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const [showNetlist, setShowNetlist] = useState(false);

  function exportJson() {
    const data = JSON.stringify({ components: state.components, wires: state.wires }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "circuit.json"; a.click();
    URL.revokeObjectURL(url);
  }

  // simulation
  const workerRef          = useRef<Worker | null>(null);
  const accTimeSeriesRef   = useRef<SimPoint[]>([]);
  const [simResult,    setSimResult]    = useState<SimResult | null>(null);
  const [simNetlist,   setSimNetlist]   = useState<Netlist | null>(null);
  const [simRunning,   setSimRunning]   = useState(false);

  const liveNetlist = useMemo(
    () => generateNetlist({ components: state.components, wires: state.wires }),
    [state.components, state.wires],
  );

  const { wireCurrents, componentCurrents } = useMemo(() => {
    const empty = { wireCurrents: new Map<string, number>(), componentCurrents: new Map<string, number>() };
    if (!simResult || simResult.error) return empty;
    if (liveNetlist.warnings.some(w => w.includes("flottant") || w.includes("masse"))) return empty;
    return computeCircuitCurrents({ components: state.components, wires: state.wires }, liveNetlist, simResult);
  }, [simResult, state.components, state.wires, liveNetlist]);

  const dark  = state.darkMode;
  const empty = state.components.length === 0 && state.wires.length === 0;

  useEffect(() => {
    const worker = createSimulationWorker();
    workerRef.current = worker;
    worker.onmessage = (e) => {
      if (e.data?.error) {
        setSimRunning(false);
        setSimResult({ error: e.data.error, nodeVoltages: {}, sourceCurrents: {} });
        return;
      }
      if (e.data?.type === "chunk") {
        const newPoints: SimPoint[] = e.data.timeSeries ?? [];
        if (newPoints.length > 0) {
          const combined = [...accTimeSeriesRef.current, ...newPoints];
          accTimeSeriesRef.current = combined.length > 2000 ? combined.slice(combined.length - 2000) : combined;
        }
        setSimResult({
          nodeVoltages: e.data.nodeVoltages ?? {},
          sourceCurrents: e.data.sourceCurrents ?? {},
          timeSeries: accTimeSeriesRef.current.length > 0 ? [...accTimeSeriesRef.current] : undefined,
        });
      }
    };
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    if (!simRunning) return;
    const netlist = generateNetlist({ components: state.components, wires: state.wires });
    workerRef.current?.postMessage({ type: "updateNetlist", netlist: netlist.components });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.components, state.wires]);

  const handleSimulate = useCallback(() => {
    const netlist = generateNetlist({ components: state.components, wires: state.wires });
    if (netlist.components.length === 0) {
      setSimResult({ error: "Circuit vide", nodeVoltages: {}, sourceCurrents: {} });
      return;
    }
    if (netlist.warnings.some(w => w.includes("masse"))) {
      setSimResult({ error: "Aucun nœud de masse (GND) — ajoutez un composant Masse.", nodeVoltages: {}, sourceCurrents: {} });
      return;
    }
    if (netlist.warnings.some(w => w.includes("flottant"))) {
      setSimResult({ error: "Circuit ouvert — connectez tous les nœuds avant de simuler.", nodeVoltages: {}, sourceCurrents: {} });
      return;
    }
    setSimNetlist(netlist);
    accTimeSeriesRef.current = [];
    setSimResult(null);
    setSimRunning(true);
    workerRef.current?.postMessage({ type: "simulate", netlist: netlist.components });
  }, [state.components, state.wires]);

  const handleStop = useCallback(() => {
    workerRef.current?.postMessage({ type: "stop" });
    setSimRunning(false);
  }, []);

  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCanvasRect(el.getBoundingClientRect()));
    ro.observe(el);
    setCanvasRect(el.getBoundingClientRect());
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (state.selection.length === 1) {
      const comp = state.components.find((c) => c.id === state.selection[0]);
      if (comp) {
        setPopoverComp(comp);
        setPopoverAnchor(w2s(comp.position.x, comp.position.y, cam));
        return;
      }
    }
    setPopoverComp(null);
    setPopoverAnchor(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selection]);

  useEffect(() => {
    if (!popoverComp) return;
    const live = state.components.find((c) => c.id === popoverComp.id);
    if (live) {
      setPopoverComp(live);
      setPopoverAnchor(w2s(live.position.x, live.position.y, cam));
    } else {
      setPopoverComp(null);
      setPopoverAnchor(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cam, state.components]);

  useEffect(() => {
    console.log("updating");
    if (loaderData.id != "guest") {
      fetch(`/api/projects/circuit/${loaderData.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ circuit: { components: state.components, wires: state.wires } }),
      });
    }
  }, [state.components, state.wires]);

  const handleComponentClick = useCallback((_id: string, screen: Vec2) => {
    setPopoverAnchor(screen);
  }, []);

  return (
    <div
      style={{
        display: "flex", flexDirection: "column",
        height: "100vh", width: "100vw",
        fontFamily: "'JetBrains Mono','Fira Code',monospace",
        overflow: "hidden",
        background: dark ? "#0a0c14" : "#ffffff",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-thumb { background:${dark ? "#1e293b" : "#d1d5db"}; border-radius:3px; }
        button:hover { opacity:.82; }
        input[type=number] { -moz-appearance:textfield; }
        input[type=number]::-webkit-inner-spin-button { opacity:.5; }
        select option { background:${dark ? "#0e1120" : "#ffffff"}; }
        [data-radix-popper-content-wrapper] { z-index:1000 !important; }
      `}</style>

      <Toolbar
        state={state}
        dispatch={dispatch}
        cam={cam}
        onShowNetlist={() => setShowNetlist(true)}
        onExportJson={exportJson}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Palette state={state} dispatch={dispatch} />

        <div ref={canvasWrapRef} style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <CircuitCanvas
            state={state}
            dispatch={dispatch}
            cam={cam}
            setCam={setCam}
            onComponentClick={handleComponentClick}
          />
          <CurrentOverlay
            wires={state.wires}
            components={state.components}
            wireCurrents={wireCurrents}
            componentCurrents={componentCurrents}
            cam={cam}
            active={simRunning}
          />

          {empty && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
              <div style={{ fontSize: 11, color: dark ? "#2a3050" : "#9ca3af", fontFamily: "monospace", lineHeight: 2.2, marginTop: 8 }}>
                {UI.emptyHint.split("\n").map((l, i) => (
                  <span key={i}>{l}<br /></span>
                ))}
              </div>
            </div>
          )}

          <ComponentPopover
            comp={popoverComp}
            anchorScreen={popoverAnchor}
            canvasRect={canvasRect}
            dark={dark}
            dispatch={dispatch}
          />
        </div>
      </div>

      <GraphPanel
        liveNetlist={liveNetlist}
        simNetlist={simNetlist}
        simResult={simResult}
        simRunning={simRunning}
        dark={dark}
        onSimulate={handleSimulate}
        onStop={handleStop}
      />

      <StatusBar state={state} />

      {showNetlist && (
        <NetlistModal
          circuit={{ components: state.components, wires: state.wires }}
          dark={dark}
          onClose={() => setShowNetlist(false)}
        />
      )}
    </div>
  );
}
