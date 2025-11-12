import React from 'react'
import './SidebarButton.css'
import IconLabel from './IconLabel'

interface SidebarButtonProps {
  children: React.ReactNode
  icon?: React.ReactNode
  onClick?: () => void
  danger?: boolean
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ children, icon, onClick, danger }) => {
  return (
    <button
      className={"sidebar-button" + (danger ? ' danger' : '')}
      onClick={onClick}
      type="button"
    >
      {icon ? <IconLabel icon={icon}>{children}</IconLabel> : children}
    </button>
  )
}

export default SidebarButton
