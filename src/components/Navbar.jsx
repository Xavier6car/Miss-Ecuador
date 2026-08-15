import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useActivePhase } from '../hooks/useActivePhase'
import { useMyRank } from '../hooks/useMyRank'

export default function Navbar() {
  const { profile, canManageCandidates, isAdmin, logout } = useAuth()
  const { activePhaseKey } = useActivePhase()
  const { rank, total, totalPoints } = useMyRank()

  return (
    <header className="navbar">
      <NavLink to="/" end className="brand">
        <span className="brand-title">Miss Universo Ecuador</span>
        <span className="brand-subtitle">Predicciones</span>
      </NavLink>
      <nav className="nav-links">
        <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Inicio
        </NavLink>
        <NavLink to="/candidatas" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Candidatas
        </NavLink>
        <NavLink
          to={`/prediccion/${activePhaseKey}`}
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          Predicción
        </NavLink>
        <NavLink to="/ranking" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Ranking
        </NavLink>
        <NavLink to="/actividad" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Actividad
        </NavLink>
        <NavLink to="/reglas" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Reglas
        </NavLink>
        {(canManageCandidates || isAdmin) && (
          <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Administración
          </NavLink>
        )}
      </nav>
      {profile && (
        <div className="nav-user">
          <span className="stat-pill">
            <strong>{totalPoints.toLocaleString('es-EC')} pts</strong>
            {rank && total > 0 && (
              <>
                <span>·</span>
                <span>#{rank} de {total}</span>
              </>
            )}
          </span>
          <button className="btn btn-sm" onClick={logout}>
            Salir
          </button>
        </div>
      )}
    </header>
  )
}
