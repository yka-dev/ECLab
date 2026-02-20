import { useEffect, useState } from 'react'
import { NavLink } from 'react-router'
import { createSimulationWorker } from 'simulation';

function Application() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const worker = createSimulationWorker()
    worker.onmessage = (e) => {
      console.log('Result:', e.data);
    }
    const input = {test : 5}
    worker.postMessage(input)
  })

  return (
<>ECLAB APPLICATION</>
  )
}

export default Application
