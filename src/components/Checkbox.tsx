import React from 'react'
import './Checkbox.css'

interface CheckboxProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  label?: string
  id?: string
  disabled?: boolean
  className?: string
}

const Checkbox: React.FC<CheckboxProps> = ({ checked = false, onChange, label, id, disabled = false, className = '' }) => {
  const handleToggle = () => {
    if (disabled) return
    onChange && onChange(!checked)
  }

  return (
    <div className={`checkbox-root ${className}`}>
      <div
        id={id}
        role="checkbox"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        className={`checkbox-box ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleToggle()
          }
        }}
      >
        <svg className="checkbox-mark" viewBox="0 0 24 24" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {label && (
        <label className={`checkbox-label ${disabled ? 'disabled' : ''}`} onClick={(e) => { e.preventDefault(); handleToggle() }}>
          {label}
        </label>
      )}
    </div>
  )
}

export default Checkbox
