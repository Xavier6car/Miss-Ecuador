import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PHASES, PHASE_STATUS } from '../lib/constants'
import { listenCandidates, listenPhases, listenPhaseResults, listenPrediction } from '../lib/data'
import { scorePrediction } from '../lib/scoring'

function formatWhen(ts) {
  if (!ts?.toDate) return null
  return ts.toDate().toLocaleString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Resumen de las predicciones que YO envié en cada fase, con la hora de
 * envío y los puntos obtenidos si ya hay resultados publicados. A
 * diferencia de la pestaña "Predicción" (que solo muestra la fase activa y
 * oculta a las candidatas ya eliminadas del grid seleccionable), esta
 * pantalla lee el nombre de cada candidata elegida directamente de
 * `candidates` sin filtrar por estado, así que la selección de una fase
 * sigue siendo visible aunque esa candidata ya no haya avanzado.
 */
export default function MyPredictions() {
  const { profile } = useAuth()
  const [candidates, setCandidates] = useState([])
  const [phases, setPhases] = useState({})
  const [results, setResults] = useState({})
  const [predictions, setPredictions] = useState({})

  useEffect(() => listenCandidates(setCandidates), [])
  useEffect(() => listenPhases((key, data) => setPhases((prev) => ({ ...prev, [key]: data }))), [])
  useEffect(() => {
    const unsubs = PHASES.map((p) =>
      listenPhaseResults(p.key, (data) => setResults((prev) => ({ ...prev, [p.key]: data }))),
    )
    return () => unsubs.forEach((u) => u())
  }, [])
  useEffect(() => {
    if (!profile) return
    const unsubs = PHASES.map((p) =>
      listenPrediction(profile.id, p.key, (data) => setPredictions((prev) => ({ ...prev, [p.key]: data }))),
    )
    return () => unsubs.forEach((u) => u())
  }, [profile])

  const candidatesById = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates])

  function candidateLabel(id) {
    const c = candidatesById.get(id)
    if (!c) return '(candidata ya no disponible)'
    const tag = c.status === 'eliminated' ? ' · eliminada' : c.status === 'anulada' ? ' · anulada' : ''
    return `#${c.number ?? '-'} ${c.name}${tag}`
  }

  return (
    <div className="container">
      <h1 className="page-title">Mis predicciones</h1>
      <p className="page-subtitle">
        Lo que elegiste en cada fase, con la hora en que lo enviaste. Queda guardado aunque la fase
        ya haya cerrado.
      </p>

      {PHASES.map((phase) => {
        const status = phases[phase.key]?.status || PHASE_STATUS.CERRADA
        const prediction = predictions[phase.key]
        const result = results[phase.key]
        const scoreInfo = result && prediction ? scorePrediction(phase.key, prediction, result) : null
        const submittedAt = formatWhen(prediction?.submittedAt)

        return (
          <div className="card" key={phase.key} style={{ marginBottom: 16 }}>
            <div className="flex-between" style={{ flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h3 style={{ marginBottom: 2 }}>{phase.shortLabel} · {phase.label}</h3>
                {submittedAt && (
                  <p className="text-dim" style={{ margin: 0, fontSize: 12 }}>Enviado: {submittedAt}</p>
                )}
              </div>
              <div className="flex gap-8" style={{ alignItems: 'center' }}>
                <StatusBadge status={status} />
                {status === PHASE_STATUS.ABIERTA && (
                  <Link className="btn btn-sm" to={`/prediccion/${phase.key}`}>
                    {prediction ? 'Editar' : 'Elegir'}
                  </Link>
                )}
              </div>
            </div>

            {!prediction ? (
              <p className="text-dim" style={{ marginTop: 10 }}>
                Todavía no has enviado tu predicción para esta fase.
              </p>
            ) : phase.podium ? (
              <div className="podium-select-row">
                <div>
                  <span className="text-dim" style={{ fontSize: 12 }}>🥇 Ganadora</span>
                  <p style={{ margin: '2px 0 0' }}>
                    {prediction.podium?.winner ? candidateLabel(prediction.podium.winner) : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-dim" style={{ fontSize: 12 }}>🥈 1ra Finalista</span>
                  <p style={{ margin: '2px 0 0' }}>
                    {prediction.podium?.first ? candidateLabel(prediction.podium.first) : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-dim" style={{ fontSize: 12 }}>🥉 2da Finalista</span>
                  <p style={{ margin: '2px 0 0' }}>
                    {prediction.podium?.second ? candidateLabel(prediction.podium.second) : '—'}
                  </p>
                </div>
              </div>
            ) : (
              <p style={{ marginTop: 10 }}>
                {(prediction.picks || []).map(candidateLabel).join(', ') || '—'}
              </p>
            )}

            {scoreInfo && (
              <div className="alert alert-success" style={{ marginTop: 12 }}>
                Obtuviste <strong>{scoreInfo.points} puntos</strong> en esta fase.
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    [PHASE_STATUS.ABIERTA]: ['badge-open', 'Abierta'],
    [PHASE_STATUS.CERRADA]: ['badge-closed', 'Cerrada'],
    [PHASE_STATUS.PUBLICADA]: ['badge-published', 'Resultados publicados'],
  }
  const [cls, label] = map[status] || ['', status]
  return <span className={`badge ${cls}`}>{label}</span>
}
