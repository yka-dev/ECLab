import { useCallback, useEffect, useRef, useState } from "react";
import type { AppState, Action, Camera, Vec2, DragState, MoveDrag, BoxDrag, DragBox } from "../types";
import { GRID, ZOOM_MIN, ZOOM_MAX } from "../constants";
import { s2w, snap, snapVec, uid } from "../utils";
import { snapToNearby, hitTest, orthoRoute } from "../geometry";
import { renderCanvas } from "../renderer";
import { COMPONENT_DEFS } from "../componentDefs";

interface Props {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  cam: Camera;
  setCam: React.Dispatch<React.SetStateAction<Camera>>;
  onComponentClick: (compId: string, canvasRelativeScreen: Vec2) => void;
}

export function CircuitCanvas({ state, dispatch, cam, setCam, onComponentClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [dragBox, setDragBox] = useState<DragBox | null>(null);

  const dragRef  = useRef<DragState | null>(null);
  const panRef   = useRef<{ lx: number; ly: number } | null>(null);
  const stateRef = useRef(state);
  const camRef   = useRef(cam);
  stateRef.current = state;
  camRef.current   = cam;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      canvas.getContext("2d")!.scale(dpr, dpr);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas); resize();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderCanvas(ctx, state, cam, hoverId, dragBox);
  });

  const getWorld  = useCallback((e: React.MouseEvent): Vec2 => { const r = canvasRef.current!.getBoundingClientRect(); return s2w(e.clientX - r.left, e.clientY - r.top, camRef.current); }, []);
  const getScreen = useCallback((e: React.MouseEvent): Vec2 => { const r = canvasRef.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }, []);

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const r = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setCam((c) => {
      const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, c.z * f));
      return { x: sx - (sx - c.x) * (z / c.z), y: sy - (sy - c.y) * (z / c.z), z };
    });
  }, [setCam]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const world  = getWorld(e);
    const screen = getScreen(e);
    dispatch({ type: "SET_MOUSE", pos: world });

    if (panRef.current) {
      setCam((c) => ({ ...c, x: c.x + e.clientX - panRef.current!.lx, y: c.y + e.clientY - panRef.current!.ly }));
      panRef.current = { lx: e.clientX, ly: e.clientY };
      return;
    }
    const st = stateRef.current;
    if (st.tool === "place") dispatch({ type: "SET_GHOST", pos: snapToNearby(st.components, st.wires, world) });

    if (dragRef.current?.type === "move") {
      const dr = dragRef.current as MoveDrag;
      const dx = world.x - dr.startWorld.x, dy = world.y - dr.startWorld.y;
      const sdx = snap(dx) - dr.lastDx, sdy = snap(dy) - dr.lastDy;
      if (sdx !== 0 || sdy !== 0) {
        dispatch({ type: "MOVE_SELECTION", dx: sdx, dy: sdy });
        dr.lastDx += sdx; dr.lastDy += sdy;
      }
      return;
    }
    if (dragRef.current?.type === "box") {
      const dr = dragRef.current as BoxDrag;
      setDragBox({ sx: dr.startScreen.x, sy: dr.startScreen.y, ex: screen.x, ey: screen.y });
      const c2 = camRef.current;
      const tl = s2w(Math.min(dr.startScreen.x, screen.x), Math.min(dr.startScreen.y, screen.y), c2);
      const br = s2w(Math.max(dr.startScreen.x, screen.x), Math.max(dr.startScreen.y, screen.y), c2);
      const ids = st.components.filter((c) => c.position.x >= tl.x && c.position.x <= br.x && c.position.y >= tl.y && c.position.y <= br.y).map((c) => c.id);
      dispatch({ type: "SELECT", ids });
      return;
    }
    setHoverId(hitTest(st.components, st.wires, world));
  }, [dispatch, getWorld, getScreen, setCam]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (e.button === 1 || (e.button === 0 && e.altKey)) { panRef.current = { lx: e.clientX, ly: e.clientY }; return; }
    if (e.button !== 0) return;

    const world  = getWorld(e);
    const screen = getScreen(e);
    const st     = stateRef.current;

    if (st.tool === "place" && st.ghostPos && st.placingType) {
      const def = COMPONENT_DEFS[st.placingType];
      dispatch({ type: "ADD_COMPONENT", comp: { id: uid(), type: st.placingType, position: { ...st.ghostPos }, rotation: st.ghostRot, props: JSON.parse(JSON.stringify(def.defaultProps)) } });
      return;
    }

    if (st.tool === "wire") {
      const pt = snapToNearby(st.components, st.wires, world);
      if (e.detail === 2) {
        if (st.wirePoints.length >= 1) {
          const chain = [...st.wirePoints, pt];
          const wirePts: Vec2[] = [];
          for (let i = 0; i < chain.length - 1; i++)
            wirePts.push(...orthoRoute(chain[i], chain[i + 1]).slice(0, -1));
          wirePts.push(chain[chain.length - 1]);
          if (wirePts.length >= 2) dispatch({ type: "ADD_WIRE", wire: { id: uid(), points: wirePts } });
        }
        dispatch({ type: "SET_WIRE_POINTS", pts: [] });
        return;
      }
      dispatch({ type: "SET_WIRE_POINTS", pts: [...st.wirePoints, pt] });
      return;
    }

    if (st.tool === "select") {
      const hit = hitTest(st.components, st.wires, world);
      if (hit) {
        const isComp = st.components.some((c) => c.id === hit);
        if (!e.shiftKey && !st.selection.includes(hit)) dispatch({ type: "SELECT", ids: [hit] });
        else if (e.shiftKey) dispatch({ type: "SELECT", ids: st.selection.includes(hit) ? st.selection.filter((x) => x !== hit) : [...st.selection, hit] });
        if (isComp && !e.shiftKey) onComponentClick(hit, screen);
        dragRef.current = { type: "move", startWorld: world, lastDx: 0, lastDy: 0 };
      } else {
        if (!e.shiftKey) dispatch({ type: "SELECT", ids: [] });
        dragRef.current = { type: "box", startScreen: screen };
      }
    }
  }, [dispatch, getWorld, getScreen, onComponentClick]);

  const onMouseUp = useCallback(() => { panRef.current = null; dragRef.current = null; setDragBox(null); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      const st = stateRef.current;
      if (e.key === "Escape") {
        if (st.tool === "wire") dispatch({ type: "SET_WIRE_POINTS", pts: [] });
        else if (st.tool === "place") dispatch({ type: "SET_TOOL", tool: "select" });
        else dispatch({ type: "SELECT", ids: [] });
        return;
      }
      if (e.key === "r" || e.key === "R") {
        if (st.tool === "place") dispatch({ type: "ROTATE_GHOST" });
        else if (st.selection.length > 0) dispatch({ type: "ROTATE_SELECTED" });
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (st.selection.length > 0) dispatch({ type: "DELETE_SELECTED" }); return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); dispatch({ type: "UNDO" }); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "Y")) { e.preventDefault(); dispatch({ type: "REDO" }); return; }
      if (e.key === "w" || e.key === "W") dispatch({ type: "SET_TOOL", tool: "wire" });
      if (e.key === "s" || e.key === "S") dispatch({ type: "SET_TOOL", tool: "select" });
      if (e.key === "g" || e.key === "G") dispatch({ type: "TOGGLE_GRID" });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch]);

  const cursor = state.tool === "wire" ? "crosshair" : state.tool === "place" ? "none" : "default";

  return (
    <canvas ref={canvasRef} style={{ flex: 1, display: "block", width: "100%", height: "100%", cursor }}
      onMouseMove={onMouseMove} onMouseDown={onMouseDown} onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp} onContextMenu={(e) => e.preventDefault()} />
  );
}
