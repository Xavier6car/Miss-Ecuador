export default function CandidateCard({ candidate, selectable, selected, onToggle, showStatus }) {
  const eliminated = candidate.status === 'eliminated'
  const classes = ['candidate-card']
  if (selectable) classes.push('selectable')
  if (selected) classes.push('selected')
  if (showStatus && eliminated) classes.push('eliminated')

  return (
    <div
      className={classes.join(' ')}
      onClick={selectable ? onToggle : undefined}
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
    >
      <span className="candidate-number">{candidate.number ?? '-'}</span>
      {selected && <span className="candidate-check">✓</span>}
      {candidate.photoUrl ? (
        <img className="candidate-photo" src={candidate.photoUrl} alt={candidate.name} loading="lazy" />
      ) : (
        <div className="candidate-photo" />
      )}
      <div className="candidate-info">
        <div className="candidate-name">{candidate.name}</div>
        <div className="candidate-province">{candidate.province}</div>
        {showStatus && eliminated && <span className="badge badge-closed">Eliminada</span>}
      </div>
    </div>
  )
}
