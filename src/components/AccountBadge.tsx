import React, { useEffect, useRef, useState } from 'react'
import './AccountBadge.css'

const NAMES = [
  'Alex Mercer',
  'Jamie Doe',
  'Taylor Reed',
  'Morgan Lane',
  'Casey North',
]

interface AccountBadgeProps {
  children?: React.ReactNode
}

const AccountBadge: React.FC<AccountBadgeProps> = ({ children }) => {
  const [open, setOpen] = useState(false)
  const [seed] = useState(() => Math.floor(Math.random() * 70) + 1)
  const [name] = useState(() => NAMES[Math.floor(Math.random() * NAMES.length)])
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

  const avatar = `https://i.pravatar.cc/40?img=${seed}`

  // Default menu (used when no children provided)
  function DefaultMenu() {
    function handleSettings() {
      alert('Open settings (placeholder)')
      setOpen(false)
    }

    function handleLogout() {
      alert('Logged out (placeholder)')
      setOpen(false)
    }

    return (
      <>
        <button className="account-menu-item" onClick={handleSettings} role="menuitem">
          Settings
        </button>
        <button className="account-menu-item logout" onClick={handleLogout} role="menuitem">
          Logout
        </button>
      </>
    )
  }

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
        <img className="account-avatar" src={avatar} alt="profile" />
        <span className="account-name">{name}</span>
      </button>

      {open && (
        <div className="account-menu" role="menu" onClick={onMenuClick}>
          {children ? children : <DefaultMenu />}
        </div>
      )}
    </div>
  )
}

export default AccountBadge
