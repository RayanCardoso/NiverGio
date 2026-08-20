import './Sparkles.css'

function Sparkles() {
  return (
    <div className="sparkles" aria-hidden="true">
      {Array.from({ length: 14 }).map((_, i) => (
        <span key={i} className={`sparkle sparkle--${i}`} />
      ))}
    </div>
  )
}

export default Sparkles
