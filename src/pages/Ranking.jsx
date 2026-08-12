import { useEffect, useState } from 'react'
import { listenRanking } from '../lib/data'
import { PHASES } from '../lib/constants'
import { useAuth } from '../context/AuthContext'

export default function Ranking() {
  const { profile } = useAuth()
  const [users, setUsers] = useState([])

  useEffect(() => listenRanking(setUsers), [])

  return (
    <div className="container">
      <h1 className="page-title">Ranking general</h1>
      <p className="page-subtitle">Se actualiza en tiempo real apenas el admin publica resultados oficiales.</p>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Participante</th>
              {PHASES.map((p) => (
                <th key={p.key}>{p.shortLabel}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} className={u.id === profile?.id ? 'rank-row-me' : ''}>
                <td className="rank-pos">{i + 1}</td>
                <td>{u.name}</td>
                {PHASES.map((p) => (
                  <td key={p.key}>{u.pointsByPhase?.[p.key] ?? '—'}</td>
                ))}
                <td>
                  <strong>{u.totalPoints ?? 0}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="text-dim">Todavía no hay participantes registrados.</p>}
      </div>
    </div>
  )
}
