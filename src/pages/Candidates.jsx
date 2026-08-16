import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  listenCandidates,
  saveCandidate,
  deleteCandidate,
  importCandidates,
  renumberCandidatesSequential,
  annulCandidate,
  reactivateCandidate,
} from '../lib/data'
import { CANDIDATES_SEED } from '../lib/candidatesSeed'
import { uploadCandidatePhoto } from '../lib/storage'
import CandidateCard from '../components/CandidateCard'
import CandidateModal from '../components/CandidateModal'

const emptyForm = { number: '', name: '', province: '', photoUrl: '', bio: '', status: 'active' }

export default function Candidates({ embedded = false }) {
  const { profile, canManageCandidates, isAdmin } = useAuth()
  const [candidates, setCandidates] = useState([])
  const [editing, setEditing] = useState(null) // candidate id or 'new'
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [renumbering, setRenumbering] = useState(false)
  const [renumberMsg, setRenumberMsg] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [search, setSearch] = useState('')
  const [province, setProvince] = useState('Todas')
  const [viewing, setViewing] = useState(null)
  const [annullingId, setAnnullingId] = useState(null)
  const [annulMsg, setAnnulMsg] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => listenCandidates(setCandidates), [])

  // Soporta llegar directo a la ficha de una candidata por URL (?ver=id) —
  // lo usa, por ejemplo, la pestaña "Actividad" al hacer click en un
  // comentario/reacción para llevarte a esa candidata puntual.
  useEffect(() => {
    const verId = searchParams.get('ver')
    if (!verId || candidates.length === 0) return
    const c = candidates.find((x) => x.id === verId)
    if (c) setViewing(c)
  }, [searchParams, candidates])

  function closeViewing() {
    setViewing(null)
    if (searchParams.has('ver')) {
      const next = new URLSearchParams(searchParams)
      next.delete('ver')
      setSearchParams(next, { replace: true })
    }
  }

  const provinces = ['Todas', ...new Set(candidates.map((c) => c.province).filter(Boolean))]
  const q = search.trim().toLowerCase()
  const visibleCandidates = candidates.filter(
    (c) =>
      (province === 'Todas' || c.province === province) &&
      (!q || c.name.toLowerCase().includes(q) || (c.province || '').toLowerCase().includes(q)),
  )

  function startEdit(candidate) {
    setEditing(candidate.id)
    setUploadError('')
    setForm({
      number: candidate.number ?? '',
      name: candidate.name ?? '',
      province: candidate.province ?? '',
      photoUrl: candidate.photoUrl ?? '',
      bio: candidate.bio ?? '',
      status: candidate.status ?? 'active',
    })
  }

  function startNew() {
    setEditing('new')
    setUploadError('')
    setForm(emptyForm)
  }

  async function handlePhotoFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo si falla
    if (!file) return
    setUploadError('')
    setUploadingPhoto(true)
    try {
      const url = await uploadCandidatePhoto(editing, file)
      setForm((f) => ({ ...f, photoUrl: url }))
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const id = editing === 'new' ? null : editing
      await saveCandidate(
        id,
        { ...form, number: Number(form.number) || 0 },
        { uid: profile.id, name: profile.name },
      )
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta candidata? Esta acción no se puede deshacer.')) return
    await deleteCandidate(id)
  }

  async function handleAnnul(candidate) {
    const ok = confirm(
      `¿Anular a ${candidate.name}? Se descalifica de última hora, fuera del corte normal de fase:\n\n` +
        '• Deja de estar disponible para elegir en cualquier fase de aquí en adelante.\n' +
        '• A quien ya la había elegido en una fase todavía no publicada se le libera ese cupo para que elija otra candidata — no cuenta como acierto ni como fallo.\n' +
        '• Las fases que ya se publicaron NO se tocan (el puntaje ya otorgado con ella se mantiene).\n\n' +
        'Puedes reactivarla después, pero los cupos que se liberen ahora no se restauran solos.',
    )
    if (!ok) return
    setAnnullingId(candidate.id)
    setAnnulMsg('')
    try {
      const touched = await annulCandidate(candidate.id, { uid: profile.id, name: profile.name })
      setAnnulMsg(
        touched > 0
          ? `${candidate.name} fue anulada. Se actualizaron ${touched} predicción(es) para liberar su cupo.`
          : `${candidate.name} fue anulada.`,
      )
    } finally {
      setAnnullingId(null)
    }
  }

  async function handleReactivate(candidate) {
    if (!confirm(`¿Reactivar a ${candidate.name}? Volverá a estar disponible para elegir.`)) return
    setAnnullingId(candidate.id)
    setAnnulMsg('')
    try {
      await reactivateCandidate(candidate.id, { uid: profile.id, name: profile.name })
      setAnnulMsg(`${candidate.name} fue reactivada.`)
    } finally {
      setAnnullingId(null)
    }
  }

  async function handleRenumber() {
    if (!confirm('Esto va a renumerar todas las candidatas de forma correlativa (1, 2, 3...) según su orden actual. ¿Continuar?'))
      return
    setRenumbering(true)
    setRenumberMsg('')
    try {
      const changed = await renumberCandidatesSequential()
      setRenumberMsg(changed > 0 ? `Se corrigió el número de ${changed} candidata(s).` : 'La numeración ya estaba correcta.')
    } finally {
      setRenumbering(false)
    }
  }

  async function handleImport() {
    if (
      !confirm(
        `Esto va a crear ${CANDIDATES_SEED.length} candidatas oficiales (sin foto, la agregas después editando cada una). ¿Continuar?`,
      )
    )
      return
    setImporting(true)
    try {
      await importCandidates(CANDIDATES_SEED, { uid: profile.id, name: profile.name })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className={embedded ? '' : 'container'}>
      <div className="flex-between">
        {!embedded ? (
          <div>
            <h1 className="page-title">Candidatas</h1>
            <p className="page-subtitle">
              {candidates.length} candidata{candidates.length === 1 ? '' : 's'} cargada{candidates.length === 1 ? '' : 's'}
              {candidates.some((c) => c.status === 'eliminated' || c.status === 'anulada') &&
                ' · las eliminadas y anuladas aparecen atenuadas'}
            </p>
          </div>
        ) : (
          <p className="text-dim">
            {candidates.length} candidata{candidates.length === 1 ? '' : 's'} cargada{candidates.length === 1 ? '' : 's'}
          </p>
        )}
        {canManageCandidates && (
          <div className="flex gap-8 candidates-actions" style={{ flexWrap: 'wrap' }}>
            {candidates.length === 0 && (
              <button className="btn" disabled={importing} onClick={handleImport}>
                {importing ? 'Importando...' : `Importar candidatas oficiales (${CANDIDATES_SEED.length})`}
              </button>
            )}
            {candidates.length > 0 && (
              <button className="btn" disabled={renumbering} onClick={handleRenumber}>
                {renumbering ? 'Renumerando...' : `Renumerar correlativo (1-${candidates.length})`}
              </button>
            )}
            <button className="btn btn-primary" onClick={startNew}>
              + Agregar candidata
            </button>
          </div>
        )}
      </div>

      {renumberMsg && <div className="alert alert-success">{renumberMsg}</div>}
      {annulMsg && <div className="alert alert-success">{annulMsg}</div>}

      {editing && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3>{editing === 'new' ? 'Nueva candidata' : 'Editar candidata'}</h3>
          <form onSubmit={handleSave}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <div className="form-row">
                <label>Número</label>
                <input
                  type="number"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <label>Nombre</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
            </div>
            <div className="form-row">
              <label>Provincia / representación</label>
              <input
                value={form.province}
                onChange={(e) => setForm({ ...form, province: e.target.value })}
                required
              />
            </div>
            <div className="form-row">
              <label>Foto</label>
              {form.photoUrl && (
                <img
                  src={form.photoUrl}
                  alt="Vista previa"
                  style={{ width: 96, height: 128, objectFit: 'cover', borderRadius: 8, marginBottom: 6 }}
                />
              )}
              {editing !== 'new' ? (
                <>
                  <input type="file" accept="image/*" disabled={uploadingPhoto} onChange={handlePhotoFile} />
                  {uploadingPhoto && <p className="text-dim" style={{ fontSize: 12 }}>Subiendo...</p>}
                  {uploadError && <p style={{ color: 'var(--danger)', fontSize: 12 }}>{uploadError}</p>}
                </>
              ) : (
                <p className="text-dim" style={{ fontSize: 12 }}>
                  Guarda la candidata primero; después edítala para subir su foto.
                </p>
              )}
              <input
                value={form.photoUrl}
                onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                placeholder="...o pega una URL de imagen aquí"
                style={{ marginTop: 6 }}
              />
            </div>
            <div className="form-row">
              <label>Bio / datos adicionales</label>
              <textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </div>
            {editing !== 'new' && (
              <div className="form-row">
                <label>Estado</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Activa</option>
                  <option value="eliminated">Eliminada (no avanzó en un corte de fase)</option>
                  <option value="anulada">Anulada / descalificada</option>
                </select>
                <p className="text-dim" style={{ fontSize: 11, margin: 0 }}>
                  Para anular a media competencia y liberar automáticamente el cupo de quienes ya la
                  eligieron, mejor usa el botón "Anular candidata" de su tarjeta en vez de este campo.
                </p>
              </div>
            )}
            <div className="flex gap-8">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                Guardar
              </button>
              <button className="btn" type="button" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              {editing !== 'new' && (
                <button
                  className="btn btn-danger"
                  type="button"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => handleDelete(editing)}
                >
                  Eliminar candidata
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {candidates.length > 0 && (
        <>
          <div className="flex gap-8" style={{ alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <div className="search-input-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(245,239,230,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o provincia"
              />
            </div>
          </div>

          <div className="chip-row" style={{ marginBottom: 16 }}>
            {provinces.map((p) => (
              <div
                key={p}
                className={`chip${province === p ? ' active' : ''}`}
                onClick={() => setProvince(p)}
              >
                {p}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="grid candidates-grid">
        {visibleCandidates.map((c) => (
          <div key={c.id}>
            <CandidateCard candidate={c} showStatus onClick={() => setViewing(c)} />
            {canManageCandidates && (
              <button className="btn btn-sm" style={{ width: '100%', marginTop: 6 }} onClick={() => startEdit(c)}>
                Editar
              </button>
            )}
            {isAdmin && c.status === 'anulada' && (
              <button
                className="btn btn-sm"
                style={{ width: '100%', marginTop: 4 }}
                disabled={annullingId === c.id}
                onClick={() => handleReactivate(c)}
              >
                {annullingId === c.id ? 'Reactivando...' : 'Reactivar candidata'}
              </button>
            )}
            {isAdmin && c.status !== 'anulada' && (
              <button
                className="btn btn-sm btn-danger"
                style={{ width: '100%', marginTop: 4 }}
                disabled={annullingId === c.id}
                onClick={() => handleAnnul(c)}
              >
                {annullingId === c.id ? 'Anulando...' : 'Anular candidata'}
              </button>
            )}
            {c.lastEditedByName && (
              <p className="text-dim" style={{ fontSize: 11, marginTop: 4 }}>
                Editado por {c.lastEditedByName}
              </p>
            )}
          </div>
        ))}
      </div>

      {candidates.length === 0 && (
        <div className="alert alert-info">
          Todavía no hay candidatas cargadas.
          {canManageCandidates ? ' Usa "Agregar candidata" para empezar.' : ' Vuelve pronto.'}
        </div>
      )}
      {candidates.length > 0 && visibleCandidates.length === 0 && (
        <div className="alert alert-info">Ninguna candidata coincide con la búsqueda.</div>
      )}

      {viewing && <CandidateModal candidate={viewing} onClose={closeViewing} showEngagement />}
    </div>
  )
}
