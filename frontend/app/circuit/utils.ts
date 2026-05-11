import type { Vec2, Camera } from "./types";
import { GRID } from "./constants";

// Petits helpers reutilises par l'editeur.
export const snap    = (v: number): number => Math.round(v / GRID) * GRID;
export const snapVec = (v: Vec2): Vec2 => ({ x: snap(v.x), y: snap(v.y) });
export const dist    = (a: Vec2, b: Vec2): number => Math.hypot(b.x - a.x, b.y - a.y);
export const uid     = (): string => Math.random().toString(36).slice(2, 9);

// Convertit une position ecran vers le monde du circuit.
export const s2w = (sx: number, sy: number, cam: Camera): Vec2 => ({
  x: (sx - cam.x) / cam.z,
  y: (sy - cam.y) / cam.z,
});
// Convertit une position du monde vers l'ecran.
export const w2s = (wx: number, wy: number, cam: Camera): Vec2 => ({
  x: wx * cam.z + cam.x,
  y: wy * cam.z + cam.y,
});

export function fmtOhm(v: number): string {
  // Affiche une resistance avec une unite lisible.
  if (v >= 1e6) return `${+(v / 1e6).toPrecision(3)}MΩ`;
  if (v >= 1e3) return `${+(v / 1e3).toPrecision(3)}kΩ`;
  return `${+v.toPrecision(3)}Ω`;
}
export function fmtFarad(v: number): string {
  // Affiche une capacite avec une unite lisible.
  if (v >= 1)    return `${+v.toPrecision(3)}F`;
  if (v >= 1e-3) return `${+(v * 1e3).toPrecision(3)}mF`;
  if (v >= 1e-6) return `${+(v * 1e6).toPrecision(3)}μF`;
  return `${+(v * 1e9).toPrecision(3)}nF`;
}
export function fmtHenry(v: number): string {
  // Affiche une inductance avec une unite lisible.
  if (v >= 1)    return `${+v.toPrecision(3)}H`;
  if (v >= 1e-3) return `${+(v * 1e3).toPrecision(3)}mH`;
  return `${+(v * 1e6).toPrecision(3)}μH`;
}
