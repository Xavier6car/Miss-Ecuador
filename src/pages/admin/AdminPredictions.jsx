import { useEffect, useMemo, useState } from 'react'
import { PHASES } from '../../lib/constants'
import { listenAllPredictions, listenCandidates, listenUsers } from '../../lib/data'

function formatWhen(ts) {
  if (!ts?.toDate) return '—'
  return ts.toDate().toLocaleString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Registro de qué eligió cada participante en cada fase, con la hora en que
 * envió (o actualizó) su predicción — así queda constancia de las
 * selecciones, incluso después de que la fase cierre. También muestra quién
 * todavía no ha enviado la suya. Solo visible para admin: las reglas de
 * Firestore no dejan a un colaborador leer las predicciones de otros
 * usuarios (ver `match /predictions/{predictionId}` en firestore.rules).
 */
export default function AdminPredictions() {
  const [phaseKey, setPhaseKey] = useState(PHASES[0].key)
  const [predictions, setPredictions] = useState([])
  const [users, setUsers] = useState([])
  const [candidates, setCandidates] = useState([])

  useEffect(() => listenAllPredictions(setPredictions), [])
  useEffect(() => listenUsers(setUsers), [])
  useEffect(() => listenCandidates(setCandidates), [])

  const phase = PHASES.find((p) => p.key === phaseKey) || PHASES[0]
  const candidatesById = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates])

  function candidateLabel(id) {
    const c = candidatesById.get(id)
    return c ? `#${c.number ?? '-'} ${c.name}` : '(candidata ya no disponible)'
  }

  const rows = useMemo(() => {
    const byUser = new Map(predictions.filter((p) => p.phase === phase.key).map((p) => [p.userId, p]))
    return users
      .map((u) => ({ user: u, prediction: byUser.get(u.id) || null }))
      .sort((a, b) => {
        if (Boolean(a.prediction) !== Boolean(b.prediction)) return a.prediction ? -1 : 1
        return (a.user.name || '').localeCompare(b.user.name || '')
      })
  }, [predictions, users, phase.key])

  const sentCount = rows.filter((r) => r.prediction).length

  return (
    <div>
      <div className="tabs">
        {PHASES.map((p) => (
          <button
            key={p.key}
            className={`tab${p.key === phaseKey ? ' active' : ''}`}
            onClick={() => setPhaseKey(p.key)}
          >
            {p.shortLabel} · {p.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <div className="flex-between" style={{ marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
          <p className="text-dim" style={{ margin: 0 }}>
            Qué eligió cada participante en {phase.label}. Queda registrado con la hora de envío,
            aunque la fase ya haya cerrado.
          </p>
          <span className="badge">{sentCount}/{rows.length} enviadas</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Participante</th>
              {phase.podium ? (
                <>
                  <th>🥇 Ganadora</th>
                  <th>🥈 1ra Finalista</th>
                  <th>🥉 2da Finalista</th>
                </>
              ) : (
                <th>Selección ({phase.pickCount})</th>
              )}
              <th>Enviado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ user, prediction }) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                {phase.podium ? (
                  <>
                    <td>{prediction?.podium?.winner ? candidateLabel(prediction.podium.winner) : '—'}</td>
                    <td>{prediction?.podium?.first ? candidateLabel(prediction.podium.first) : '—'}</td>
                    <td>{prediction?.podium?.second ? candidateLabel(prediction.podium.second) : '—'}</td>
                  </>
                ) : (
                  <td>
                    {prediction?.picks?.length ? (
                      prediction.picks.map(candidateLabel).join(', ')
                    ) : (
                      <span className="text-dim">Sin enviar</span>
                    )}
                  </td>
                )}
                <td>{formatWhen(prediction?.submittedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="text-dim">Todavía no hay participantes registrados.</p>}
      </div>
    </div>
  )
}
