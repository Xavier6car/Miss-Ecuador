import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  listenCandidates,
  saveCandidate,
  deleteCandidate,
  importCandidates,
  renumberCandidatesSequential,
} from '../lib/data'
import { CANDIDATES_SEED } from '../lib/candidatesSeed'
import { uploadCandidatePhoto } from '../lib/storage'
import CandidateCard from '../components/CandidateCard'

const emptyForm = { number: '', name: '', province: '', photoUrl: '', bio: '', status: 'active' }

export default function Candidates({ embedded = false }) {
  const { profile, canManageCandidates } = useAuth()
  const [candidates, setCandidates] = useState([])
  const [editing, setEditing] = useState(null) // candidate id or 'new'
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [renumbering, setRenumbering] = useState(false)
  const [renumberMsg, setRenumberMsg] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => listenCandidates(setCandidates), [])

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
              {candidates.length} de 26 candidatas cargadas
              {candidates.some((c) => c.status === 'eliminated') && ' · las eliminadas aparecen atenuadas'}
            </p>
          </div>
        ) : (
          <p className="text-dim">{candidates.length} de 26 candidatas cargadas</p>
        )}
        {canManageCandidates && (
          <div className="flex gap-8">
            {candidates.length === 0 && (
              <button className="btn" disabled={importing} onClick={handleImport}>
                {importing ? 'Importando...' : `Importar candidatas oficiales (${CANDIDATES_SEED.length})`}
              </button>
            )}
            {candidates.length > 0 && (
              <button className="btn" disabled={renumbering} onClick={handleRenumber}>
                {renumbering ? 'Renumerando...' : 'Renumerar correlativo (1-26)'}
              </button>
            )}
            <button className="btn btn-primary" onClick={startNew}>
              + Agregar candidata
            </button>
          </div>
        )}
      </div>

      {renumberMsg && <div className="alert alert-success">{renumberMsg}</div>}

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
                  <option value="eliminated">Eliminada</option>
                </select>
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

      <div className="grid candidates-grid">
        {candidates.map((c) => (
          <div key={c.id}>
            <CandidateCard candidate={c} showStatus />
            {canManageCandidates && (
              <button className="btn btn-sm" style={{ width: '100%', marginTop: 6 }} onClick={() => startEdit(c)}>
                Editar
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
    </div>
  )
}
