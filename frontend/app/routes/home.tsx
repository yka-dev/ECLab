import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
import { useEffect } from "react";
import { createSimulationWorker } from "simulation";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {

  useEffect(() => {
    const worker = createSimulationWorker()

    worker.onmessage = (event) => {
      console.log("Message from worker:", event.data);
    };

    worker.postMessage({ type: "runTest" });
  }, []);
  return <Welcome />;
}
