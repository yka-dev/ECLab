import { useRef, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { ButtonGroup } from "~/components/ui/button-group";
import { PlusIcon } from "lucide-react";
import { FiPlay } from "react-icons/fi";
import { PiCursor, PiHandGrabbing, PiPause, PiPolygon } from "react-icons/pi";
import { LuSettings } from "react-icons/lu";

type Point = { id: number; x: number; y: number };
type Wire = { id: number; from: number; to: number };

type Camera = { x: number; y: number; zoom: number };

type Mode = 'cursor' | 'pan' | 'wire';

export default function Project() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const pointIdRef = useRef(1);
  const wireIdRef = useRef(1);

  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [mode, setMode] = useState<Mode>('cursor');
  const [points, setPoints] = useState<Point[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ sx: number; sy: number; camX: number; camY: number } | null>(null);
  const [mouseScreen, setMouseScreen] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [activePath, setActivePath] = useState<number[]>([]);

  const gridStep = 30;

  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    return ctx;
  };

  const screenToWorld = (sx: number, sy: number): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const x = (sx - rect.left - cx) / camera.zoom + camera.x;
    const y = (sy - rect.top - cy) / camera.zoom + camera.y;
    return { x, y };
  };

  const worldToScreen = (x: number, y: number): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    return {
      x: (x - camera.x) * camera.zoom + cx + rect.left,
      y: (y - camera.y) * camera.zoom + cy + rect.top,
    };
  };

  const findNearbyPoint = (wx: number, wy: number, radius = 12) => {
    return points.find(p => {
      const dx = p.x - wx;
      const dy = p.y - wy;
      return Math.hypot(dx, dy) <= radius / camera.zoom;
    });
  };

  const addPoint = (wx: number, wy: number): Point => {
    const newPoint: Point = { id: pointIdRef.current++, x: wx, y: wy };
    setPoints(prev => [...prev, newPoint]);
    return newPoint;
  };

  const updatePoint = (id: number, x: number, y: number) => {
    setPoints(prev => prev.map(p => (p.id === id ? { ...p, x, y } : p)));
  };

  const addWire = (a: Point, b: Point) => {
    if (a.id === b.id) return;
    if (wires.some(w => (w.from === a.id && w.to === b.id) || (w.from === b.id && w.to === a.id))) return;
    setWires(prev => [...prev, { id: wireIdRef.current++, from: a.id, to: b.id }]);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = getCanvasContext();
      if (!canvas || !ctx) return;

      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      // background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // grid
      const { x: camX, y: camY, zoom } = camera;
      const worldLeft = camX - (width / 2) / zoom;
      const worldRight = camX + (width / 2) / zoom;
      const worldTop = camY - (height / 2) / zoom;
      const worldBottom = camY + (height / 2) / zoom;

      const startX = Math.floor(worldLeft / gridStep) * gridStep;
      const endX = Math.ceil(worldRight / gridStep) * gridStep;
      const startY = Math.floor(worldTop / gridStep) * gridStep;
      const endY = Math.ceil(worldBottom / gridStep) * gridStep;

      ctx.strokeStyle = '#d3dce5';
      ctx.lineWidth = 1;
      for (let gx = startX; gx <= endX; gx += gridStep) {
        const sx = (gx - camX) * zoom + width / 2;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
        ctx.stroke();
      }
      for (let gy = startY; gy <= endY; gy += gridStep) {
        const sy = (gy - camY) * zoom + height / 2;
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
        ctx.stroke();
      }

      // wires
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      wires.forEach(w => {
        const p1 = points.find(p => p.id === w.from);
        const p2 = points.find(p => p.id === w.to);
        if (!p1 || !p2) return;
        const s1 = worldToScreen(p1.x, p1.y);
        const s2 = worldToScreen(p2.x, p2.y);
        ctx.beginPath();
        ctx.moveTo(s1.x - canvas.getBoundingClientRect().left, s1.y - canvas.getBoundingClientRect().top);
        ctx.lineTo(s2.x - canvas.getBoundingClientRect().left, s2.y - canvas.getBoundingClientRect().top);
        ctx.stroke();
      });

      // points
      points.forEach(p => {
        const sp = worldToScreen(p.x, p.y);
        const cx = sp.x - canvas.getBoundingClientRect().left;
        const cy = sp.y - canvas.getBoundingClientRect().top;
        ctx.beginPath();
        const inActive = activePath.includes(p.id);
        ctx.fillStyle = inActive ? '#f59e0b' : '#0369a1';
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationRef.current != null) cancelAnimationFrame(animationRef.current);
    };
  }, [camera, points, wires, activePath, mouseScreen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onPointerDown = (event: PointerEvent) => {
      const world = screenToWorld(event.clientX, event.clientY);
      setMouseScreen({ x: event.clientX, y: event.clientY });

      if (mode === 'pan' || (mode === 'cursor' && event.button === 1)) {
        setIsPanning(true);
        setPanStart({ sx: event.clientX, sy: event.clientY, camX: camera.x, camY: camera.y });
        canvas.setPointerCapture(event.pointerId);
        return;
      }

      if (mode === 'wire') {
        const start = findNearbyPoint(world.x, world.y) || addPoint(world.x, world.y);
        setIsDrawing(true);
        setActivePath([start.id]);
        canvas.setPointerCapture(event.pointerId);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const world = screenToWorld(event.clientX, event.clientY);
      setMouseScreen({ x: event.clientX, y: event.clientY });

      if (isPanning && panStart) {
        const dx = (event.clientX - panStart.sx) / camera.zoom;
        const dy = (event.clientY - panStart.sy) / camera.zoom;
        setCamera({ x: panStart.camX - dx, y: panStart.camY - dy, zoom: camera.zoom });
        return;
      }

      if (mode === 'wire' && isDrawing && activePath.length > 0) {
        const cursor = world;
        const startId = activePath[0];
        const startPoint = points.find(p => p.id === startId);
        if (!startPoint) return;

        if (activePath.length === 1) {
          // first move after mouse down creates first segment endpoint
          if (Math.hypot(cursor.x - startPoint.x, cursor.y - startPoint.y) < 2 / camera.zoom) {
            return;
          }
          const endPoint = findNearbyPoint(cursor.x, cursor.y) || addPoint(cursor.x, cursor.y);
          addWire(startPoint, endPoint);
          setActivePath([startId, endPoint.id]);
          return;
        }

        const lastId = activePath[activePath.length - 1];
        const lastPoint = points.find(p => p.id === lastId);
        const prevId = activePath[activePath.length - 2];
        const prevPoint = points.find(p => p.id === prevId);
        if (!lastPoint || !prevPoint) return;

        const oldDx = lastPoint.x - prevPoint.x;
        const oldDy = lastPoint.y - prevPoint.y;
        const newDx = cursor.x - lastPoint.x;
        const newDy = cursor.y - lastPoint.y;

        const lenOld = Math.hypot(oldDx, oldDy);
        const lenNew = Math.hypot(newDx, newDy);
        if (lenNew < 2 / camera.zoom) return;

        const oldAngle = Math.atan2(oldDy, oldDx);
        const newAngle = Math.atan2(newDy, newDx);
        const angleDelta = Math.abs(((newAngle - oldAngle + Math.PI) % (2 * Math.PI)) - Math.PI);

        const directionChangeThreshold = Math.PI / 8; // 22.5 degrees

        if (angleDelta <= directionChangeThreshold) {
          // continue drawing same segment, move last point
          updatePoint(lastId, cursor.x, cursor.y);
        } else {
          // commit last segment and start a new one from this last point
          const nextPoint = findNearbyPoint(cursor.x, cursor.y) || addPoint(cursor.x, cursor.y);
          addWire(lastPoint, nextPoint);
          setActivePath(prev => [...prev, nextPoint.id]);
        }
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (isDrawing) {
        setIsDrawing(false);
        setActivePath([]);
      }
      if (isPanning) {
        setIsPanning(false);
        setPanStart(null);
      }
      canvas.releasePointerCapture(event.pointerId);
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = -event.deltaY * 0.001;
      setCamera(prev => {
        const newZoom = Math.min(3, Math.max(0.2, prev.zoom * (1 + delta)));
        const worldBefore = screenToWorld(event.clientX, event.clientY);
        const rect = canvas.getBoundingClientRect();
        const worldAfterX = (event.clientX - rect.left - rect.width / 2) / newZoom + prev.x;
        const worldAfterY = (event.clientY - rect.top - rect.height / 2) / newZoom + prev.y;
        return {
          x: prev.x + (worldBefore.x - worldAfterX),
          y: prev.y + (worldBefore.y - worldAfterY),
          zoom: newZoom,
        };
      });
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [camera, mode, isPanning, panStart, points, wires, isDrawing, activePath]);

  const handleClear = () => {
    setPoints([]);
    setWires([]);
    setActivePath([]);
    setIsDrawing(false);
    pointIdRef.current = 1;
    wireIdRef.current = 1;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-auto"
        aria-hidden="true"
      />

      <aside className="fixed left-6 top-16 bottom-16 w-64 bg-white/80 backdrop-blur-md border border-slate-200 rounded-lg shadow-xl p-4 flex flex-col gap-4 z-40">
        <div>
          <h3 className="text-lg font-semibold">Playground</h3>
          <p className="text-sm text-slate-500">
            Quick access to tools and components
          </p>
        </div>

        <ButtonGroup className="flex flex-col gap-2">
          <Button
            variant="ghost"
            className="justify-start hover:bg-slate-100/60 hover:scale-105 hover:shadow-sm transition"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            New Project
          </Button>
          <Button
            variant="ghost"
            className="justify-start hover:bg-slate-100/60 hover:scale-105 hover:shadow-sm transition"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Component
          </Button>
          <Button
            variant="ghost"
            className="justify-start hover:bg-slate-100/60 hover:scale-105 hover:shadow-sm transition"
          >
            Templates
          </Button>
        </ButtonGroup>

        <div className="mt-auto text-xs text-slate-400">Status: Ready</div>
      </aside>

      <div className="fixed left-1/2 transform -translate-x-1/2 bottom-6 z-50">
        <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md border border-slate-200 rounded-full px-3 py-2 shadow-lg">
          <div className="relative flex items-center justify-center">
            <Button
              variant={mode === 'cursor' ? 'default' : 'ghost'}
              aria-label="Cursor"
              className="p-2 hover:bg-slate-100/60 hover:scale-105 hover:shadow-sm transition"
              onClick={() => setMode('cursor')}
            >
              <PiCursor className="h-4 w-4" />
            </Button>
            <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-md bg-slate-800 text-white text-xs py-1 px-2 whitespace-nowrap opacity-0 scale-95 transform transition-all duration-150 group-hover:opacity-100 group-hover:scale-100">
              Selection
            </span>
          </div>

          <div className="relative flex items-center justify-center">
            <Button
              variant={mode === 'pan' ? 'default' : 'ghost'}
              aria-label="Pan"
              className="p-2 hover:bg-slate-100/60 hover:scale-105 hover:shadow-sm transition"
              onClick={() => setMode('pan')}
            >
              <PiHandGrabbing className="h-4 w-4" />
            </Button>
            <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-md bg-slate-800 text-white text-xs py-1 px-2 whitespace-nowrap opacity-0 scale-95 transform transition-all duration-150 group-hover:opacity-100 group-hover:scale-100">
              Pan
            </span>
          </div>

          <div className="relative flex items-center justify-center">
            <Button
              variant={mode === 'wire' ? 'default' : 'ghost'}
              aria-label="Wires"
              className="p-2 hover:bg-slate-100/60 hover:scale-105 hover:shadow-sm transition"
              onClick={() => setMode('wire')}
            >
              <PiPolygon className="h-4 w-4" />
            </Button>
            <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-md bg-slate-800 text-white text-xs py-1 px-2 whitespace-nowrap opacity-0 scale-95 transform transition-all duration-150 group-hover:opacity-100 group-hover:scale-100">
              Wire
            </span>
          </div>

          <div
            aria-hidden="true"
            className="mx-2 h-8 w-[1.5px] bg-slate-200/80 rounded-sm bg-gradient-to-b from-slate-300/95 to-slate-400/95 shadow-sm"
          />

          <Button variant="outline" className="flex items-center gap-2 px-3">
            <FiPlay className="h-4 w-4" />
            Démarrer
          </Button>

          <Button className="flex items-center gap-2 px-3">
            <PiPause className="h-4 w-4" />
            Pause
          </Button>

          <Button
            variant="ghost"
            aria-label="Quick add"
            className="p-2 hover:bg-slate-100/60 hover:scale-105 hover:shadow-sm transition"
          >
            <LuSettings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
