export function createSimulationWorker() {
  // Cree le worker qui lance la simulation en arriere plan.
  return new Worker(
    new URL('./worker.ts', import.meta.url),
    { type: 'module' }
  );
}
