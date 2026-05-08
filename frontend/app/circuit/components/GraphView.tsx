import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GraphConfig, SimResult, SimPoint } from "../types";
import type { Netlist } from "../netlist";
import { UI } from "../constants";
import { fmtNetlistComp } from "../netlist";

type SeriesData =
  | { kind: "ac"; points: { t: number; v: number }[] }
  | { kind: "dc"; value: number }
  | null;

interface Props {
  config: GraphConfig;
  liveNetlist: Netlist;
  simNetlist: Netlist | null;
  simResult: SimResult | null;
  dark: boolean;
  onChangeComponent: (name: string | null) => void;
  onChangeMetric: (m: "tension" | "courant") => void;
  onClose: () => void;
  onExpand?: () => void;
  enlarged?: boolean;
}

export function GraphView({ config, liveNetlist, simNetlist, simResult, dark, onChangeComponent, onChangeMetric, onClose, onExpand, enlarged = false }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const viewRef      = useRef<{ t0: number; t1: number } | null>(null);
  const dragRef      = useRef<{ sx: number; savedT0: number; savedT1: number } | null>(null);
  const seriesRef    = useRef<SeriesData>(null);
  const drawFnRef    = useRef<() => void>(() => {});
  const darkRef      = useRef(dark);
  const enlargedRef  = useRef(enlarged);
  darkRef.current    = dark;
  enlargedRef.current = enlarged;

  const [isFullView, setIsFullView] = useState(true);

  const nc = useMemo(
    () => liveNetlist.components.find(c => c.name === config.componentName) ?? null,
    [liveNetlist, config.componentName],
  );

  const series: SeriesData = useMemo(() => {
    if (!nc || !simResult || simResult.error) return null;
    if (nc.type === "NPN_IDEAL") return null;
    const voltage = (tp: { nodeVoltages: Record<string, number> }) => {
      const v1 = nc.n1 === "0" ? 0 : (tp.nodeVoltages[`node${nc.n1}`] ?? 0);
      const v2 = nc.n2 === "0" ? 0 : (tp.nodeVoltages[`node${nc.n2}`] ?? 0);
      return v1 - v2;
    };
    if (simResult.timeSeries && simResult.timeSeries.length > 0)
      return { kind: "ac", points: simResult.timeSeries.map(tp => ({ t: tp.time, v: voltage(tp) })) };
    const v1 = nc.n1 === "0" ? 0 : (simResult.nodeVoltages[`node${nc.n1}`] ?? 0);
    const v2 = nc.n2 === "0" ? 0 : (simResult.nodeVoltages[`node${nc.n2}`] ?? 0);
    return { kind: "dc", value: v1 - v2 };
  }, [nc, simResult]);

  seriesRef.current = series;

  const currentSeries: SeriesData = useMemo(() => {
    if (!nc || !simResult || simResult.error) return null;
    const getV = (tp: SimPoint, nId: string) => nId === "0" ? 0 : (tp.nodeVoltages[`node${nId}`] ?? 0);
    if (nc.type === "NPN_IDEAL") return null;
    const currentAt = (tp: SimPoint, prevTp?: SimPoint): number => {
      const v1 = getV(tp, nc.n1), v2 = getV(tp, nc.n2), vd = v1 - v2;
      switch (nc.type) {
        case "R": return vd / (nc.value || 1);
        case "C": {
          if (!prevTp) return 0;
          const dt = tp.time - prevTp.time;
          if (dt <= 0) return 0;
          const prevVd = getV(prevTp, nc.n1) - getV(prevTp, nc.n2);
          return nc.value * (vd - prevVd) / dt;
        }
        case "L": return tp.sourceCurrents[nc.name] ?? 0;
        case "V": return -(tp.sourceCurrents[nc.name] ?? 0);
        case "D": return Math.max(0, (vd - nc.vf) / 10);
        case "S": return nc.state ? vd / 0.001 : 0;
        default:  return 0;
      }
    };
    if (simResult.timeSeries && simResult.timeSeries.length > 0) {
      const pts = simResult.timeSeries;
      return { kind: "ac", points: pts.map((tp, i) => ({ t: tp.time, v: currentAt(tp, i > 0 ? pts[i - 1] : undefined) })) };
    }
    const dcI = currentAt({ time: 0, nodeVoltages: simResult.nodeVoltages, sourceCurrents: simResult.sourceCurrents });
    return { kind: "dc", value: dcI };
  }, [nc, simResult]);

  const activeSeries: SeriesData = config.metric === "courant" ? currentSeries : series;

  const graphTitle = useMemo(() => {
    if (!nc || !config.componentName) return "";
    const n = config.componentName;
    return ({ R: `Tension aux bornes de ${n}`, C: `Tension aux bornes du condensateur ${n}`, L: `Tension aux bornes de l'inductance ${n}`, V: `Tension de la source ${n}`, D: `Tension aux bornes de la DEL ${n}`, S: `Tension aux bornes de l'interrupteur ${n}` } as Record<string, string>)[nc.type] ?? `Tension — ${n}`;
  }, [nc, config.componentName]);

  const currentTitle = useMemo(() => {
    if (!nc || !config.componentName) return "";
    const n = config.componentName;
    return ({ R: `Courant traversant ${n}`, C: `Courant traversant le condensateur ${n}`, L: `Courant traversant l'inductance ${n}`, V: `Courant débité par la source ${n}`, D: `Courant traversant la DEL ${n}`, S: `Courant traversant l'interrupteur ${n}` } as Record<string, string>)[nc.type] ?? `Courant — ${n}`;
  }, [nc, config.componentName]);

  const activeTitle = config.metric === "courant" ? currentTitle : graphTitle;
  const graphTitleRef = useRef(graphTitle); graphTitleRef.current = graphTitle;

  const niceStep = (roughStep: number): number => {
    const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(roughStep) || 1)));
    const norm = roughStep / mag;
    if (norm <= 1) return mag; if (norm <= 2) return 2 * mag; if (norm <= 5) return 5 * mag; return 10 * mag;
  };
  const niceRange = (lo: number, hi: number, n: number) => {
    const step = niceStep((hi - lo) / n || 1);
    return { lo: Math.floor(lo / step) * step, hi: Math.ceil(hi / step) * step, step };
  };
  const fmtV = (v: number): string => {
    const a = Math.abs(v);
    if (a === 0) return "0"; if (a >= 1000) return (v / 1000).toPrecision(3) + "k";
    if (a >= 1) return v.toPrecision(3); if (a >= 1e-3) return (v * 1000).toPrecision(3) + "m";
    return v.toExponential(2);
  };
  const timeUnit = (span: number): { u: string; f: number } => {
    if (span >= 1) return { u: "s", f: 1 }; if (span >= 1e-3) return { u: "ms", f: 1e3 }; return { u: "µs", f: 1e6 };
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    if (W === 0 || H === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!; ctx.scale(dpr, dpr);

    const isCurrentMetric = config.metric === "courant";
    const lineCol  = isCurrentMetric ? "#16a34a" : "#2563eb";
    const bg       = dark ? "#080a12" : "#f9fafb";
    const textCol  = dark ? "#64748b" : "#6b7280";
    const titleCol = dark ? "#94a3b8" : "#374151";
    const gridCol  = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)";
    const axisCol  = dark ? "#334155" : "#d1d5db";
    const fs       = enlarged ? 12 : 11;

    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const mt = enlarged ? 34 : 26, mb = enlarged ? 48 : 40, mr = 14, ml = enlarged ? 72 : 62;
    const pw = W - ml - mr, ph = H - mt - mb;

    ctx.font = `${fs}px 'JetBrains Mono', monospace`;
    if (!activeSeries || !config.componentName) {
      ctx.fillStyle = textCol; ctx.textAlign = "center";
      ctx.fillText(config.componentName ? UI.noData : UI.noCompSel, W / 2, H / 2);
      return;
    }

    ctx.font = `bold ${fs}px 'JetBrains Mono', monospace`; ctx.fillStyle = titleCol; ctx.textAlign = "center";
    ctx.fillText(activeTitle, W / 2, fs + 5);
    ctx.font = `${fs}px 'JetBrains Mono', monospace`;

    const rawPts = activeSeries.kind === "ac" ? activeSeries.points : [{ t: 0, v: activeSeries.value }];
    const rawAbsMax = Math.max(...rawPts.map(p => Math.abs(p.v)), 0);
    let yScaleFactor = 1, yUnit = "V", yVarLabel = "U";
    if (isCurrentMetric) {
      yVarLabel = "I";
      if (rawAbsMax < 1e-3) { yScaleFactor = 1e6; yUnit = "µA"; }
      else if (rawAbsMax < 1) { yScaleFactor = 1e3; yUnit = "mA"; }
      else { yScaleFactor = 1; yUnit = "A"; }
    }
    const fmtY = (raw: number) => { const scaled = raw * yScaleFactor, a = Math.abs(scaled); if (a === 0) return "0"; if (a >= 100) return scaled.toFixed(1); if (a >= 10) return scaled.toFixed(2); return scaled.toPrecision(3); };

    if (activeSeries.kind === "dc") {
      const val = activeSeries.value;
      ctx.fillStyle = textCol; ctx.textAlign = "center";
      ctx.fillText(`Régime continu : ${fmtY(val)} ${yUnit}`, W / 2, mt + ph / 2 - 8);
      ctx.fillStyle = lineCol; ctx.fillRect(ml, mt + ph / 2 - 1, pw, 2);
      ctx.save(); ctx.translate(fs + 2, mt + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.fillStyle = textCol;
      ctx.fillText(`${isCurrentMetric ? "Courant" : "Tension"}  ${yVarLabel} (${yUnit})`, 0, 0); ctx.restore();
      return;
    }

    const pts = activeSeries.points, fullT0 = pts[0].t, fullT1 = pts[pts.length - 1].t, span = fullT1 - fullT0;
    const vw = viewRef.current;
    const t0 = vw ? Math.max(fullT0, vw.t0) : fullT0, t1 = vw ? Math.min(fullT1, vw.t1) : fullT1;
    const rawMin = Math.min(...pts.map(p => p.v)), rawMax = Math.max(...pts.map(p => p.v));
    const dMin = rawMin * yScaleFactor, dMax = rawMax * yScaleFactor;
    const { lo: yMin, hi: yMax, step: yStep } = niceRange(dMin >= 0 ? 0 : dMin * 1.25, dMax <= 0 ? 0 : dMax * 1.25, enlarged ? 6 : 5);
    const yRange = yMax - yMin || 1;
    const { u: tU, f: tF } = timeUnit(span);
    const toX = (t: number) => ml + ((t - t0) / (t1 - t0 || 1)) * pw;
    const toY = (d: number) => mt + (1 - (d - yMin) / yRange) * ph;

    for (let v = yMin; v <= yMax + yStep * 0.01; v += yStep) {
      const y = toY(v); if (y < mt - 2 || y > mt + ph + 2) continue;
      ctx.strokeStyle = gridCol; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(ml, y); ctx.lineTo(ml + pw, y); ctx.stroke();
      const isZero = Math.abs(v) < yStep * 0.01;
      ctx.fillStyle = isZero ? axisCol : textCol; ctx.textAlign = "right";
      ctx.fillText(isZero ? "0" : fmtY(v / yScaleFactor), ml - 5, y + fs * 0.35);
    }

    const { lo: tMin, hi: tMax, step: tStep } = niceRange(t0, t1, enlarged ? 8 : 5);
    for (let t = tMin; t <= tMax + tStep * 0.01; t += tStep) {
      const x = toX(t); if (x < ml - 2 || x > ml + pw + 2) continue;
      ctx.strokeStyle = gridCol; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(x, mt); ctx.lineTo(x, mt + ph); ctx.stroke();
      ctx.fillStyle = textCol; ctx.textAlign = "center";
      ctx.fillText((t * tF).toPrecision(3), x, mt + ph + fs + 5);
    }

    if (yMin < 0 && yMax > 0) {
      const y0 = toY(0); ctx.strokeStyle = axisCol; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(ml, y0); ctx.lineTo(ml + pw, y0); ctx.stroke(); ctx.setLineDash([]);
    }

    ctx.strokeStyle = axisCol; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(ml, mt); ctx.lineTo(ml, mt + ph); ctx.moveTo(ml, mt + ph); ctx.lineTo(ml + pw, mt + ph); ctx.stroke();

    ctx.save(); ctx.translate(fs + 2, mt + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.fillStyle = textCol;
    ctx.fillText(`${isCurrentMetric ? "Courant" : "Tension"}  ${yVarLabel} (${yUnit})`, 0, 0); ctx.restore();
    ctx.fillStyle = textCol; ctx.textAlign = "center";
    ctx.fillText(`Temps  t (${tU})`, ml + pw / 2, mt + ph + mb - 10);

    ctx.strokeStyle = lineCol; ctx.lineWidth = enlarged ? 2 : 1.8; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath();
    let first = true;
    for (const p of pts) {
      if (p.t < t0 - (t1 - t0) * 0.001 || p.t > t1 + (t1 - t0) * 0.001) continue;
      const d = p.v * yScaleFactor;
      if (first) { ctx.moveTo(toX(p.t), toY(d)); first = false; } else ctx.lineTo(toX(p.t), toY(d));
    }
    ctx.stroke();

    if (vw && span > 0 && (t0 > fullT0 + 1e-9 || t1 < fullT1 - 1e-9)) {
      const sbY = mt + ph + mb - 5, sbH = 3;
      ctx.fillStyle = dark ? "#1e293b" : "#e2e8f0"; ctx.fillRect(ml, sbY, pw, sbH);
      const s0 = (t0 - fullT0) / span, s1 = (t1 - fullT0) / span;
      ctx.fillStyle = lineCol + "99"; ctx.fillRect(ml + s0 * pw, sbY, (s1 - s0) * pw, sbH);
    }
  }, [activeSeries, dark, config.componentName, enlarged, activeTitle, config.metric]);

  drawFnRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ro = new ResizeObserver(() => drawFnRef.current());
    ro.observe(canvas); drawFnRef.current();
    return () => ro.disconnect();
  }, []);

  useEffect(() => { drawFnRef.current(); }, [draw]);

  useEffect(() => {
    const el = canvasRef.current; if (!el) return;
    const getML = () => (enlargedRef.current ? 72 : 62), getMR = () => 14;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = seriesRef.current; if (!s || s.kind !== "ac") return;
      const pts = s.points, fullT0 = pts[0].t, fullT1 = pts[pts.length - 1].t;
      const cur = viewRef.current ?? { t0: fullT0, t1: fullT1 };
      const pw = el.offsetWidth - getML() - getMR();
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect(), ratio = Math.max(0, Math.min(1, (e.clientX - rect.left - getML()) / pw));
        const pivot = cur.t0 + ratio * (cur.t1 - cur.t0), factor = e.deltaY > 0 ? 1.3 : 0.77;
        const newSpan = Math.max((fullT1 - fullT0) * 0.005, (cur.t1 - cur.t0) * factor);
        let nt0 = pivot - ratio * newSpan, nt1 = nt0 + newSpan;
        if (nt0 < fullT0) { nt0 = fullT0; nt1 = nt0 + newSpan; }
        if (nt1 > fullT1) { nt1 = fullT1; nt0 = nt1 - newSpan; }
        viewRef.current = { t0: Math.max(fullT0, nt0), t1: Math.min(fullT1, nt1) };
      } else {
        const span = cur.t1 - cur.t0, shift = span * (e.deltaY > 0 ? 0.15 : -0.15);
        let nt0 = cur.t0 + shift;
        if (nt0 < fullT0) nt0 = fullT0; if (nt0 + span > fullT1) nt0 = fullT1 - span;
        viewRef.current = { t0: nt0, t1: nt0 + span };
      }
      const vw = viewRef.current;
      if (Math.abs(vw.t0 - fullT0) < 1e-9 && Math.abs(vw.t1 - fullT1) < 1e-9) viewRef.current = null;
      setIsFullView(viewRef.current === null); drawFnRef.current();
    };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const s = seriesRef.current; if (!s || s.kind !== "ac") return;
      const cur = viewRef.current;
      dragRef.current = cur ? { sx: e.clientX, savedT0: cur.t0, savedT1: cur.t1 } : { sx: e.clientX, savedT0: s.points[0].t, savedT1: s.points[s.points.length - 1].t };
      e.preventDefault();
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const s = seriesRef.current; if (!s || s.kind !== "ac") return;
      const pts = s.points, fullT0 = pts[0].t, fullT1 = pts[pts.length - 1].t;
      const { sx, savedT0, savedT1 } = dragRef.current, span = savedT1 - savedT0;
      const dt = -((e.clientX - sx) / (el.offsetWidth - getML() - getMR())) * span;
      let nt0 = savedT0 + dt;
      if (nt0 < fullT0) nt0 = fullT0; if (nt0 + span > fullT1) nt0 = fullT1 - span;
      viewRef.current = { t0: nt0, t1: nt0 + span }; setIsFullView(false); drawFnRef.current();
    };
    const onMouseUp = () => { dragRef.current = null; };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      el.removeEventListener("wheel", onWheel); el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const handleResetView = useCallback(() => { viewRef.current = null; setIsFullView(true); drawFnRef.current(); }, []);

  const bdr = dark ? "1px solid #1e293b" : "1px solid #e5e7eb";
  const textCol = dark ? "#94a3b8" : "#374151";
  const mutCol  = dark ? "#475569" : "#9ca3af";
  const fs      = enlarged ? 12 : 10;

  const iconBtn = (title: string, onClick: () => void, label: string, active = false) => (
    <button onClick={onClick} title={title} style={{ background: active ? (dark ? "#0f1f40" : "#eff6ff") : "transparent", border: "none", color: active ? "#2563eb" : mutCol, cursor: "pointer", fontSize: enlarged ? 13 : 12, lineHeight: 1, padding: "1px 5px", borderRadius: 3, flexShrink: 0 }}>{label}</button>
  );

  const metricTabStyle = (active: boolean, color: string): React.CSSProperties => ({
    padding: "2px 8px", fontSize: enlarged ? 11 : 10, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700,
    background: active ? color : "transparent", color: active ? "#fff" : (dark ? "#475569" : "#9ca3af"),
    border: `1px solid ${active ? color : (dark ? "#1e293b" : "#d1d5db")}`,
    borderRadius: 3, cursor: "pointer", flexShrink: 0, lineHeight: 1.4,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", borderRight: bdr, minWidth: enlarged ? 0 : 210, flex: 1, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "4px 6px", borderBottom: bdr, flexShrink: 0 }}>
        <select value={config.componentName ?? ""} onChange={e => onChangeComponent(e.target.value || null)}
          style={{ flex: 1, minWidth: 0, background: dark ? "#0f172a" : "#f9fafb", border: dark ? "1px solid #1e293b" : "1px solid #d1d5db", color: textCol, borderRadius: 4, fontSize: fs, fontFamily: "'JetBrains Mono',monospace", padding: "2px 4px" }}>
          <option value="">{UI.chooseComp}</option>
          {liveNetlist.components.map(c => <option key={c.name} value={c.name}>{fmtNetlistComp(c)}</option>)}
        </select>
        <button onClick={() => onChangeMetric("tension")} title="Tension (V)" style={metricTabStyle(config.metric === "tension", "#2563eb")}>U</button>
        <button onClick={() => onChangeMetric("courant")} title="Courant (A)" style={metricTabStyle(config.metric === "courant", "#16a34a")}>I</button>
        {!isFullView && iconBtn("Vue complète (0 → fin)", handleResetView, "⟷")}
        {onExpand && !enlarged && iconBtn("Agrandir le graphique", onExpand, "⤢")}
        {iconBtn(enlarged ? "Fermer" : "Supprimer", onClose, "×")}
      </div>
      <div style={{ flex: 1, minHeight: 0, cursor: "grab" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>
    </div>
  );
}
