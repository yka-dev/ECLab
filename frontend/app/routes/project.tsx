import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { ButtonGroup } from "~/components/ui/button-group";
import { PlusIcon } from "lucide-react";
import { FiPlay } from "react-icons/fi";
import { PiCursor, PiHandGrabbing, PiPause, PiPolygon } from "react-icons/pi";
import { LuSettings } from "react-icons/lu";

interface Point {
  id: string;
  x: number; // world coordinates
  y: number; // world coordinates
}

interface Wire {
  id: string;
  startPointId: string;
  endPointId: string | null; // null when in-progress
}

interface Component {
  id: string;
  x: number;
  y: number;
  type: string;
}

// Grid settings
const MINOR_GRID = 10;   // px in world space
const MAJOR_GRID = 50;   // px in world space (5 minor cells)

function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

function snapToGrid(val: number, grid: number): number {
  return Math.round(val / grid) * grid;
}

export default function Project() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // tool selection
  const [tool, setTool] = useState<"cursor" | "hand" | "wires">("cursor");

  // viewport state
  const offsetRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);

  // data state
  const [points, setPoints] = useState<Point[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [components] = useState<Component[]>([]);

  // mouse tracking for in-progress wire
  const mousePosRef = useRef({ x: 0, y: 0 }); // world coords
  const activeWireIdRef = useRef<string | null>(null);

  // pan state
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panStartOffsetRef = useRef({ x: 0, y: 0 });

  // Force redraw trigger
  const [renderTick, setRenderTick] = useState(0);
  const redraw = useCallback(() => setRenderTick(t => t + 1), []);

  // Convert screen → world coordinates
  function screenToWorld(sx: number, sy: number) {
    const scale = scaleRef.current;
    const off = offsetRef.current;
    return {
      x: (sx - off.x) / scale,
      y: (sy - off.y) / scale,
    };
  }

  // Find existing point near world coords (within snap radius)
  function findNearPoint(
    wx: number,
    wy: number,
    pts: Point[],
    radius = MINOR_GRID * 0.6
  ): Point | null {
    for (const p of pts) {
      const dx = p.x - wx;
      const dy = p.y - wy;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) return p;
    }
    return null;
  }

  // ─── Draw ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width;
    const H = canvas.height;
    const scale = scaleRef.current;
    const off = offsetRef.current;

    ctx.clearRect(0, 0, W, H);

    // ── Grid ──────────────────────────────────────────────────────────────
    ctx.save();
    ctx.translate(off.x, off.y);
    ctx.scale(scale, scale);

    // Compute world bounds visible on screen
    const wx0 = -off.x / scale;
    const wy0 = -off.y / scale;
    const wx1 = (W - off.x) / scale;
    const wy1 = (H - off.y) / scale;

    const minorStart = {
      x: Math.floor(wx0 / MINOR_GRID) * MINOR_GRID,
      y: Math.floor(wy0 / MINOR_GRID) * MINOR_GRID,
    };

    // Minor lines
    ctx.beginPath();
    ctx.strokeStyle = "rgba(148,163,184,0.35)";
    ctx.lineWidth = 0.5 / scale;
    for (let x = minorStart.x; x <= wx1; x += MINOR_GRID) {
      if (x % MAJOR_GRID === 0) continue;
      ctx.moveTo(x, wy0);
      ctx.lineTo(x, wy1);
    }
    for (let y = minorStart.y; y <= wy1; y += MINOR_GRID) {
      if (y % MAJOR_GRID === 0) continue;
      ctx.moveTo(wx0, y);
      ctx.lineTo(wx1, y);
    }
    ctx.stroke();

    // Major lines
    const majorStart = {
      x: Math.floor(wx0 / MAJOR_GRID) * MAJOR_GRID,
      y: Math.floor(wy0 / MAJOR_GRID) * MAJOR_GRID,
    };
    ctx.beginPath();
    ctx.strokeStyle = "rgba(100,116,139,0.45)";
    ctx.lineWidth = 0.8 / scale;
    for (let x = majorStart.x; x <= wx1; x += MAJOR_GRID) {
      ctx.moveTo(x, wy0);
      ctx.lineTo(x, wy1);
    }
    for (let y = majorStart.y; y <= wy1; y += MAJOR_GRID) {
      ctx.moveTo(wx0, y);
      ctx.lineTo(wx1, y);
    }
    ctx.stroke();

    // ── Wires ────────────────────────────────────────────────────────────
    const pointMap = new Map(points.map(p => [p.id, p]));

    for (const wire of wires) {
      const start = pointMap.get(wire.startPointId);
      if (!start) continue;

      if (wire.endPointId === null) {
        // Only draw the dotted preview for the single active wire
        if (wire.id !== activeWireIdRef.current) continue;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(59,130,246,0.7)";
        ctx.lineWidth = 1.5 / scale;
        ctx.setLineDash([5 / scale, 4 / scale]);
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(mousePosRef.current.x, mousePosRef.current.y);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        const end = pointMap.get(wire.endPointId);
        if (!end) continue;
        ctx.beginPath();
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1.5 / scale;
        ctx.setLineDash([]);
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
    }

    // ── Points ───────────────────────────────────────────────────────────
    for (const pt of points) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3 / scale, 0, Math.PI * 2);
      ctx.fillStyle = "#1e40af";
      ctx.fill();
      ctx.strokeStyle = "#bfdbfe";
      ctx.lineWidth = 1 / scale;
      ctx.stroke();
    }

    ctx.restore();
  }, [points, wires, renderTick]);

  // ─── Resize canvas ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      redraw();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [redraw]);

  // ─── Wheel zoom ───────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(Math.max(scaleRef.current * delta, 0.2), 8);
      // Zoom toward mouse position
      offsetRef.current = {
        x: mx - (mx - offsetRef.current.x) * (newScale / scaleRef.current),
        y: my - (my - offsetRef.current.y) * (newScale / scaleRef.current),
      };
      scaleRef.current = newScale;
      redraw();
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [redraw]);

  // ─── Mouse events ─────────────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      // Middle mouse or hand tool → start pan
      if (e.button === 1 || (tool === "hand" && e.button === 0)) {
        e.preventDefault();
        isPanningRef.current = true;
        panStartRef.current = { x: sx, y: sy };
        panStartOffsetRef.current = { ...offsetRef.current };
        return;
      }

      if (tool === "wires") {
        if (e.button === 2) {
          // Right click → cancel in-progress wire
          const aid = activeWireIdRef.current;
          if (aid === null) return;

          setWires(prev => {
            const wire = prev.find(w => w.id === aid);
            if (!wire) return prev;
            const startPtId = wire.startPointId;
            const remaining = prev.filter(w => w.id !== aid);
            // Remove start point if not used by any other wire
            const usedElsewhere = remaining.some(
              w => w.startPointId === startPtId || w.endPointId === startPtId
            );
            if (!usedElsewhere) {
              setPoints(pp => pp.filter(p => p.id !== startPtId));
            }
            return remaining;
          });
          activeWireIdRef.current = null;
          redraw();
          return;
        }

        if (e.button !== 0) return;

        const raw = screenToWorld(sx, sy);
        const snapped = {
          x: snapToGrid(raw.x, MINOR_GRID),
          y: snapToGrid(raw.y, MINOR_GRID),
        };

        const activeId = activeWireIdRef.current;

        if (activeId !== null) {
          // Second click → end wire
          setPoints(prev => {
            const existing = findNearPoint(snapped.x, snapped.y, prev);
            let endPtId: string;
            let nextPoints = prev;
            if (existing) {
              endPtId = existing.id;
            } else {
              const newPt: Point = { id: uid("pt"), ...snapped };
              nextPoints = [...prev, newPt];
              endPtId = newPt.id;
            }

            setWires(ww => {
              const updated = ww.map(w =>
                w.id === activeId ? { ...w, endPointId: endPtId } : w
              );
              // Start a new wire from endPtId
              const newWire: Wire = {
                id: uid("wire"),
                startPointId: endPtId,
                endPointId: null,
              };
              activeWireIdRef.current = newWire.id;
              return [...updated, newWire];
            });

            return nextPoints;
          });
        } else {
          // First click → start wire
          setPoints(prev => {
            const existing = findNearPoint(snapped.x, snapped.y, prev);
            let startPtId: string;
            let nextPoints = prev;
            if (existing) {
              startPtId = existing.id;
            } else {
              const newPt: Point = { id: uid("pt"), ...snapped };
              nextPoints = [...prev, newPt];
              startPtId = newPt.id;
            }

            const newWire: Wire = {
              id: uid("wire"),
              startPointId: startPtId,
              endPointId: null,
            };
            activeWireIdRef.current = newWire.id;
            setWires(ww => [...ww, newWire]);
            return nextPoints;
          });
        }
      }
    },
    [tool, redraw]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (isPanningRef.current) {
        const dx = sx - panStartRef.current.x;
        const dy = sy - panStartRef.current.y;
        offsetRef.current = {
          x: panStartOffsetRef.current.x + dx,
          y: panStartOffsetRef.current.y + dy,
        };
        redraw();
        return;
      }

      if (tool === "wires" && activeWireIdRef.current !== null) {
        const raw = screenToWorld(sx, sy);
        mousePosRef.current = {
          x: snapToGrid(raw.x, MINOR_GRID),
          y: snapToGrid(raw.y, MINOR_GRID),
        };
        redraw();
      }
    },
    [tool, redraw]
  );

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || tool === "hand") {
      isPanningRef.current = false;
    }
  }, [tool]);

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
  }, []);

  // Cursor style
  const cursorStyle =
    tool === "hand"
      ? isPanningRef.current
        ? "cursor-grabbing"
        : "cursor-grab"
      : tool === "wires"
      ? "cursor-crosshair"
      : "cursor-default";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full ${cursorStyle}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        aria-hidden="true"
      />

      <aside className="fixed left-6 top-16 bottom-16 w-64 bg-white/80 backdrop-blur-md border border-slate-200 rounded-lg shadow-xl p-4 flex flex-col gap-4 z-40">
        <div>
          <h3 className="text-lg font-semibold">Playground</h3>
          <p className="text-sm text-slate-500">Quick access to tools and components</p>
        </div>

        <ButtonGroup className="flex flex-col gap-2">
          <Button variant="ghost" className="justify-start hover:bg-slate-100/60 hover:scale-105 hover:shadow-sm transition">
            <PlusIcon className="mr-2 h-4 w-4" />
            New Project
          </Button>
          <Button variant="ghost" className="justify-start hover:bg-slate-100/60 hover:scale-105 hover:shadow-sm transition">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Component
          </Button>
          <Button variant="ghost" className="justify-start hover:bg-slate-100/60 hover:scale-105 hover:shadow-sm transition">
            Templates
          </Button>
        </ButtonGroup>

        <div className="mt-auto space-y-1 text-xs text-slate-400">
          <div>Status: Ready</div>
          <div>Points: {points.length} · Wires: {wires.filter(w => w.endPointId !== null).length}</div>
          <div>Scale: {scaleRef.current.toFixed(2)}×</div>
        </div>
      </aside>

      <div className="fixed left-1/2 transform -translate-x-1/2 bottom-6 z-50">
        <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md border border-slate-200 rounded-full px-3 py-2 shadow-lg">

          <div className="relative flex items-center justify-center group">
            <Button
              variant={tool === "cursor" ? "default" : "ghost"}
              aria-pressed={tool === "cursor"}
              onClick={() => setTool("cursor")}
              aria-label="Cursor"
              className={`p-2 transition ${tool === "cursor" ? "bg-slate-100" : "hover:bg-slate-100/60 hover:scale-105 hover:shadow-sm"}`}
            >
              <PiCursor className="h-4 w-4" />
            </Button>
            <span aria-hidden="true" className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-md bg-slate-800 text-white text-xs py-1 px-2 whitespace-nowrap opacity-0 scale-95 transform transition-all duration-150 group-hover:opacity-100 group-hover:scale-100">
              Sélection
            </span>
          </div>

          <div className="relative flex items-center justify-center group">
            <Button
              variant={tool === "hand" ? "default" : "ghost"}
              aria-pressed={tool === "hand"}
              onClick={() => setTool("hand")}
              aria-label="Grab"
              className={`p-2 transition ${tool === "hand" ? "bg-slate-100" : "hover:bg-slate-100/60 hover:scale-105 hover:shadow-sm"}`}
            >
              <PiHandGrabbing className="h-4 w-4" />
            </Button>
            <span aria-hidden="true" className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-md bg-slate-800 text-white text-xs py-1 px-2 whitespace-nowrap opacity-0 scale-95 transform transition-all duration-150 group-hover:opacity-100 group-hover:scale-100">
              Glisser
            </span>
          </div>

          <div className="relative flex items-center justify-center group">
            <Button
              variant={tool === "wires" ? "default" : "ghost"}
              aria-pressed={tool === "wires"}
              onClick={() => setTool("wires")}
              aria-label="Wires"
              className={`p-2 transition ${tool === "wires" ? "bg-slate-100" : "hover:bg-slate-100/60 hover:scale-105 hover:shadow-sm"}`}
            >
              <PiPolygon className="h-4 w-4" />
            </Button>
            <span aria-hidden="true" className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-md bg-slate-800 text-white text-xs py-1 px-2 whitespace-nowrap opacity-0 scale-95 transform transition-all duration-150 group-hover:opacity-100 group-hover:scale-100">
              Fil électrique
            </span>
          </div>

          <div aria-hidden="true" className="mx-2 h-8 w-[1.5px] bg-slate-200/80 rounded-sm bg-gradient-to-b from-slate-300/95 to-slate-400/95 shadow-sm" />

          <Button variant="outline" className="flex items-center gap-2 px-3">
            <FiPlay className="h-4 w-4" />
            Démarrer
          </Button>

          <Button className="flex items-center gap-2 px-3">
            <PiPause className="h-4 w-4" />
            Pause
          </Button>

          <Button variant="ghost" aria-label="Settings" className="p-2 hover:bg-slate-100/60 hover:scale-105 hover:shadow-sm transition">
            <LuSettings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}