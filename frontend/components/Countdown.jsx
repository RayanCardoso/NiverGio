import { useEffect, useState } from 'react'
import './Countdown.css'

function getTimeLeft(targetDate) {
  const diff = +new Date(targetDate) - +new Date()
  if (diff <= 0) {
    return { done: true, dias: 0, horas: 0, minutos: 0, segundos: 0 }
  }
  return {
    done: false,
    dias: Math.floor(diff / (1000 * 60 * 60 * 24)),
    horas: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutos: Math.floor((diff / (1000 * 60)) % 60),
    segundos: Math.floor((diff / 1000) % 60),
  }
}

function Countdown({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(targetDate))

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate))
    }, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  if (timeLeft.done) {
    return <p className="countdown__done">A festa já começou! 🎉</p>
  }

  const units = [
    { label: 'dias', value: timeLeft.dias },
    { label: 'horas', value: timeLeft.horas },
    { label: 'min', value: timeLeft.minutos },
    // { label: 'seg', value: timeLeft.segundos },
  ]

  return (
    <div className="countdown">
      {units.map((unit) => (
        <div className="countdown__unit" key={unit.label}>
          <span className="countdown__value">
            {String(unit.value).padStart(2, '0')}
          </span>
          <span className="countdown__label">{unit.label}</span>
        </div>
      ))}
    </div>
  )
}

export default Countdown
