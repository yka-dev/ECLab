import type { AppState, Camera, DragBox } from "./types";
import { GRID, colSel, colHov } from "./constants";
import { s2w, w2s } from "./utils";
import { COMPONENT_DEFS } from "./componentDefs";
import { termWorlds, orthoRoute, snapToNearby, findJunctions } from "./geometry";

export function renderCanvas(
  ctx: CanvasRenderingContext2D,
  state: AppState,
  cam: Camera,
  hoverId: string | null,
  dragBox: DragBox | null,
): void {
  // Redessine toute la toile a partir de l'etat courant.
  const W = ctx.canvas.width / (window.devicePixelRatio || 1);
  const H = ctx.canvas.height / (window.devicePixelRatio || 1);
  const dark = state.darkMode;

  const bg         = dark ? "#0a0c14" : "#ffffff";
  const gridLine   = dark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.07)";
  const gridAccent = dark ? "rgba(255,255,255,.1)"  : "rgba(0,0,0,.18)";
  const wireCol    = dark ? "#94a3b8" : "#1e293b";
  const juncCol    = dark ? "#e2e8f0" : "#1e293b";
  const termAlpha  = dark ? "rgba(96,165,250,.5)"  : "rgba(37,99,235,.45)";

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  if (state.showGrid) {
    // Dessine seulement la partie visible de la grille.
    const tl = s2w(0, 0, cam), br = s2w(W, H, cam);
    const startX = Math.floor(tl.x / GRID) * GRID, startY = Math.floor(tl.y / GRID) * GRID;
    ctx.lineWidth = 0.5;
    for (let x = startX; x <= br.x + GRID; x += GRID) {
      ctx.strokeStyle = x % (GRID * 5) === 0 ? gridAccent : gridLine;
      const px = x * cam.z + cam.x;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
    }
    for (let y = startY; y <= br.y + GRID; y += GRID) {
      ctx.strokeStyle = y % (GRID * 5) === 0 ? gridAccent : gridLine;
      const py = y * cam.z + cam.y;
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
    }
  }

  for (const wire of state.wires) {
    // Dessine les fils avant les composants.
    const sel = state.selection.includes(wire.id);
    const hov = hoverId === wire.id;
    ctx.strokeStyle = sel ? colSel : hov ? colHov : wireCol;
    ctx.lineWidth = sel || hov ? 2.5 : 1.8;
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath();
    const pts = wire.points.map((p) => w2s(p.x, p.y, cam));
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  for (const comp of state.components) {
    // Chaque composant connait sa propre fonction de dessin.
    const def = COMPONENT_DEFS[comp.type];
    if (!def) continue;
    const sel = state.selection.includes(comp.id);
    const hov = hoverId === comp.id;
    const sp  = w2s(comp.position.x, comp.position.y, cam);

    if (sel) {
      // Encadre le composant selectionne.
      const ts = termWorlds(comp);
      const allX = [comp.position.x, ...ts.map((t) => t.x)];
      const allY = [comp.position.y, ...ts.map((t) => t.y)];
      const pad = GRID;
      const tl = w2s(Math.min(...allX) - pad, Math.min(...allY) - pad, cam);
      const br = w2s(Math.max(...allX) + pad, Math.max(...allY) + pad, cam);
      ctx.strokeStyle = "rgba(37,99,235,.35)"; ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]); ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y); ctx.setLineDash([]);
    }

    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate((comp.rotation * Math.PI) / 180);
    ctx.scale(cam.z, cam.z);
    def.draw(ctx, comp, sel, hov);
    ctx.restore();

    for (const t of termWorlds(comp)) {
      // Affiche les bornes pour aider au raccordement.
      const ts = w2s(t.x, t.y, cam);
      ctx.beginPath(); ctx.arc(ts.x, ts.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = sel ? "rgba(37,99,235,.8)" : hov ? "rgba(124,58,237,.6)" : termAlpha;
      ctx.fill();
    }
  }

  for (const j of findJunctions(state.components, state.wires)) {
    // Un point plein montre une vraie jonction electrique.
    const js = w2s(j.x, j.y, cam);
    ctx.beginPath(); ctx.arc(js.x, js.y, 4.5 * cam.z, 0, Math.PI * 2);
    ctx.fillStyle = juncCol; ctx.fill();
  }

  if (state.tool === "wire" && state.wirePoints.length > 0) {
    // Apercu du fil pendant sa creation.
    const endPt = snapToNearby(state.components, state.wires, state.mouseWorld);
    const chain = [...state.wirePoints, endPt];
    ctx.strokeStyle = "rgba(37,99,235,.75)"; ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]); ctx.lineCap = "round";
    ctx.beginPath();
    let first = true;
    for (let i = 0; i < chain.length - 1; i++) {
      const seg = orthoRoute(chain[i], chain[i + 1]);
      for (let j = 0; j < seg.length; j++) {
        const sp = w2s(seg[j].x, seg[j].y, cam);
        if (j === 0 && first) { ctx.moveTo(sp.x, sp.y); first = false; }
        else ctx.lineTo(sp.x, sp.y);
      }
    }
    ctx.stroke(); ctx.setLineDash([]);
    const fs = w2s(state.wirePoints[0].x, state.wirePoints[0].y, cam);
    ctx.beginPath(); ctx.arc(fs.x, fs.y, 5, 0, Math.PI * 2); ctx.fillStyle = colSel; ctx.fill();
    const ep = w2s(endPt.x, endPt.y, cam);
    ctx.beginPath(); ctx.arc(ep.x, ep.y, 4, 0, Math.PI * 2); ctx.fillStyle = "rgba(37,99,235,.55)"; ctx.fill();
  }

  if (state.tool === "place" && state.ghostPos && state.placingType) {
    // Apercu du composant avant de le placer.
    const def = COMPONENT_DEFS[state.placingType];
    const sp = w2s(state.ghostPos.x, state.ghostPos.y, cam);
    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate((state.ghostRot * Math.PI) / 180);
    ctx.scale(cam.z, cam.z);
    ctx.globalAlpha = 0.45;
    def.draw(ctx, { id: "__ghost__", type: state.placingType, position: { x: 0, y: 0 }, rotation: 0, props: def.defaultProps }, false, false);
    ctx.globalAlpha = 1; ctx.restore();
    ctx.strokeStyle = "rgba(37,99,235,.18)"; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(sp.x, 0); ctx.lineTo(sp.x, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, sp.y); ctx.lineTo(W, sp.y); ctx.stroke();
  }

  if (dragBox) {
    // Rectangle de selection multiple.
    const x = Math.min(dragBox.sx, dragBox.ex), y = Math.min(dragBox.sy, dragBox.ey);
    const w = Math.abs(dragBox.ex - dragBox.sx), h = Math.abs(dragBox.ey - dragBox.sy);
    ctx.fillStyle = "rgba(37,99,235,.07)"; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(37,99,235,.5)"; ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]); ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
  }
}
