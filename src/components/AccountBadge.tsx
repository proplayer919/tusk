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
  children: React.ReactNode
  accountAvatar?: string | React.ComponentType<any> | React.ReactElement
  displayName?: string
}

const AccountBadge: React.FC<AccountBadgeProps> = ({ children, accountAvatar, displayName }) => {
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

  const avatar = accountAvatar ? accountAvatar : `https://i.pravatar.cc/40?img=${seed}`
  const displayNameToShow = displayName ? displayName : name

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
        {avatar && typeof avatar === 'string' ? (
          <img className="account-avatar" src={avatar} alt="profile" />
        ) : avatar ? (
          typeof avatar === 'function' ? (
            React.createElement(avatar)
          ) : (
            avatar
          )
        ) : null}{' '}
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
