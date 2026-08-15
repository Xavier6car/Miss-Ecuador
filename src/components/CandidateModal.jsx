import { useEffect } from 'react'
import CandidateEngagement from './CandidateEngagement'

/**
 * Vista ampliada de una candidata. Se usa con `showEngagement` (comentarios
 * + reacciones) en la página "Candidatas", y con navegación + botón de
 * selección en "Predicción" (pasando total/index/onPrev/onNext/canToggle/onToggle).
 */
export default function CandidateModal({
  candidate,
  onClose,
  total,
  index,
  onPrev,
  onNext,
  canToggle,
  selected,
  toggleDisabled,
  onToggle,
  showEngagement,
}) {
  const hasNav = Boolean(onPrev && onNext && total > 1)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (hasNav && e.key === 'ArrowLeft') onPrev()
      if (hasNav && e.key === 'ArrowRight') onNext()
    }
    document.addEventListener('keydown', onKey)
    // Bloquea también el arrastre táctil de la página de atrás, no solo el scroll.
    const prevOverflow = document.body.style.overflow
    const prevTouchAction = document.body.style.touchAction
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      document.body.style.touchAction = prevTouchAction
    }
  }, [onClose, onPrev, onNext, hasNav])

  if (!candidate) return null
  const eliminated = candidate.status === 'eliminated'
  const annulled = candidate.status === 'anulada'

  function stop(e, fn) {
    e.stopPropagation()
    fn()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      {hasNav && (
        <button
          className="modal-nav modal-nav-prev"
          onClick={(e) => stop(e, onPrev)}
          aria-label="Candidata anterior"
        >
          ‹
        </button>
      )}

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
          ) : annulled ? (
            <span className="candidate-status-tag annulled">Anulada</span>
          ) : (
            <span className="candidate-status-tag">Activa</span>
          )}
        </div>

        <div className="modal-body">
          <h2 style={{ margin: '0 0 2px' }}>{candidate.name}</h2>
          <p className="text-dim" style={{ margin: '0 0 12px' }}>{candidate.province}</p>
          {candidate.bio && <p style={{ margin: 0, lineHeight: 1.6 }}>{candidate.bio}</p>}

          {hasNav && (
            <p className="text-dim" style={{ marginTop: 12, fontSize: 12 }}>
              {index + 1} / {total}
            </p>
          )}

          {canToggle && (
            <button
              className={`btn btn-primary modal-toggle-btn${selected ? ' selected' : ''}`}
              disabled={toggleDisabled}
              title={toggleDisabled ? 'Ya elegiste el máximo de candidatas — quita una para agregar esta.' : undefined}
              onClick={onToggle}
            >
              {selected ? '✓ Quitar de mi predicción' : 'Agregar a mi predicción'}
            </button>
          )}

          {showEngagement && <CandidateEngagement candidateId={candidate.id} />}
        </div>
      </div>

      {hasNav && (
        <button
          className="modal-nav modal-nav-next"
          onClick={(e) => stop(e, onNext)}
          aria-label="Siguiente candidata"
        >
          ›
        </button>
      )}
    </div>
  )
}
