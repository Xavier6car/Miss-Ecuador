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
import { PoolCard } from '../components/CandidateCard'
import Countdown from '../components/Countdown'

const PODIUM_ORDER = ['winner', 'first', 'second']
const PODIUM_LABELS = { winner: 'Ganadora', first: '1ra Finalista', second: '2da Finalista' }

function initials(name) {
  if (!name) return ''
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

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

  function assignNext(id) {
    if (isLocked) return
    const slotOf = PODIUM_ORDER.find((k) => podium[k] === id)
    if (slotOf) {
      setPodium((p) => ({ ...p, [slotOf]: '' }))
      return
    }
    const empty = PODIUM_ORDER.find((k) => !podium[k])
    if (!empty) return
    setPodium((p) => ({ ...p, [empty]: id }))
  }

  function clearSlot(key) {
    if (isLocked) return
    setPodium((p) => ({ ...p, [key]: '' }))
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

  const scoreInfo = ownResults && prediction ? scorePrediction(phase.key, prediction, ownResults) : null

  const canSubmit =
    !isLocked &&
    !saving &&
    (phase.podium ? podium.winner && podium.first && podium.second : picks.length === phase.pickCount)
  const progressPct = phase.podium
    ? (PODIUM_ORDER.filter((k) => podium[k]).length / 3) * 100
    : Math.min(100, (picks.length / phase.pickCount) * 100)

  const candidateById = (id) => universe.find((c) => c.id === id)

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
        <span className={`countdown-pill${isLocked ? ' locked' : ''}`}>
          {!isLocked && phaseState?.deadline ? (
            <>
              <Countdown deadline={phaseState.deadline} /> restantes
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Cerrado
            </>
          )}
        </span>
      </div>

      {isLocked ? (
        <div className="locked-block">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(245,239,230,0.6)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <div className="locked-block-title">Predicciones cerradas</div>
          <div className="locked-block-body">
            {status === PHASE_STATUS.PUBLICADA
              ? 'Los resultados de esta fase ya se publicaron.'
              : `El plazo para ${phase.label} venció. Tu predicción quedó registrada y se calificará con los resultados oficiales.`}
          </div>
        </div>
      ) : blockedByPrevPhase ? (
        <div className="alert alert-info" style={{ marginTop: 16 }}>
          Esta fase se habilita cuando el admin publique los resultados oficiales de {prevPhase.label}.
        </div>
      ) : (
        <>
          {!phase.podium && (
            <div className="flex" style={{ alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <div style={{ fontSize: 14 }}>
                Llevas <strong style={{ color: 'var(--gold)' }}>{picks.length}/{phase.pickCount}</strong>
              </div>
              <div className="progress-track" style={{ flex: 1, minWidth: 80, margin: 0 }}>
                <div className="progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}

          {phase.podium && (
            <>
              <div className="podium-row">
                <PodiumSlot slotKey="first" podium={podium} candidateById={candidateById} onClear={clearSlot} />
                <PodiumSlot slotKey="winner" podium={podium} candidateById={candidateById} onClear={clearSlot} />
                <PodiumSlot slotKey="second" podium={podium} candidateById={candidateById} onClear={clearSlot} />
              </div>
              <p className="podium-hint">
                Toca una candidata para asignarla al siguiente lugar libre. Toca un lugar lleno para vaciarlo.
              </p>
            </>
          )}

          <div className="grid candidates-grid" style={{ marginTop: 20 }}>
            {universe.map((c) => {
              if (phase.podium) {
                const slot = PODIUM_ORDER.find((k) => podium[k] === c.id)
                return (
                  <PoolCard
                    key={c.id}
                    candidate={c}
                    selected={Boolean(slot)}
                    assignedLabel={slot ? PODIUM_LABELS[slot] : null}
                    onClick={() => assignNext(c.id)}
                  />
                )
              }
              const selected = picks.includes(c.id)
              const disabled = !selected && picks.length >= phase.pickCount
              return (
                <PoolCard
                  key={c.id}
                  candidate={c}
                  selected={selected}
                  disabled={disabled}
                  onClick={() => togglePick(c.id)}
                />
              )
            })}
          </div>
          {universe.length === 0 && (
            <div className="alert alert-info" style={{ marginTop: 16 }}>
              Aún no hay candidatas disponibles para esta fase.
            </div>
          )}
        </>
      )}

      {scoreInfo && (
        <div className="alert alert-success" style={{ marginTop: 16 }}>
          Resultados publicados — obtuviste <strong>{scoreInfo.points} puntos</strong> en esta fase.
        </div>
      )}
      {message && <div className="alert alert-info" style={{ marginTop: 16 }}>{message}</div>}

      {!isLocked && !blockedByPrevPhase && (
        <>
          <div className="action-bar-spacer" />
          <div className="action-bar">
            <div className="action-bar-inner">
              <span className="text-dim">
                {phase.podium
                  ? canSubmit
                    ? 'Podio completo'
                    : 'Asigna las 3 posiciones'
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

function PodiumSlot({ slotKey, podium, candidateById, onClear }) {
  const isWinner = slotKey === 'winner'
  const candidate = candidateById(podium[slotKey])
  const size = isWinner ? 68 : 56
  return (
    <div
      className={`podium-slot${candidate ? ' filled' : ''}`}
      style={{ width: isWinner ? 128 : 108 }}
      onClick={candidate ? () => onClear(slotKey) : undefined}
    >
      <div className={`podium-slot-label${isWinner ? ' winner' : ''}`}>{PODIUM_LABELS[slotKey]}</div>
      <div className={`podium-avatar${candidate ? ' filled' : ''}`} style={{ width: size, height: size, fontSize: isWinner ? 22 : 18 }}>
        {candidate ? initials(candidate.name) : ''}
      </div>
      <div className="podium-slot-name">{candidate ? candidate.name : `Elige ${PODIUM_LABELS[slotKey]}`}</div>
      <div className={`podium-pedestal${isWinner ? ' winner' : ''}`} style={{ height: isWinner ? 78 : slotKey === 'first' ? 56 : 40 }}>
        {isWinner ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dcae66" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 20h20" />
            <path d="M5 20l1.4-8.6L9.5 14l2.5-6 2.5 6 3.1-2.6L19 20" />
          </svg>
        ) : slotKey === 'first' ? (
          '2'
        ) : (
          '3'
        )}
      </div>
    </div>
  )
}
