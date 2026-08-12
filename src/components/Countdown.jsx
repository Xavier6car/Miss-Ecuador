import { useEffect, useState } from 'react'

function toMillis(deadline) {
  if (!deadline) return null
  if (typeof deadline.toMillis === 'function') return deadline.toMillis()
  if (typeof deadline === 'number') return deadline
  const t = new Date(deadline).getTime()
  return Number.isNaN(t) ? null : t
}

export default function Countdown({ deadline }) {
  const target = toMillis(deadline)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!target) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [target])

  if (!target) return <span className="text-dim">Sin deadline configurado</span>

  const diff = target - now
  if (diff <= 0) return <span className="countdown">¡Tiempo cumplido!</span>

  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)

  return (
    <span className="countdown">
      {days > 0 && `${days}d `}
      {String(hours).padStart(2, '0')}h {String(minutes).padStart(2, '0')}m{' '}
      {String(seconds).padStart(2, '0')}s
    </span>
  )
}
