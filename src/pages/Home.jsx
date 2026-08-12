import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useActivePhase } from '../hooks/useActivePhase'
import Countdown from '../components/Countdown'

export default function Home() {
  const { profile } = useAuth()
  const { activePhaseKey, activePhase, phases, isAnyPhaseOpen } = useActivePhase()
  const activePhaseState = phases[activePhaseKey]

  return (
    <div className="container">
      <span className="home-greeting-label">Bienvenida de vuelta</span>
      <h1 className="home-greeting">Hola, {profile?.name?.split(' ')[0] || 'de vuelta'}</h1>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="flex-between" style={{ marginBottom: isAnyPhaseOpen ? 14 : 0 }}>
          <div>
            <span className="eyebrow">Fase activa</span>
            <h3 style={{ margin: 0 }}>
              {activePhase.shortLabel} · {activePhase.label}
            </h3>
          </div>
          <span className={`badge ${isAnyPhaseOpen ? 'badge-open' : 'badge-closed'}`}>
            {isAnyPhaseOpen ? '● En curso' : 'Sin fase abierta'}
          </span>
        </div>
        {isAnyPhaseOpen && activePhaseState?.deadline && (
          <p style={{ margin: 0 }}>
            <Countdown deadline={activePhaseState.deadline} /> <span className="text-dim">para el cierre</span>
          </p>
        )}
        {!isAnyPhaseOpen && (
          <p className="text-dim" style={{ margin: 0 }}>
            El admin todavía no abre ninguna fase. Vuelve pronto.
          </p>
        )}
      </div>

      <Link to={`/prediccion/${activePhaseKey}`} className="card home-action-card primary">
        <span className="icon">🎯</span>
        <div>
          <div className="label">Hacer mi predicción</div>
          <div className="sublabel">{activePhase.shortLabel} · {activePhase.label}</div>
        </div>
      </Link>

      <Link to="/candidatas" className="card home-action-card">
        <span className="icon">👥</span>
        <div>
          <div className="label">Ver candidatas</div>
          <div className="sublabel">Las 26 participantes</div>
        </div>
      </Link>

      <Link to="/ranking" className="card home-action-card">
        <span className="icon">🏆</span>
        <div>
          <div className="label">Ver ranking</div>
          <div className="sublabel">Cómo vas contra el resto</div>
        </div>
      </Link>
    </div>
  )
}
