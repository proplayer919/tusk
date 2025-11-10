import React, { useEffect, useRef, useState } from 'react'
import { IconUserCircle } from '@tabler/icons-react'
import './AccountBadge.css'

interface AccountBadgeProps {
  children: React.ReactNode
  displayName?: string
}

const AccountBadge: React.FC<AccountBadgeProps> = ({ children, displayName }) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) setOpen(false)
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('click', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const displayNameToShow = displayName ? displayName : "User"

  // close the dropdown when a button inside the menu is clicked
  function onMenuClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement
    if (target.closest('button')) setOpen(false)
  }

  return (
    <div className="account-badge" ref={containerRef}>
      <button
        className="account-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <IconUserCircle size={30} />
        <span className="account-name">{displayNameToShow}</span>
      </button>

      {open && (
        <div className="account-menu" role="menu" onClick={onMenuClick}>
          {children}
        </div>
      )}
    </div>
  )
}

export default AccountBadge
