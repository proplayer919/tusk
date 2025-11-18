import React from 'react'
import './SidebarButton.css'
import IconLabel from './IconLabel'

interface SidebarButtonProps {
  children: React.ReactNode
  icon?: React.ReactNode
  onClick?: () => void
  danger?: boolean
  active?: boolean
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ children, icon, onClick, danger, active }) => {
  return (
    <button
      className={"sidebar-button" + (danger ? ' danger' : '') + (active ? ' active' : '')}
      onClick={onClick}
      type="button"
      aria-pressed={active}
    >
      {icon ? <IconLabel icon={icon}>{children}</IconLabel> : children}
    </button>
  )
}

export default SidebarButton
