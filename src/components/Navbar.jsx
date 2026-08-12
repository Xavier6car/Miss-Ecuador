import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { profile, canManageCandidates, isAdmin, logout } = useAuth()

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="brand">
          <span className="brand-badge">ME</span>
          Miss Universo Ecuador
        </NavLink>
        <nav className="nav-links">
          <NavLink to="/candidatas" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Candidatas
          </NavLink>
          <NavLink to="/prediccion/phase1" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Mis predicciones
          </NavLink>
          <NavLink to="/ranking" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Ranking
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
            <span>{profile.name}</span>
            <span className="role-pill">{profile.role}</span>
            <button className="btn btn-sm" onClick={logout}>
              Salir
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
