import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { FiPlay } from "react-icons/fi";
import { PiCursor, PiHandGrabbing, PiPause, PiPolygon } from "react-icons/pi";
import { LuSettings } from "react-icons/lu";

// ─────────────────────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Point {
  id: string;
  x: number; // world coords
  y: number;
}

interface Wire {
  id: string;
  startPointId: string;
  endPointId: string | null;
}

interface Component {
  id: string;
  x: number;          // world coords — exact projection on wire, no grid-snap
  y: number;
  type: string;
  angle: number;      // radians: 0 = horizontal, PI/2 = vertical
  isOn: boolean;      // toggle state
  pinAId?: string;
  pinBId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const MINOR_GRID = 10;
const MAJOR_GRID = 50;

// ── Normalized icon space ──────────────────────────────────────────────────
//
//  The interrupteur icon is defined on a [-100, +100] world-unit axis.
//  Everything below is in those normalized units; the canvas transform
//  (translate + scale + rotate) converts them to screen pixels automatically.
//
//  COMP_HALF = 35 world-px at zoom=1  (tune freely)
const COMP_HALF = 35; // half-span of icon in world units

// ── Fixed-stroke minimum ──────────────────────────────────────────────────
//  Lines must never be thinner than MIN_STROKE_PX screen pixels.
const MIN_STROKE_PX = 1.5;

// ─────────────────────────────────────────────────────────────────────────────
//  TASK 1 — `getScaledIcon(zoomLevel)`
//
//  Returns the parameters needed to draw the icon at the given zoom level.
//  The icon is always drawn in world space (ctx already has the world
//  transform applied), so `worldHalf` is constant.  Only the stroke weight
//  needs to compensate for zoom.
//
//  "Fixed-Stroke": lineWidth = max(MIN_STROKE_PX / zoomLevel, MIN_STROKE_PX / zoomLevel)
//  In world units that means:  lineWidth = MIN_STROKE_PX / zoomLevel
//  which equals MIN_STROKE_PX screen pixels at every zoom level, but never
//  shrinks below that floor.
// ─────────────────────────────────────────────────────────────────────────────
function getScaledIcon(zoomLevel: number) {
  const worldHalf = COMP_HALF;

  // Keep stroke readable but allow slight scaling
  const strokeWidth = Math.max(1 / zoomLevel, 0.8);

  // Let dots scale naturally (NO forced constant size)
  const dotRadius = 2.2 / zoomLevel;

  // Perfect symmetry around center
  const pivotOffset = worldHalf * 0.5;

  // Make lever reach the other side cleanly
  const armLength = worldHalf;

  return { worldHalf, strokeWidth, dotRadius, pivotOffset, armLength };
}

// ─────────────────────────────────────────────────────────────────────────────
//  TASK 3 — `drawInterrupteurSymbol(ctx, scale, isOn)`
//
//  Draws the IEC schematic switch symbol centred at (0, 0) in local space.
//  The canvas transform (translate to world pos + rotate to wire angle) must
//  already be applied by the caller.
//
//  ON  state: lever bridges the two terminals (horizontal, closed)
//  OFF state: lever is at −45° (open, classic schematic)
// ─────────────────────────────────────────────────────────────────────────────
function drawInterrupteurSymbol(
  ctx: CanvasRenderingContext2D,
  scale: number,
  isOn: boolean
) {
  const { worldHalf, strokeWidth, dotRadius, pivotOffset, armLength } =
    getScaledIcon(scale);

  ctx.save();
  ctx.strokeStyle = isOn ? "#1d4ed8" : "#1e293b";
  ctx.fillStyle   = ctx.strokeStyle;
  ctx.lineCap     = "round";
  ctx.lineJoin    = "round";
  ctx.lineWidth   = strokeWidth;

  // ── FULL LINE (wire axis reference)
  ctx.beginPath();
  ctx.moveTo(-worldHalf, 0);
  ctx.lineTo(worldHalf, 0);
  ctx.stroke();

  // ── Left pivot
  ctx.beginPath();
  ctx.arc(-pivotOffset, 0, dotRadius, 0, Math.PI * 2);
  ctx.fill();

  // ── Right pivot
  ctx.beginPath();
  ctx.arc(pivotOffset, 0, dotRadius, 0, Math.PI * 2);
  ctx.fill();

  // ── Lever
  const leverAngle = isOn ? 0 : -Math.PI / 4;

  const tipX = -pivotOffset + Math.cos(leverAngle) * armLength;
  const tipY = Math.sin(leverAngle) * armLength;

  ctx.beginPath();
  ctx.moveTo(-pivotOffset, 0);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
//  TASK 2 — `snapAndOrient(drop, wire)`
//
//  Given a drop point and a wire segment, returns:
//    • snapX / snapY  — the exact projection of the drop onto the segment
//    • angle          — the wire's orientation angle in [0, π)
//    • isVertical     — true when |x1−x2| < |y1−y2|
//
//  Uses the distance-to-segment formula (works for ALL orientations):
//
//    t   = clamp( dot(AP, AB) / dot(AB,AB), 0, 1 )
//    proj = A + t·AB
//    dist = |P − proj|
//
//  For a vertical wire: AB = (0, dy), dot(AP,AB) = dy*(py−ay),
//  dot(AB,AB) = dy² → t = (py−ay)/dy  — clean, no NaN.
//
//  If the wire is vertical the component's angle is set to PI/2 so the symbol
//  is rotated 90° and its pin axis aligns with the vertical wire.
//  The snap X is forced to exactly the wire's X to eliminate the "jump" artefact.
// ─────────────────────────────────────────────────────────────────────────────
function snapAndOrient(
  dropX: number,
  dropY: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { snapX: number; snapY: number; angle: number; isVertical: boolean; dist: number } {
  const abx = x2 - x1, aby = y2 - y1;
  const len2 = abx * abx + aby * aby;

  // Zero-length segment guard
  if (len2 === 0) {
    return { snapX: x1, snapY: y1, angle: 0, isVertical: false, dist: Math.hypot(dropX - x1, dropY - y1) };
  }

  // Clamped projection parameter
  const t = Math.max(0, Math.min(1, ((dropX - x1) * abx + (dropY - y1) * aby) / len2));

  // Projected point (exact, no grid-snap)
  const projX = x1 + t * abx;
  const projY = y1 + t * aby;
  const dist  = Math.hypot(dropX - projX, dropY - projY);

  // Orientation: vertical when the wire runs more up/down than left/right
  const isVertical = Math.abs(x1 - x2) < Math.abs(y1 - y2);

  // Angle in [0, π) — drives ctx.rotate()
  const rawAngle = Math.atan2(aby, abx);
  const angle    = ((rawAngle % Math.PI) + Math.PI) % Math.PI;

  return {
    // Force the snap-X onto the wire's x-coordinate when vertical to eliminate drift
    snapX: isVertical ? x1 : projX,
    snapY: projY,
    angle,
    isVertical,
    dist,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Misc helpers
// ─────────────────────────────────────────────────────────────────────────────

function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

function snapToGrid(val: number, grid: number): number {
  return Math.round(val / grid) * grid;
}

function drawFallbackSymbol(
  ctx: CanvasRenderingContext2D,
  type: string,
  size: number,
  scale: number
) {
  const icons: Record<string, string> = { resistance: "Ω", batterie: "🔋", led: "💡" };
  const icon = icons[type] ?? "?";
  ctx.save();
  ctx.font = `${size * 1.1}px system-ui, "Segoe UI Emoji", serif`;
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle    = "#0f172a";
  ctx.fillText(icon, 0, 0);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function Project() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderTick, setRenderTick] = useState(0);
  const redraw = useCallback(() => setRenderTick(t => t + 1), []);

  const [tool, setTool] = useState<"cursor" | "hand" | "wires">("cursor");

  const offsetRef = useRef({ x: 0, y: 0 });
  const scaleRef  = useRef(1);

  const [points,     setPoints]     = useState<Point[]>([]);
  const [wires,      setWires]      = useState<Wire[]>([]);
  const [components, setComponents] = useState<Component[]>([]);

  const mousePosRef       = useRef({ x: 0, y: 0 });
  const activeWireIdRef   = useRef<string | null>(null);
  const isPanningRef      = useRef(false);
  const panStartRef       = useRef({ x: 0, y: 0 });
  const panStartOffsetRef = useRef({ x: 0, y: 0 });

  // ── Coordinate helpers ──────────────────────────────────────────────────

  function screenToWorld(sx: number, sy: number) {
    const s = scaleRef.current, o = offsetRef.current;
    return { x: (sx - o.x) / s, y: (sy - o.y) / s };
  }

  function findNearPoint(wx: number, wy: number, pts: Point[], radius = MINOR_GRID * 0.6): Point | null {
    for (const p of pts) {
      if (Math.hypot(p.x - wx, p.y - wy) <= radius) return p;
    }
    return null;
  }

  // ── onDropComponent ──────────────────────────────────────────────────────
  //
  //  Implements TASK 2 end-to-end:
  //  1. Finds the nearest finished wire using snapAndOrient()
  //  2. Detects horizontal vs vertical
  //  3. Snaps component centre precisely onto the wire
  //  4. Lays pins along the wire unit vector (not always horizontally)
  //  5. Splits the host wire into two segments around the component pins
  // ────────────────────────────────────────────────────────────────────────

  function onDropComponent(type: string, dropX: number, dropY: number): boolean {
    const THRESHOLD = 14; // world-px — generous hit area

    const pointMap = new Map(points.map(p => [p.id, p]));

    let bestWire: Wire | null = null;
    let bestSnap: ReturnType<typeof snapAndOrient> | null = null;

    for (const w of wires) {
      if (w.endPointId === null) continue;
      const a = pointMap.get(w.startPointId);
      const b = pointMap.get(w.endPointId);
      if (!a || !b) continue;

      const snap = snapAndOrient(dropX, dropY, a.x, a.y, b.x, b.y);
      if (!bestSnap || snap.dist < bestSnap.dist) {
        bestWire = w;
        bestSnap = snap;
      }
    }

    if (!bestWire || !bestSnap || bestSnap.dist > THRESHOLD) return false;

    const cx = bestSnap.snapX;
    const cy = bestSnap.snapY;

    // Unit vector along the wire
    const startPt = pointMap.get(bestWire.startPointId)!;
    const endPt   = pointMap.get(bestWire.endPointId!)!;
    const wLen    = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y) || 1;
    const ux      = (endPt.x - startPt.x) / wLen;
    const uy      = (endPt.y - startPt.y) / wLen;

    // Pin gap along the wire unit vector
    const GAP = COMP_HALF * 0.55;
    const paX = cx - ux * GAP,  paY = cy - uy * GAP;
    const pbX = cx + ux * GAP,  pbY = cy + uy * GAP;

    const existingA = findNearPoint(paX, paY, points, MINOR_GRID * 0.8);
    const existingB = findNearPoint(pbX, pbY, points, MINOR_GRID * 0.8);
    const ptA: Point = existingA ?? { id: uid("pt"), x: paX, y: paY };
    const ptB: Point = existingB ?? { id: uid("pt"), x: pbX, y: pbY };

    setPoints(prev => {
      const list = [...prev];
      if (!existingA) list.push(ptA);
      if (!existingB) list.push(ptB);
      return list;
    });

    const capturedWire = bestWire;
    setWires(prev => {
      const rest = prev.filter(w => w.id !== capturedWire.id);
      return [
        ...rest,
        { id: uid("wire"), startPointId: capturedWire.startPointId, endPointId: ptA.id },
        { id: uid("wire"), startPointId: ptB.id, endPointId: capturedWire.endPointId as string },
      ];
    });

    setComponents(prev => [
      ...prev,
      {
        id:     uid("cmp"),
        x:      cx,
        y:      cy,
        type,
        angle:  bestSnap!.angle,
        isOn:   false,
        pinAId: ptA.id,
        pinBId: ptB.id,
      },
    ]);

    redraw();
    return true;
  }

  // ── Toggle switch on cursor click ───────────────────────────────────────

  function tryToggleComponent(sx: number, sy: number) {
    const world = screenToWorld(sx, sy);
    const scale = scaleRef.current;
    const HIT   = COMP_HALF / scale * 1.2; // screen-space hit radius

    setComponents(prev =>
      prev.map(cmp => {
        const dx = (cmp.x * scale + offsetRef.current.x) - sx;
        const dy = (cmp.y * scale + offsetRef.current.y) - sy;
        if (Math.hypot(dx, dy) < HIT * scale) {
          return { ...cmp, isOn: !cmp.isOn };
        }
        return cmp;
      })
    );
    redraw();
  }

  // ─── Draw ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx   = canvas.getContext("2d")!;
    const W     = canvas.width, H = canvas.height;
    const scale = scaleRef.current;
    const off   = offsetRef.current;

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(off.x, off.y);
    ctx.scale(scale, scale);

    // ── Grid ──────────────────────────────────────────────────────────────
    {
      const wx0 = -off.x / scale, wy0 = -off.y / scale;
      const wx1 = (W - off.x) / scale, wy1 = (H - off.y) / scale;

      ctx.beginPath();
      ctx.strokeStyle = "rgba(148,163,184,0.28)";
      ctx.lineWidth   = 0.5 / scale;
      for (let x = Math.floor(wx0 / MINOR_GRID) * MINOR_GRID; x <= wx1; x += MINOR_GRID) {
        if (x % MAJOR_GRID === 0) continue;
        ctx.moveTo(x, wy0); ctx.lineTo(x, wy1);
      }
      for (let y = Math.floor(wy0 / MINOR_GRID) * MINOR_GRID; y <= wy1; y += MINOR_GRID) {
        if (y % MAJOR_GRID === 0) continue;
        ctx.moveTo(wx0, y); ctx.lineTo(wx1, y);
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = "rgba(100,116,139,0.38)";
      ctx.lineWidth   = 0.8 / scale;
      for (let x = Math.floor(wx0 / MAJOR_GRID) * MAJOR_GRID; x <= wx1; x += MAJOR_GRID) {
        ctx.moveTo(x, wy0); ctx.lineTo(x, wy1);
      }
      for (let y = Math.floor(wy0 / MAJOR_GRID) * MAJOR_GRID; y <= wy1; y += MAJOR_GRID) {
        ctx.moveTo(wx0, y); ctx.lineTo(wx1, y);
      }
      ctx.stroke();
    }

    // ── Wires ────────────────────────────────────────────────────────────
    const pointMap = new Map(points.map(p => [p.id, p]));

    for (const wire of wires) {
      const start = pointMap.get(wire.startPointId);
      if (!start) continue;

      if (wire.endPointId === null) {
        if (wire.id !== activeWireIdRef.current) continue;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(59,130,246,0.75)";
        ctx.lineWidth   = 1.5 / scale;
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
        ctx.lineWidth   = 1.5 / scale;
        ctx.setLineDash([]);
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
    }

    // ── Junction dots ─────────────────────────────────────────────────────
    const useCount = new Map<string, number>();
    for (const w of wires) {
      if (w.endPointId === null) continue;
      useCount.set(w.startPointId, (useCount.get(w.startPointId) ?? 0) + 1);
      useCount.set(w.endPointId,   (useCount.get(w.endPointId)   ?? 0) + 1);
    }
    for (const [id, count] of useCount) {
      if (count < 3) continue;
      const pt = pointMap.get(id);
      if (!pt) continue;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3.5 / scale, 0, Math.PI * 2);
      ctx.fillStyle = "#1e40af";
      ctx.fill();
    }

    // ── Components ───────────────────────────────────────────────────────
    for (const cmp of components) {
      const pinA = cmp.pinAId ? pointMap.get(cmp.pinAId) : null;
      const pinB = cmp.pinBId ? pointMap.get(cmp.pinBId) : null;

      // Draw in local space: translate to world pos, rotate to wire angle
      ctx.save();
      ctx.translate(cmp.x, cmp.y);
      ctx.rotate(cmp.angle);

      if (cmp.type === "interrupteur") {
        drawInterrupteurSymbol(ctx, scale, cmp.isOn);
      } else {
        drawFallbackSymbol(ctx, cmp.type, COMP_HALF, scale);
      }

      ctx.restore();

      // Click-target hint: subtle circle in cursor mode
      if (tool === "cursor" && cmp.type === "interrupteur") {
        ctx.beginPath();
        ctx.arc(cmp.x, cmp.y, COMP_HALF * 0.55, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(148,163,184,0.2)";
        ctx.lineWidth   = 0.5 / scale;
        ctx.stroke();
      }

      // Pin dots
      for (const pin of [pinA, pinB]) {
        if (!pin) continue;
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, 2.5 / scale, 0, Math.PI * 2);
        ctx.fillStyle   = "#ffffff";
        ctx.strokeStyle = cmp.isOn ? "#1d4ed8" : "#1e40af";
        ctx.lineWidth   = 1 / scale;
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [points, wires, components, tool, renderTick]);

  // ─── Resize ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      redraw();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [redraw]);

  // ─── Wheel zoom ────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect     = canvas.getBoundingClientRect();
      const mx       = e.clientX - rect.left, my = e.clientY - rect.top;
      const factor   = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(Math.max(scaleRef.current * factor, 0.1), 12);
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
      const rect   = canvas.getBoundingClientRect();
      const sx     = e.clientX - rect.left, sy = e.clientY - rect.top;

      // Pan
      if (e.button === 1 || (tool === "hand" && e.button === 0)) {
        e.preventDefault();
        isPanningRef.current      = true;
        panStartRef.current       = { x: sx, y: sy };
        panStartOffsetRef.current = { ...offsetRef.current };
        return;
      }

      // Cursor tool: toggle switch components
      if (tool === "cursor" && e.button === 0) {
        tryToggleComponent(sx, sy);
        return;
      }

      if (tool !== "wires") return;

      // Cancel wire
      if (e.button === 2) {
        const aid = activeWireIdRef.current;
        if (!aid) return;
        setWires(prev => {
          const wire = prev.find(w => w.id === aid);
          if (!wire) return prev;
          const rest = prev.filter(w => w.id !== aid);
          const used = rest.some(w => w.startPointId === wire.startPointId || w.endPointId === wire.startPointId);
          if (!used) setPoints(pp => pp.filter(p => p.id !== wire.startPointId));
          return rest;
        });
        activeWireIdRef.current = null;
        redraw();
        return;
      }

      if (e.button !== 0) return;

      const raw     = screenToWorld(sx, sy);
      const snapped = { x: snapToGrid(raw.x, MINOR_GRID), y: snapToGrid(raw.y, MINOR_GRID) };
      const activeId = activeWireIdRef.current;

      if (activeId !== null) {
        // End wire
        setPoints(prev => {
          const existing = findNearPoint(snapped.x, snapped.y, prev);
          let endPtId: string;
          let next = prev;
          if (existing) {
            endPtId = existing.id;
          } else {
            const np: Point = { id: uid("pt"), ...snapped };
            next    = [...prev, np];
            endPtId = np.id;
          }
          setWires(ww => {
            const updated = ww.map(w => w.id === activeId ? { ...w, endPointId: endPtId } : w);
            const nw: Wire = { id: uid("wire"), startPointId: endPtId, endPointId: null };
            activeWireIdRef.current = nw.id;
            return [...updated, nw];
          });
          return next;
        });
      } else {
        // Start wire
        setPoints(prev => {
          const existing = findNearPoint(snapped.x, snapped.y, prev);
          let startPtId: string;
          let next = prev;
          if (existing) {
            startPtId = existing.id;
          } else {
            const np: Point = { id: uid("pt"), ...snapped };
            next      = [...prev, np];
            startPtId = np.id;
          }
          const nw: Wire = { id: uid("wire"), startPointId: startPtId, endPointId: null };
          activeWireIdRef.current = nw.id;
          setWires(ww => [...ww, nw]);
          return next;
        });
      }
    },
    [tool, redraw]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current!;
      const rect   = canvas.getBoundingClientRect();
      const sx     = e.clientX - rect.left, sy = e.clientY - rect.top;

      if (isPanningRef.current) {
        offsetRef.current = {
          x: panStartOffsetRef.current.x + (sx - panStartRef.current.x),
          y: panStartOffsetRef.current.y + (sy - panStartRef.current.y),
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

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button === 1 || tool === "hand") isPanningRef.current = false;
    },
    [tool]
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => e.preventDefault(), []);

  const cursorStyle =
    tool === "hand"
      ? isPanningRef.current ? "cursor-grabbing" : "cursor-grab"
      : tool === "wires"
      ? "cursor-crosshair"
      : "cursor-pointer";

  const COMP_LIST = [
    { type: "interrupteur", icon: "⏯️", label: "Interrupteur" },
    { type: "resistance",   icon: "Ω",  label: "Résistance"   },
    { type: "batterie",     icon: "🔋", label: "Batterie"      },
    { type: "led",          icon: "💡", label: "LED"           },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full ${cursorStyle}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        onDragOver={(e) => { if (tool === "cursor") e.preventDefault(); }}
        onDrop={(e: React.DragEvent<HTMLCanvasElement>) => {
          if (tool !== "cursor") return;
          e.preventDefault();
          const type  = e.dataTransfer.getData("application/x-component");
          const rect  = (e.target as HTMLCanvasElement).getBoundingClientRect();
          const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
          if (!onDropComponent(type, world.x, world.y)) {
            console.warn("[drop] no wire within range — drop closer to a wire segment");
          }
        }}
        aria-hidden="true"
      />

      {/* ── Side panel ─────────────────────────────────────────────────── */}
      <aside className="fixed left-6 top-16 bottom-16 w-64 bg-white/85 backdrop-blur-md border border-slate-200 rounded-xl shadow-xl p-4 flex flex-col gap-4 z-40">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Composants</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Outil <strong>curseur</strong> → glisser sur un fil
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          {COMP_LIST.map(({ type, icon, label }) => (
            <Button
              key={type}
              variant="ghost"
              draggable={tool === "cursor"}
              onDragStart={(e) => {
                if (tool !== "cursor") return;
                e.dataTransfer.setData("application/x-component", type);
                e.dataTransfer.effectAllowed = "copy";
              }}
              className="justify-start gap-3 hover:bg-slate-100 hover:scale-[1.02] transition-all"
            >
              <span className="text-base w-5 text-center">{icon}</span>
              <span className="text-sm">{label}</span>
            </Button>
          ))}
        </div>

        {/* Live component state table */}
        {components.filter(c => c.type === "interrupteur").length > 0 && (
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs space-y-1">
            <div className="font-medium text-slate-600 mb-1">État des interrupteurs</div>
            {components.filter(c => c.type === "interrupteur").map((c, i) => (
              <div key={c.id} className="flex items-center justify-between">
                <span className="text-slate-500">SW{i + 1}</span>
                <span className={`font-mono font-semibold ${c.isOn ? "text-blue-600" : "text-slate-400"}`}>
                  {c.isOn ? "FERMÉ" : "OUVERT"}
                </span>
              </div>
            ))}
            <div className="text-slate-400 mt-1">Cliquer pour basculer</div>
          </div>
        )}

        {/* Keyboard shortcuts */}
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-500 space-y-1">
          <div className="font-medium text-slate-600 mb-1">Raccourcis</div>
          <div><kbd className="bg-white border border-slate-200 rounded px-1">Scroll</kbd> Zoom</div>
          <div><kbd className="bg-white border border-slate-200 rounded px-1">Clic droit</kbd> Annuler fil</div>
          <div><kbd className="bg-white border border-slate-200 rounded px-1">Clic milieu</kbd> Glisser vue</div>
          <div><kbd className="bg-white border border-slate-200 rounded px-1">Clic</kbd> Basculer switch</div>
        </div>

        <div className="mt-auto space-y-0.5 text-xs text-slate-400 font-mono">
          <div>Points : {points.length} · Fils : {wires.filter(w => w.endPointId !== null).length}</div>
          <div>Composants : {components.length}</div>
          <div>Échelle : {scaleRef.current.toFixed(2)}×</div>
        </div>
      </aside>

      {/* ── Bottom toolbar ─────────────────────────────────────────────── */}
      <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50">
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-full px-3 py-2 shadow-lg">

          {[
            { id: "cursor" as const, Icon: PiCursor,       label: "Sélection"      },
            { id: "hand"   as const, Icon: PiHandGrabbing,  label: "Glisser"        },
            { id: "wires"  as const, Icon: PiPolygon,       label: "Fil électrique" },
          ].map(({ id, Icon, label }) => (
            <div key={id} className="relative group">
              <Button
                variant={tool === id ? "default" : "ghost"}
                aria-pressed={tool === id}
                onClick={() => setTool(id)}
                aria-label={label}
                className={`p-2 transition-all ${
                  tool === id ? "bg-slate-800 text-white" : "hover:bg-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
              </Button>
              <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-md bg-slate-800 text-white text-xs py-1 px-2 whitespace-nowrap opacity-0 scale-95 transition-all group-hover:opacity-100 group-hover:scale-100">
                {label}
              </span>
            </div>
          ))}

          <div className="mx-1 h-7 w-px bg-slate-200" />

          <Button variant="outline" size="sm" className="flex items-center gap-1.5 px-3 text-sm">
            <FiPlay className="h-3.5 w-3.5" /> Démarrer
          </Button>

          <Button size="sm" className="flex items-center gap-1.5 px-3 text-sm">
            <PiPause className="h-3.5 w-3.5" /> Pause
          </Button>

          <Button variant="ghost" aria-label="Settings" className="p-2 hover:bg-slate-100">
            <LuSettings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}