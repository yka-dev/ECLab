import { useRef, useEffect, useState } from "react"
import { Button } from "~/components/ui/button"
import { ButtonGroup } from "~/components/ui/button-group"
import { PlusIcon } from "lucide-react"
import { FiPlay, FiEye, FiPlus, FiZap, FiSettings, FiStop } from "react-icons/fi"
import { PiCursor, PiHandGrabbing, PiPause, PiPolygon } from "react-icons/pi"
import { LuSettings } from "react-icons/lu"

export default function Application() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [runActive, setRunActive] = useState(false)
  const [pauseActive, setPauseActive] = useState(false)

  const toggleRun = () => {
    setRunActive((prev) => {
      const next = !prev
      if (next) {
        // starting run -> ensure not paused
        setPauseActive(false)
      }
      return next
    })
  }

  const togglePause = () => {
    setPauseActive((prev) => {
      const next = !prev
      if (next) {
        // just paused -> stop running
        setRunActive(false)
      } else {
        // resumed (Continuer) -> start running
        setRunActive(true)
      }
      return next
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 relative overflow-hidden">
     
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      />

     
      <aside className="fixed left-6 top-16 bottom-16 w-64 bg-white/80 backdrop-blur-md border border-slate-200 rounded-lg shadow-xl p-4 flex flex-col gap-4 z-40">
        <div>
          <h3 className="text-lg font-semibold">Playground</h3>
          <p className="text-sm text-slate-500">Quick access to tools and components</p>
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
          
          
          <div className="relative flex items-center justify-center group">
            <Button
              variant="ghost"
              aria-label="Quick add"
              className="p-2 hover:bg-slate-100/60 hover:scale-105 hover:shadow-sm transition"
            >
              <PiCursor className="h-4 w-4" />
            </Button>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-md bg-slate-800 text-white text-xs py-1 px-2 whitespace-nowrap opacity-0 scale-95 transform transition-all duration-150 group-hover:opacity-100 group-hover:scale-100"
            >
              Sélection
            </span>
          </div>

          
          <div className="relative flex items-center justify-center group">
            <Button
              variant="ghost"
              aria-label="Grab"
              className="p-2 hover:bg-slate-100/60 hover:scale-105 hover:shadow-sm transition"
            >
              <PiHandGrabbing className="h-4 w-4" />
            </Button>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-md bg-slate-800 text-white text-xs py-1 px-2 whitespace-nowrap opacity-0 scale-95 transform transition-all duration-150 group-hover:opacity-100 group-hover:scale-100"
            >
              Glisser
            </span>
          </div>

          
          <div className="relative flex items-center justify-center group">
            <Button
              variant="ghost"
              aria-label="Wires"
              className="p-2 hover:bg-slate-100/60 hover:scale-105 hover:shadow-sm transition"
            >
              <PiPolygon className="h-4 w-4" />
            </Button>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-md bg-slate-800 text-white text-xs py-1 px-2 whitespace-nowrap opacity-0 scale-95 transform transition-all duration-150 group-hover:opacity-100 group-hover:scale-100"
            >
                Fil électrique
            </span>
          </div>

          

          <div
            aria-hidden="true"
            className="mx-2 h-8 w-[1.5px] bg-slate-200/80 rounded-sm bg-gradient-to-b from-slate-300/95 to-slate-400/95 shadow-sm"
          />

          <Button
            variant="outline"
            onClick={toggleRun}
            disabled={pauseActive}
            aria-pressed={runActive}
            className={`flex items-center gap-2 px-3 ${runActive ? "bg-green-50 border-green-200" : ""} ${pauseActive ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {runActive ? <FiStop className="h-4 w-4" /> : <FiPlay className="h-4 w-4" />}
            {runActive ? " Stop" : " Démarrer"}
          </Button>
          
          <Button
            onClick={togglePause}
            disabled={runActive}
            aria-pressed={pauseActive}
            className={`flex items-center gap-2 px-3 ${pauseActive ? "bg-amber-50 border-amber-200" : ""} ${runActive ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {pauseActive ? <FiPlay className="h-4 w-4" /> : <PiPause className="h-4 w-4" />}
            {pauseActive ? " Continuer" : " Pause"}
          </Button>

          
          {/* Settings button with tooltip on hover */}
          <div className="relative flex items-center justify-center group">
            <Button
              variant="ghost"
              aria-label="Settings"
              className="p-2 hover:bg-slate-100/60 hover:scale-105 hover:shadow-sm transition"
            >
              <LuSettings className="h-4 w-4" />
            </Button>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-md bg-slate-800 text-white text-xs py-1 px-2 whitespace-nowrap opacity-0 scale-95 transform transition-all duration-150 group-hover:opacity-100 group-hover:scale-100"
            >
              Paramètres
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
