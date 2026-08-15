function PhotoOrPlaceholder({ candidate, className }) {
  if (candidate.photoUrl) {
    return <img className={className} src={candidate.photoUrl} alt={candidate.name} loading="lazy" />
  }
  return (
    <div className={`${className} candidate-photo-placeholder`}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    </div>
  )
}

/** Tarjeta de la página "Candidatas" — con marco propio, número y estado. */
export function CandidateCard({ candidate, showStatus, onClick }) {
  const eliminated = candidate.status === 'eliminated'
  const annulled = candidate.status === 'anulada'
  const dimmed = (eliminated || annulled) && showStatus
  return (
    <div className={`candidate-card${onClick ? ' clickable' : ''}`} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="candidate-photo-wrap" style={dimmed ? { filter: 'grayscale(0.85) brightness(0.7)' } : undefined}>
        <PhotoOrPlaceholder candidate={candidate} className="candidate-photo" />
        <span className="candidate-number-badge">{candidate.number ?? '-'}</span>
        {showStatus && eliminated && (
          <>
            <div className="candidate-eliminated-scrim" />
            <span className="candidate-status-tag eliminated">Eliminada</span>
          </>
        )}
        {showStatus && annulled && (
          <>
            <div className="candidate-eliminated-scrim" />
            <span className="candidate-status-tag annulled">Anulada</span>
          </>
        )}
        {showStatus && !eliminated && !annulled && <span className="candidate-status-tag">Activa</span>}
      </div>
      <div>
        <div className="candidate-name">{candidate.name}</div>
        <div className="candidate-province">{candidate.province}</div>
      </div>
    </div>
  )
}

/** Tarjeta de la página "Predicción" — seleccionable, con check/asignación.
 * Un tap en la tarjeta selecciona/deselecciona directamente. Si se pasa
 * `onExpand`, aparece además un botón de "ampliar" que abre la vista grande
 * (con navegación entre todas las candidatas) sin afectar la selección. */
export function PoolCard({ candidate, selected, disabled, assignedLabel, onClick, onExpand }) {
  return (
    <div
      className={`pool-card${disabled ? ' disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
      role={disabled ? undefined : 'button'}
      tabIndex={disabled ? undefined : 0}
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      <div className={`pool-photo-wrap${selected ? ' selected' : ''}`}>
        <PhotoOrPlaceholder candidate={candidate} className="candidate-photo" />
        <span className="pool-number-badge">{candidate.number ?? '-'}</span>
        {onExpand && (
          <button
            type="button"
            className="pool-expand-btn"
            onClick={(e) => {
              e.stopPropagation()
              onExpand()
            }}
            aria-label="Ver en grande"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H3v5" />
              <path d="M16 3h5v5" />
              <path d="M21 16v5h-5" />
              <path d="M3 16v5h5" />
            </svg>
          </button>
        )}
        {selected && !assignedLabel && (
          <>
            <div className="pool-selected-ring" />
            <span className="pool-check">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#17130f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
          </>
        )}
        {assignedLabel && <span className="pool-assigned-label">{assignedLabel}</span>}
      </div>
      <div className="pool-name">{candidate.name}</div>
      <div className="pool-province">{candidate.province}</div>
    </div>
  )
}

export default CandidateCard
