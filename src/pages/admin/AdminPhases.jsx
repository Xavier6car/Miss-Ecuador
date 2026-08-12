import { useEffect, useMemo, useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { PHASES, PHASE_STATUS, previousPhase } from '../../lib/constants'
import {
  listenCandidates,
  listenPhases,
  listenPhaseResults,
  setPhaseConfig,
  publishPhaseResultsAndRecalculate,
  ensurePhaseDocs,
} from '../../lib/data'
import CandidateCard from '../../components/CandidateCard'

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
      await setPhaseConfig(phase.key, { status: newStatus })
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

  async function publish() {
    setBusy(true)
    setMsg('')
    try {
      const payload = phase.podium ? { podium } : { officialPicks }
      await publishPhaseResultsAndRecalculate(phase.key, payload)
      setMsg('Resultados publicados y puntos recalculados para todos los usuarios.')
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
                  <CandidateCard
                    key={c.id}
                    candidate={c}
                    selectable
                    selected={officialPicks.includes(c.id)}
                    onToggle={() => togglePick(c.id)}
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

          <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={busy} onClick={publish}>
            Publicar resultados y recalcular puntos
          </button>
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
