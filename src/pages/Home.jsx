import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useActivePhase } from '../hooks/useActivePhase'
import { useMyRank } from '../hooks/useMyRank'
import CountdownBoxes from '../components/CountdownBoxes'

export default function Home() {
  const { profile } = useAuth()
  const { activePhaseKey, activePhase, phases, isAnyPhaseOpen } = useActivePhase()
  const { rank, total, totalPoints } = useMyRank()
  const activePhaseState = phases[activePhaseKey]

  const progressPct = getElapsedPct(activePhaseState)

  return (
    <div className="container">
      <div>
        <span className="home-greeting-label">Bienvenida de vuelta</span>
        <h1 className="home-greeting">Hola, {profile?.name?.split(' ')[0] || ''}</h1>
      </div>

      <div className="phase-card">
        <div className="flex-between">
          <div>
            <div className="text-dim" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Fase activa
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 22, marginTop: 2 }}>
              {activePhase.shortLabel} · {activePhase.label}
            </div>
          </div>
          <span className="badge-open">{isAnyPhaseOpen ? 'En curso' : 'Sin fase abierta'}</span>
        </div>
        {isAnyPhaseOpen && activePhaseState?.deadline && (
          <>
            <CountdownBoxes deadline={activePhaseState.deadline} />
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </>
        )}
        {!isAnyPhaseOpen && (
          <p className="text-dim" style={{ margin: 0 }}>
            El admin todavía no abre ninguna fase. Vuelve pronto.
          </p>
        )}
      </div>

      <div className="home-actions">
        <Link to={`/prediccion/${activePhaseKey}`} className="home-action-card primary">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dcae66" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          <div className="label">Hacer mi predicción</div>
        </Link>

        <Link to="/candidatas" className="home-action-card">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f5efe6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <div className="label">Ver candidatas</div>
        </Link>

        <Link to="/ranking" className="home-action-card">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f5efe6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20h16" />
            <path d="M5.5 20L7 11l3 3 2-6 2 6 3-3 1.5 9" />
          </svg>
          <div className="label">Ver ranking</div>
        </Link>
      </div>

      <div className="home-stats">
        <div className="home-stat-card">
          <div className="home-stat-label">Tu puntaje</div>
          <div className="home-stat-value">
            {totalPoints.toLocaleString('es-EC')} <span className="unit">pts</span>
          </div>
        </div>
        <div className="home-stat-card">
          <div className="home-stat-label">Tu posición</div>
          <div className="home-stat-value">
            {rank ? `#${rank}` : '—'} <span className="unit">{total > 0 ? `de ${total}` : ''}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// % de tiempo transcurrido entre que se abrió la fase (createdAt/updatedAt del
// doc) y su deadline — solo de referencia visual, no afecta el bloqueo real.
function getElapsedPct(phaseState) {
  if (!phaseState?.deadline) return 0
  const start = phaseState.createdAt?.toMillis?.() ?? phaseState.updatedAt?.toMillis?.()
  const end = phaseState.deadline.toMillis()
  if (!start || end <= start) return 0
  const pct = ((Date.now() - start) / (end - start)) * 100
  return Math.min(100, Math.max(0, pct))
}
