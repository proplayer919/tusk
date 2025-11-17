import React from 'react'
import './Slider.css'

interface SliderProps {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  className?: string
}

const Slider: React.FC<SliderProps> = ({ value, onChange, min = 0, max = 1, step = 0.01, label, className = '' }) => {
  const percent = Math.round(((value - min) / (max - min)) * 100)

  return (
    <div className={`slider-root ${className}`}>
      {label && <div className="slider-label">{label}</div>}
      <div className="slider-row">
        <input
          className="slider-input"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <div className="slider-value">{percent}%</div>
      </div>
    </div>
  )
}

export default Slider
