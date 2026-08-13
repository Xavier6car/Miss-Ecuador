import { useEffect, useMemo, useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { PHASES, PHASE_STATUS, previousPhase } from '../../lib/constants'
import {
  listenCandidates,
  listenPhases,
  listenPhaseResults,
  setPhaseConfig,
  publishPhaseResultsAndRecalculate,
  unpublishPhaseResults,
  ensurePhaseDocs,
} from '../../lib/data'
import { PoolCard } from '../../components/CandidateCard'

export default function AdminPhases() {
  const [candidates, setCandidates] = useState([])
  const [phases, setPhases] = useState({})
  const [results, setResults] = useState({})

  // Crea los documentos de fase la primera vez (si todavía no existen),
  // para que "Abrir fase" siempre tenga sobre qué escribir.
  useEffect(() => {
    ensurePhaseDocs().catch(() => {})
  }, [])
  useEffect(() => listenCandidates(setCandidates), [])
  useEffect(() => listenPhases((key, data) => setPhases((prev) => ({ ...prev, [key]: data }))), [])
  useEffect(() => {
    const unsubs = PHASES.map((p) => listenPhaseResults(p.key, (data) => setResults((prev) => ({ ...prev, [p.key]: data }))))
    return () => unsubs.forEach((u) => u())
  }, [])

  // Autolimpieza: si una fase quedó marcada 'abierta' pero con un deadline
  // vencido de antes (p. ej. de una prueba, o de antes de este arreglo), se
  // limpia sola en cuanto se carga este panel — ya no depende de que el
  // admin vuelva a tocar "Abrir fase" en cada una para que se corrija.
  useEffect(() => {
    for (const phase of PHASES) {
      const state = phases[phase.key]
      if (state?.status === PHASE_STATUS.ABIERTA && state.deadline && state.deadline.toMillis() < Date.now()) {
        setPhaseConfig(phase.key, { deadline: null }).catch(() => {})
      }
    }
  }, [phases])

  const activePhases = PHASES.filter((p) => phases[p.key]?.status === PHASE_STATUS.ABIERTA)

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 8 }}>Fase activa</h3>
        {activePhases.length === 0 ? (
          <p className="text-dim" style={{ margin: 0 }}>
            Ninguna fase está abierta ahora mismo — los usuarios no pueden elegir candidatas en
            ninguna fase. Abre una fase abajo para habilitar las predicciones.
          </p>
        ) : (
          <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
            {activePhases.map((p) => (
              <span key={p.key} className="badge badge-open">
                {p.shortLabel} · {p.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {PHASES.map((phase) => (
        <PhaseAdminCard
          key={phase.key}
          phase={phase}
          candidates={candidates}
          phaseState={phases[phase.key]}
          prevResult={previousPhase(phase.key) ? results[previousPhase(phase.key).key] : null}
          result={results[phase.key]}
        />
      ))}
    </div>
  )
}

function PhaseAdminCard({ phase, candidates, phaseState, prevResult, result }) {
  const [deadlineInput, setDeadlineInput] = useState('')
  const [officialPicks, setOfficialPicks] = useState(result?.officialPicks || [])
  const [podium, setPodium] = useState(result?.podium || { winner: '', first: '', second: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (phaseState?.deadline) {
      const d = phaseState.deadline.toDate()
      setDeadlineInput(toLocalInputValue(d))
    }
  }, [phaseState?.deadline])

  useEffect(() => {
    setOfficialPicks(result?.officialPicks || [])
    setPodium(result?.podium || { winner: '', first: '', second: '' })
  }, [result])

  const prevPhase = previousPhase(phase.key)
  const universe = useMemo(() => {
    if (!prevPhase) return candidates
    const ids = new Set(prevResult?.officialPicks || [])
    return candidates.filter((c) => ids.has(c.id))
  }, [candidates, prevPhase, prevResult])

  const status = phaseState?.status || PHASE_STATUS.CERRADA

  async function updateStatus(newStatus) {
    setBusy(true)
    try {
      const patch = { status: newStatus }
      // Si se está abriendo la fase y quedó un deadline vencido de antes (p.ej.
      // de una prueba), hay que limpiarlo: si no, la fase queda "Abierta" en el
      // panel de admin pero sigue bloqueada para los usuarios.
      const deadline = phaseState?.deadline
      if (newStatus === PHASE_STATUS.ABIERTA && deadline && deadline.toMillis() < Date.now()) {
        patch.deadline = null
        setDeadlineInput('')
      }
      await setPhaseConfig(phase.key, patch)
    } finally {
      setBusy(false)
    }
  }

  async function saveDeadline() {
    setBusy(true)
    try {
      const date = deadlineInput ? new Date(deadlineInput) : null
      await setPhaseConfig(phase.key, { deadline: date ? Timestamp.fromDate(date) : null })
      setMsg('Deadline actualizado.')
    } finally {
      setBusy(false)
    }
  }

  function togglePick(id) {
    setOfficialPicks((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id)
      if (current.length >= phase.pickCount) return current
      return [...current, id]
    })
  }

  const hasSelection = phase.podium
    ? Boolean(podium.winner && podium.first && podium.second)
    : officialPicks.length > 0
  const hasPublishedResult = Boolean(result) || status === PHASE_STATUS.PUBLICADA

  async function publish() {
    if (!hasSelection) {
      setMsg(
        phase.podium
          ? 'Elige las 3 posiciones del podio antes de publicar.'
          : 'Selecciona al menos una candidata antes de publicar.',
      )
      return
    }
    const advancingCount = phase.podium ? 3 : officialPicks.length
    const eliminatedCount = universe.length - advancingCount
    if (eliminatedCount > 0) {
      const ok = window.confirm(
        `Se van a marcar como "Eliminada" las ${eliminatedCount} candidatas de ${phase.label} que no seleccionaste. Ya no aparecerán disponibles en la siguiente fase. ¿Continuar?`,
      )
      if (!ok) return
    }
    setBusy(true)
    setMsg('')
    try {
      const payload = phase.podium ? { podium } : { officialPicks }
      await publishPhaseResultsAndRecalculate(phase.key, payload)
      setMsg('Resultados publicados, candidatas eliminadas actualizadas y puntos recalculados para todos los usuarios.')
    } catch (err) {
      setMsg('Error: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleUnpublish() {
    const ok = window.confirm(
      `¿Anular los resultados de ${phase.label}? Esto borra el resultado oficial de esta fase, pone en 0 los puntos que ganaron todos los jugadores en ella y reactiva las candidatas que se habían marcado como eliminadas por este corte. No se puede deshacer.`,
    )
    if (!ok) return
    setBusy(true)
    setMsg('')
    try {
      await unpublishPhaseResults(phase.key)
      setOfficialPicks([])
      setPodium({ winner: '', first: '', second: '' })
      setMsg('Resultados anulados: la fase quedó sin publicar, las candidatas eliminadas se reactivaron y los puntos de esta fase se pusieron en 0 para todos.')
    } catch (err) {
      setMsg('Error: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="flex-between">
        <div>
          <h3 style={{ marginBottom: 2 }}>{phase.shortLabel} · {phase.label}</h3>
          <p className="text-dim" style={{ margin: 0 }}>{phase.description}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="flex gap-8" style={{ margin: '14px 0' }}>
        <button className="btn btn-sm" disabled={busy} onClick={() => updateStatus(PHASE_STATUS.ABIERTA)}>
          Abrir fase
        </button>
        <button className="btn btn-sm" disabled={busy} onClick={() => updateStatus(PHASE_STATUS.CERRADA)}>
          Cerrar fase
        </button>
      </div>

      <div className="form-row" style={{ maxWidth: 320 }}>
        <label>Deadline</label>
        <div className="flex gap-8">
          <input
            type="datetime-local"
            value={deadlineInput}
            onChange={(e) => setDeadlineInput(e.target.value)}
          />
          <button className="btn btn-sm" disabled={busy} onClick={saveDeadline}>
            Guardar
          </button>
        </div>
        {status === PHASE_STATUS.ABIERTA && phaseState?.deadline && phaseState.deadline.toMillis() < Date.now() && (
          <p className="text-dim" style={{ marginTop: 6, color: 'var(--gold-soft)' }}>
            Este deadline ya venció — aunque la fase esté "Abierta", los usuarios la ven bloqueada.
            Bórralo o ponlo en el futuro y presiona "Guardar".
          </p>
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />

      <h4 style={{ color: 'var(--gold-soft)', marginBottom: 8 }}>Resultados oficiales</h4>

      {prevPhase && !prevResult && (
        <div className="alert alert-info">
          Publica primero los resultados de {prevPhase.label} para habilitar esta selección.
        </div>
      )}

      {(!prevPhase || prevResult) && (
        <>
          {!phase.podium ? (
            <>
              <p className="text-dim">
                Selecciona quiénes avanzaron realmente ({officialPicks.length}/{phase.pickCount}).
              </p>
              <div className="grid candidates-grid">
                {universe.map((c) => (
                  <PoolCard
                    key={c.id}
                    candidate={c}
                    selected={officialPicks.includes(c.id)}
                    onClick={() => togglePick(c.id)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="podium-select-row">
              <PodiumSelect
                label="🥇 Ganadora"
                value={podium.winner}
                options={universe}
                onChange={(v) => setPodium({ ...podium, winner: v })}
              />
              <PodiumSelect
                label="🥈 1ra Finalista"
                value={podium.first}
                options={universe}
                onChange={(v) => setPodium({ ...podium, first: v })}
              />
              <PodiumSelect
                label="🥉 2da Finalista"
                value={podium.second}
                options={universe}
                onChange={(v) => setPodium({ ...podium, second: v })}
              />
            </div>
          )}

          {msg && <div className="alert alert-success" style={{ marginTop: 12 }}>{msg}</div>}

          <div className="flex gap-8" style={{ marginTop: 14, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              disabled={busy || !hasSelection}
              onClick={publish}
              title={!hasSelection ? 'Selecciona primero quiénes avanzaron' : undefined}
            >
              Publicar resultados y recalcular puntos
            </button>
            {hasPublishedResult && (
              <button className="btn btn-sm" disabled={busy} onClick={handleUnpublish}>
                Anular resultados de esta fase
              </button>
            )}
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

function PodiumSelect({ label, value, options, onChange }) {
  return (
    <div className="form-row">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
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

function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
