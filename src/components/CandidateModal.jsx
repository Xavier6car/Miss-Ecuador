import { useEffect } from 'react'

export default function CandidateModal({ candidate, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!candidate) return null
  const eliminated = candidate.status === 'eliminated'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>

        <div className="modal-photo-wrap">
          {candidate.photoUrl ? (
            <img className="modal-photo" src={candidate.photoUrl} alt={candidate.name} />
          ) : (
            <div className="modal-photo-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}
          <span className="candidate-number-badge modal-number-badge">{candidate.number ?? '-'}</span>
          {eliminated ? (
            <span className="candidate-status-tag eliminated">Eliminada</span>
          ) : (
            <span className="candidate-status-tag">Activa</span>
          )}
        </div>

        <div className="modal-body">
          <h2 style={{ margin: '0 0 2px' }}>{candidate.name}</h2>
          <p className="text-dim" style={{ margin: '0 0 12px' }}>{candidate.province}</p>
          {candidate.bio && <p style={{ margin: 0, lineHeight: 1.6 }}>{candidate.bio}</p>}
        </div>
      </div>
    </div>
  )
}
