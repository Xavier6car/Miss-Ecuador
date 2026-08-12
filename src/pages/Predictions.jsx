import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PHASES, PHASE_STATUS, previousPhase } from '../lib/constants'
import {
  listenCandidates,
  listenPhases,
  listenPhaseResults,
  listenPrediction,
  savePrediction,
} from '../lib/data'
import { scorePrediction } from '../lib/scoring'
import CandidateCard from '../components/CandidateCard'
import Countdown from '../components/Countdown'

export default function Predictions() {
  const { phaseKey } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [candidates, setCandidates] = useState([])
  const [phases, setPhases] = useState({})
  const [prevResults, setPrevResults] = useState(null)
  const [ownResults, setOwnResults] = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [picks, setPicks] = useState([])
  const [podium, setPodium] = useState({ winner: '', first: '', second: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const phase = PHASES.find((p) => p.key === phaseKey) || PHASES[0]
  const prevPhase = previousPhase(phase.key)

  useEffect(() => listenCandidates(setCandidates), [])
  useEffect(() => listenPhases((key, data) => setPhases((prev) => ({ ...prev, [key]: data }))), [])
  useEffect(() => {
    if (!prevPhase) {
      setPrevResults(null)
      return
    }
    return listenPhaseResults(prevPhase.key, setPrevResults)
  }, [prevPhase])
  useEffect(() => listenPhaseResults(phase.key, setOwnResults), [phase.key])

  useEffect(() => {
    if (!profile) return
    return listenPrediction(profile.id, phase.key, (pred) => {
      setPrediction(pred)
      setPicks(pred?.picks || [])
      setPodium(pred?.podium || { winner: '', first: '', second: '' })
    })
  }, [profile, phase.key])

  const phaseState = phases[phase.key]
  const status = phaseState?.status || PHASE_STATUS.CERRADA
  const deadlinePassed = phaseState?.deadline ? phaseState.deadline.toMillis() < Date.now() : false
  const isLocked = status !== PHASE_STATUS.ABIERTA || deadlinePassed

  // Universo de candidatas elegibles: en fase 1, todas las activas.
  // En fases siguientes, solo las que el admin marcó como oficialmente avanzadas.
  const universe = useMemo(() => {
    if (!prevPhase) return candidates.filter((c) => c.status !== 'eliminated')
    const officialIds = new Set(prevResults?.officialPicks || [])
    return candidates.filter((c) => officialIds.has(c.id))
  }, [candidates, prevPhase, prevResults])

  const blockedByPrevPhase = prevPhase && !prevResults

  function togglePick(id) {
    if (isLocked) return
    setPicks((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id)
      if (current.length >= phase.pickCount) return current
      return [...current, id]
    })
  }

  async function handleSubmit() {
    setMessage('')
    setSaving(true)
    try {
      if (phase.podium) {
        await savePrediction(profile.id, phase.key, { podium, locked: false })
      } else {
        await savePrediction(profile.id, phase.key, { picks, locked: false })
      }
      setMessage('¡Predicción guardada!')
    } catch (err) {
      setMessage('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const scoreInfo =
    ownResults && prediction ? scorePrediction(phase.key, prediction, ownResults) : null

  const podiumOptions = universe

  const canSubmit =
    !isLocked &&
    !saving &&
    (phase.podium
      ? podium.winner && podium.first && podium.second
      : picks.length === phase.pickCount)
  const progressPct = phase.podium
    ? (['winner', 'first', 'second'].filter((k) => podium[k]).length / 3) * 100
    : Math.min(100, (picks.length / phase.pickCount) * 100)

  return (
    <div className="container">
      <div className="tabs">
        {PHASES.map((p) => (
          <button
            key={p.key}
            className={`tab${p.key === phase.key ? ' active' : ''}`}
            onClick={() => navigate(`/prediccion/${p.key}`)}
          >
            {p.shortLabel} · {p.label}
          </button>
        ))}
      </div>

      <div className="flex-between" style={{ alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <span className="eyebrow">
            {phase.shortLabel} · {phase.label.toUpperCase()}
          </span>
          <h1 className="phase-heading">{phase.description}</h1>
        </div>
        {phaseState?.deadline && status === PHASE_STATUS.ABIERTA ? (
          <span className="countdown-pill">
            <Countdown deadline={phaseState.deadline} /> restantes
          </span>
        ) : (
          <StatusBadge status={status} />
        )}
      </div>

      {!phase.podium && (
        <>
          <p style={{ margin: 0 }}>
            Llevas <strong>{picks.length}</strong>/{phase.pickCount}
          </p>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </>
      )}

      {scoreInfo && (
        <div className="alert alert-success" style={{ marginTop: 16 }}>
          Resultados publicados — obtuviste <strong>{scoreInfo.points} puntos</strong> en esta fase.
        </div>
      )}
      {isLocked && (
        <div className="alert alert-info" style={{ marginTop: 16 }}>
          {status === PHASE_STATUS.PUBLICADA
            ? 'Los resultados de esta fase ya se publicaron.'
            : 'Esta fase está cerrada — no se pueden hacer ni editar predicciones.'}
        </div>
      )}
      {message && <div className="alert alert-info" style={{ marginTop: 16 }}>{message}</div>}

      {blockedByPrevPhase ? (
        <div className="alert alert-info" style={{ marginTop: 16 }}>
          Esta fase se habilita cuando el admin publique los resultados oficiales de{' '}
          {prevPhase.label}.
        </div>
      ) : !phase.podium ? (
        <>
          <div className="grid candidates-grid" style={{ marginTop: 20 }}>
            {universe.map((c) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                selectable={!isLocked}
                selected={picks.includes(c.id)}
                onToggle={() => togglePick(c.id)}
              />
            ))}
          </div>
          {universe.length === 0 && (
            <div className="alert alert-info" style={{ marginTop: 16 }}>
              Aún no hay candidatas disponibles para esta fase.
            </div>
          )}
        </>
      ) : (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="podium-select-row">
            <PodiumSelect
              label="🥇 Ganadora (50 pts)"
              value={podium.winner}
              options={podiumOptions}
              disabled={isLocked}
              onChange={(v) => setPodium({ ...podium, winner: v })}
            />
            <PodiumSelect
              label="🥈 1ra Finalista (30 pts)"
              value={podium.first}
              options={podiumOptions}
              disabled={isLocked}
              onChange={(v) => setPodium({ ...podium, first: v })}
            />
            <PodiumSelect
              label="🥉 2da Finalista (20 pts)"
              value={podium.second}
              options={podiumOptions}
              disabled={isLocked}
              onChange={(v) => setPodium({ ...podium, second: v })}
            />
          </div>
        </div>
      )}

      {!isLocked && !blockedByPrevPhase && (
        <>
          <div className="action-bar-spacer" />
          <div className="action-bar">
            <div className="action-bar-inner">
              <span className="text-dim">
                {phase.podium
                  ? `${['winner', 'first', 'second'].filter((k) => podium[k]).length}/3 seleccionadas`
                  : `${picks.length}/${phase.pickCount} seleccionadas`}
              </span>
              <button className="btn btn-primary" disabled={!canSubmit} onClick={handleSubmit}>
                {prediction ? 'Actualizar predicción' : 'Enviar predicción'}
              </button>
            </div>
          </div>
        </>
      )}
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

function PodiumSelect({ label, value, options, disabled, onChange }) {
  return (
    <div className="form-row">
      <label>{label}</label>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        <option value="">-- Selecciona --</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            #{c.number} {c.name}
          </option>
        ))}
      </select>
    </div>
  )
}
