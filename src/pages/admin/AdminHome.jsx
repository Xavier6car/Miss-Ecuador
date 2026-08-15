import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import Candidates from '../Candidates'
import AdminPhases from './AdminPhases'
import AdminRoles from './AdminRoles'
import AdminActivity from './AdminActivity'

export default function AdminHome() {
  const { isAdmin, canManageCandidates } = useAuth()
  const [tab, setTab] = useState('candidatas')

  return (
    <div className="container">
      <h1 className="page-title">Administración</h1>
      <p className="page-subtitle">
        {isAdmin ? 'Control total del certamen.' : 'Puedes cargar y editar candidatas.'}
      </p>

      <div className="tabs">
        <button className={`tab${tab === 'candidatas' ? ' active' : ''}`} onClick={() => setTab('candidatas')}>
          Candidatas
        </button>
        {canManageCandidates && (
          <button className={`tab${tab === 'actividad' ? ' active' : ''}`} onClick={() => setTab('actividad')}>
            Actividad
          </button>
        )}
        {isAdmin && (
          <>
            <button className={`tab${tab === 'fases' ? ' active' : ''}`} onClick={() => setTab('fases')}>
              Fases y resultados
            </button>
            <button className={`tab${tab === 'roles' ? ' active' : ''}`} onClick={() => setTab('roles')}>
              Roles
            </button>
          </>
        )}
      </div>

      {tab === 'candidatas' && <Candidates embedded />}
      {tab === 'actividad' && canManageCandidates && <AdminActivity />}
      {tab === 'fases' && isAdmin && <AdminPhases />}
      {tab === 'roles' && isAdmin && <AdminRoles />}
    </div>
  )
}
