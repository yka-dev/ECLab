/**
 * Point d'entrée exporté du package : crée un Worker de simulation (module).
 */
export function createSimulationWorker() {
  return new Worker(
    new URL('./worker.ts', import.meta.url),
    { type: 'module' }
  );
}