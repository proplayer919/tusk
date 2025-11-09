import React from 'react'
import './IconLabel.css'

interface IconLabelProps {
  icon: React.ReactNode
  children?: React.ReactNode
  className?: string
}

const IconLabel: React.FC<IconLabelProps> = ({ icon, children, className = '' }) => {
  return (
    <span className={`icon-label ${className}`.trim()}>
      <span className="icon-label__icon" aria-hidden>
        {icon}
      </span>
      <span className="icon-label__text">{children}</span>
    </span>
  )
}

export default IconLabel
