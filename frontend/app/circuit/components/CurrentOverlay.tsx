import { useEffect, useRef } from "react";
import type { Wire, Component, Camera, Vec2 } from "../types";
import { GRID } from "../constants";
import { w2s, dist } from "../utils";
import { termWorlds } from "../geometry";

const DOT_SPEED_SCALE = 30000;
const DOT_MIN_SPEED   = 45;
const DOT_MAX_SPEED   = 320;
const DOT_RADIUS      = 4;
const DOT_GLOW        = 8;
const DOT_SPACING     = 32;
const DOT_THRESHOLD   = 3e-4;

const LED_RGB: Record<string, [number, number, number]> = {
  rouge:  [255,  50,  50],
  vert:   [ 50, 255,  80],
  bleu:   [ 50, 140, 255],
  jaune:  [255, 230,  40],
  blanc:  [255, 255, 255],
};
const LED_FADE_IN  = 4.0;
const LED_FADE_OUT = 2.5;

interface AnimDot { pos: number; }
interface AnimSeg { len: number; ax: number; ay: number; bx: number; by: number; }
interface AnimPath { id: string; segs: AnimSeg[]; totalLen: number; current: number; }

function buildSegs(worldPts: Vec2[], cam: Camera): { segs: AnimSeg[]; totalLen: number } {
  const segs: AnimSeg[] = [];
  let totalLen = 0;
  for (let i = 0; i < worldPts.length - 1; i++) {
    const a = w2s(worldPts[i].x, worldPts[i].y, cam);
    const b = w2s(worldPts[i + 1].x, worldPts[i + 1].y, cam);
    const len = dist(a, b);
    if (len > 0.5) segs.push({ len, ax: a.x, ay: a.y, bx: b.x, by: b.y });
    totalLen += len;
  }
  return { segs, totalLen };
}

function prefillDots(totalLen: number, spacing: number): AnimDot[] {
  const count = Math.max(2, Math.ceil(totalLen / spacing));
  return Array.from({ length: count }, (_, i) => ({ pos: (i / count) * totalLen }));
}

interface Props {
  wires: Wire[];
  components: Component[];
  wireCurrents: Map<string, number>;
  componentCurrents: Map<string, number>;
  cam: Camera;
  active: boolean;
}

export function CurrentOverlay({ wires, components, wireCurrents, componentCurrents, cam, active }: Props) {
  const canvasRef        = useRef<HTMLCanvasElement>(null);
  const rafRef           = useRef<number>(0);
  const lastTsRef        = useRef<number>(0);
  const dotsRef          = useRef<Map<string, AnimDot[]>>(new Map());
  const ledBrightnessRef = useRef<Map<string, number>>(new Map());

  const wiresRef              = useRef(wires);
  const componentsRef         = useRef(components);
  const wireCurrentsRef       = useRef(wireCurrents);
  const componentCurrentsRef  = useRef(componentCurrents);
  const camRef                = useRef(cam);
  wiresRef.current             = wires;
  componentsRef.current        = components;
  wireCurrentsRef.current      = wireCurrents;
  componentCurrentsRef.current = componentCurrents;
  camRef.current               = cam;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas); resize();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    cancelAnimationFrame(rafRef.current);

    if (!active) {
      dotsRef.current.clear(); ledBrightnessRef.current.clear();
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    lastTsRef.current = 0;

    const animate = (ts: number) => {
      const dt = Math.min((ts - (lastTsRef.current || ts)) / 1000, 0.05);
      lastTsRef.current = ts;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.scale(dpr, dpr);
      const cam = camRef.current;

      // ── glow LED ─────────────────────────────────────────────────────────────
      for (const comp of componentsRef.current) {
        if (comp.type !== "led") continue;
        const I        = componentCurrentsRef.current.get(comp.id) ?? 0;
        const lit      = Math.abs(I) >= DOT_THRESHOLD;
        const prev     = ledBrightnessRef.current.get(comp.id) ?? 0;
        const speed    = lit ? LED_FADE_IN : LED_FADE_OUT;
        const brightness = lit ? Math.min(1, prev + speed * dt) : Math.max(0, prev - speed * dt);
        ledBrightnessRef.current.set(comp.id, brightness);
        if (brightness < 0.01) continue;

        const [r, g, b] = LED_RGB[(comp.props.color as string) ?? "rouge"] ?? LED_RGB.rouge;
        const center = w2s(comp.position.x, comp.position.y, cam);
        const radius = GRID * 3.8 * cam.z;
        const pulse  = 0.82 + 0.18 * (0.5 + 0.5 * Math.sin(ts * 0.009));
        const b_eff  = brightness * pulse;

        const halo = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius);
        halo.addColorStop(0,    `rgba(${r},${g},${b},${(b_eff * 0.75).toFixed(2)})`);
        halo.addColorStop(0.35, `rgba(${r},${g},${b},${(b_eff * 0.35).toFixed(2)})`);
        halo.addColorStop(1,    `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(center.x, center.y, radius, 0, Math.PI * 2); ctx.fill();

        const core = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, GRID * 0.8 * cam.z);
        core.addColorStop(0, `rgba(255,255,255,${(b_eff * 0.92).toFixed(2)})`);
        core.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = core; ctx.beginPath(); ctx.arc(center.x, center.y, GRID * 0.8 * cam.z, 0, Math.PI * 2); ctx.fill();
      }

      // ── construire les chemins ────────────────────────────────────────────────
      const paths: AnimPath[] = [];
      for (const wire of wiresRef.current) {
        if (wire.points.length < 2) continue;
        const I = wireCurrentsRef.current.get(wire.id) ?? 0;
        const { segs, totalLen } = buildSegs(wire.points, cam);
        if (totalLen > 1) paths.push({ id: wire.id, segs, totalLen, current: I });
      }
      for (const comp of componentsRef.current) {
        if (comp.type === "ground") continue;
        const I = componentCurrentsRef.current.get(comp.id) ?? 0;
        const tws = termWorlds(comp);
        if (tws.length < 2) continue;
        const { segs, totalLen } = buildSegs(tws, cam);
        if (totalLen > 1) paths.push({ id: `comp_${comp.id}`, segs, totalLen, current: I });
      }

      // ── animer chaque chemin ──────────────────────────────────────────────────
      ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = DOT_GLOW; ctx.fillStyle = "#fde68a";
      for (const path of paths) {
        const { id, segs, totalLen, current: I } = path;
        if (Math.abs(I) < DOT_THRESHOLD) { dotsRef.current.delete(id); continue; }
        const absSpeed = Math.min(Math.max(Math.abs(I) * DOT_SPEED_SCALE, DOT_MIN_SPEED), DOT_MAX_SPEED);
        const speed    = Math.sign(I) * absSpeed;
        const spacing  = Math.max(DOT_SPACING, totalLen / 6);
        let dots = dotsRef.current.get(id);
        if (!dots) dots = prefillDots(totalLen, spacing);
        dots = dots.map((d) => { let p = d.pos + speed * dt; if (p > totalLen) p -= totalLen; if (p < 0) p += totalLen; return { pos: p }; });
        dotsRef.current.set(id, dots);
        for (const dot of dots) {
          let rem = dot.pos;
          for (const seg of segs) {
            if (rem <= seg.len) {
              const t = rem / seg.len;
              ctx.beginPath(); ctx.arc(seg.ax + (seg.bx - seg.ax) * t, seg.ay + (seg.by - seg.ay) * t, DOT_RADIUS, 0, Math.PI * 2); ctx.fill();
              break;
            }
            rem -= seg.len;
          }
        }
      }
      ctx.shadowBlur = 0; ctx.restore();
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}
