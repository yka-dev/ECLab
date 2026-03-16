import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
import { useEffect } from "react";
import { createSimulationWorker } from "simulation";
import { toast } from "sonner";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  useEffect(() => {
    const worker = createSimulationWorker();

    worker.onmessage = (event) => {
      const result = event.data;

      if (result.error) {
        console.error("Erreur du worker de simulation :", result.error);
        return;
      }

      console.log("Tensions des nœuds :", result.nodeVoltages);
      console.log("Courants des sources :", result.sourceCurrents);
      console.log("Vecteur solution :", result.solutionVector);
    };

    worker.postMessage({ type: "runTest" });

  
  } , []);
  
  return (
    <div>
      <Welcome />
    </div>
  );
}
