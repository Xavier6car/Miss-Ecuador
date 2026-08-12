import { useEffect, useState } from 'react'

function toMillis(v) {
  if (!v) return null
  if (typeof v.toMillis === 'function') return v.toMillis()
  if (typeof v === 'number') return v
  const t = new Date(v).getTime()
  return Number.isNaN(t) ? null : t
}

/** Countdown en cajitas separadas (días/horas/min/seg), como en el mockup de Inicio. */
export default function CountdownBoxes({ deadline }) {
  const target = toMillis(deadline)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!target) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [target])

  if (!target) return null

  const diff = Math.max(0, target - now)
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)

  return (
    <div className="cd-boxes">
      <div className="cd-box">
        <span className="n">{d}</span>
        <span className="u">d</span>
      </div>
      <div className="cd-box">
        <span className="n">{h}</span>
        <span className="u">h</span>
      </div>
      <div className="cd-box">
        <span className="n">{m}</span>
        <span className="u">m</span>
      </div>
      <div className="cd-box">
        <span className="n">{s}</span>
        <span className="u">s</span>
      </div>
      <span className="text-dim" style={{ fontSize: 12.5, marginLeft: 6 }}>
        para el cierre
      </span>
    </div>
  )
}
