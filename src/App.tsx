import { useEffect, useState } from 'react'
import {
  Button, Card, ProgressBar, Modal, IconLabel, SidebarButton, StaffPanel, SettingsPanel
} from './components'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import { IconAward, IconSettings, IconLogout, IconLogin, IconUserPlus, IconStar, IconUserCircle, IconTools, IconBrandGithub, IconMail, IconLock, IconClock, IconCalendar, IconAlertCircle } from '@tabler/icons-react';
import './App.css'
import auth from './services/auth'
import settingsService from './services/settings'
import progressService from './services/progress'
import FullscreenLoader from './components/FullscreenLoader'

function App() {
  const [count, setCount] = useState(0)
  const [evolution, setEvolution] = useState(1)
  const [buttonDisabled, setButtonDisabled] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [hasClickedOnce, setHasClickedOnce] = useState(false)

  // hydration flag: don't auto-save until we've loaded initial progress
  const [hydrated, setHydrated] = useState(false)
  // serverLoaded: indicates we've fetched/applied server-side progress for logged-in users
  const [serverLoaded, setServerLoaded] = useState(false)

  // auth state: when false the account dropdown shows Sign In / Register
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => !!auth.getToken())
  const [username, setUsername] = useState<string | null>(null)
  const [isStaff, setIsStaff] = useState<boolean>(false)
  const [accountLock, setAccountLock] = useState<{ lockReason?: string | null; lockUntil?: number | null; lockedAt?: string | null } | null>(null)
  const [lockCountdown, setLockCountdown] = useState<number | null>(null)

  // modals for sign in / register / staff
  const [signInOpen, setSignInOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [staffOpen, setStaffOpen] = useState(false)

  // global small modals: settings and credits
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [creditsOpen, setCreditsOpen] = useState(false)
  // application settings (persisted to localStorage)
  const [settings, setSettings] = useState(() => settingsService.loadSettings())

  function getMaxCount() {
    return (evolution * 10) + 40
  }

  function handleClick() {
    setCount(count + 1)
    setHasClickedOnce(true)

    if (count + 1 >= getMaxCount()) {
      setButtonDisabled(true)
      setModalOpen(true)
    }
  }

  // load auth user and saved progress on mount
  useEffect(() => {
    let mounted = true
    async function init() {
      if (auth.getToken()) {
        try {
          const user = await auth.getCurrentUser()
          if (!mounted) return
          setIsLoggedIn(true)
          setUsername(user.username)
          setIsStaff(Boolean(user.staff))
          setAccountLock({ lockReason: user.lockReason || null, lockUntil: typeof user.lockUntil === 'number' ? user.lockUntil : (user.lockUntil === null ? null : null), lockedAt: user.lockedAt || null })
          const saved = await progressService.loadProgress()
          if (saved) {
            if (typeof saved.count === 'number') setCount(saved.count)
            if (typeof saved.evolution === 'number') setEvolution(saved.evolution)
            if (saved.hasClickedOnce) setHasClickedOnce(true)
          }
          // we've loaded server-side progress (even if empty) so allow server saves
          setServerLoaded(true)
        } catch (err) {
          // token invalid or fetch failed, clear
          auth.setToken(null)
          setIsLoggedIn(false)
          setIsStaff(false)
          setAccountLock(null)
          setLockCountdown(null)
          // try to load guest progress instead
          try {
            const saved = await progressService.loadProgress()
            if (saved) {
              if (typeof saved.count === 'number') setCount(saved.count)
              if (typeof saved.evolution === 'number') setEvolution(saved.evolution)
              if (saved.hasClickedOnce) setHasClickedOnce(true)
            }
          } catch (e) {
            // ignore
          }
        }
      } else {
        const saved = await progressService.loadProgress()
        if (saved) {
          if (typeof saved.count === 'number') setCount(saved.count)
          if (typeof saved.evolution === 'number') setEvolution(saved.evolution)
          if (saved.hasClickedOnce) setHasClickedOnce(true)
        }
      }
      // initial load complete
      setHydrated(true)
    }
    init()
    return () => { mounted = false }
  }, [])

  // when login state changes to true (e.g. after a successful login), fetch user info
  useEffect(() => {
    let mounted = true
    async function fetchUser() {
      if (!isLoggedIn) return
      try {
        const user = await auth.getCurrentUser()
        if (!mounted) return
        setUsername(user.username)
        setIsStaff(Boolean(user.staff))
        setAccountLock({ lockReason: user.lockReason || null, lockUntil: typeof user.lockUntil === 'number' ? user.lockUntil : (user.lockUntil === null ? null : null), lockedAt: user.lockedAt || null })

        // Determine server progress: prefer explicit user.progress returned from /api/user
        // If missing, fall back to fetching /api/progress. Also, if guest local progress
        // exists, upload it and then reload server progress.
        try {
          // Do NOT merge or upload guest (localStorage) progress automatically.
          // Keep guest progress (localStorage) and account/cloud progress separate.
          // Apply server-side progress from the returned user object or by fetching it.
          const serverProgress = user && user.progress ? user.progress : await progressService.loadProgress()
          if (serverProgress) {
            if (typeof serverProgress.count === 'number') setCount(serverProgress.count)
            if (typeof serverProgress.evolution === 'number') setEvolution(serverProgress.evolution)
            if (serverProgress.hasClickedOnce) setHasClickedOnce(true)
          }
        } catch (err) {
          // ignore
        }
        // we've finished applying server/merged progress for the logged-in user
        setServerLoaded(true)
        setHydrated(true)
      } catch (err) {
        // ignore
      }
    }
    fetchUser()
    return () => { mounted = false }
  }, [isLoggedIn])

  // manage countdown for lock expiry if account is locked
  useEffect(() => {
    let t: number | null = null
    function update() {
      if (!accountLock || accountLock.lockUntil === null) {
        setLockCountdown(null)
        return
      }
      if (accountLock.lockUntil === -1) {
        setLockCountdown(-1)
        return
      }
      const remaining = Math.max(0, Math.floor(((accountLock.lockUntil as number) - Date.now()) / 1000))
      setLockCountdown(remaining)
    }
    update()
    t = window.setInterval(update, 1000)
    return () => { if (t) window.clearInterval(t) }
  }, [accountLock])

  // Poll /api/user every 5s while logged in to pick up lock state changes
  useEffect(() => {
    if (!isLoggedIn) return
    let mounted = true
    let t: number | null = null

    async function poll() {
      try {
        const user = await auth.getCurrentUser()
        if (!mounted) return
        setAccountLock({ lockReason: user.lockReason || null, lockUntil: typeof user.lockUntil === 'number' ? user.lockUntil : (user.lockUntil === null ? null : null), lockedAt: user.lockedAt || null })
      } catch (err) {
        // If fetching user fails (e.g., token invalid), clear login state
        try {
          auth.setToken(null)
        } catch (e) { }
        if (!mounted) return
        setIsLoggedIn(false)
        setIsStaff(false)
        setAccountLock(null)
        setLockCountdown(null)
      }
    }

    // poll immediately then every 5 seconds
    poll()
    t = window.setInterval(poll, 5000)
    return () => { mounted = false; if (t) window.clearInterval(t) }
  }, [isLoggedIn])

  // persist progress when important pieces change (only after we've hydrated initial state)
  useEffect(() => {
    if (!hydrated) return
    // if logged in, wait until we've loaded/applied server progress before saving
    if (isLoggedIn && !serverLoaded) return
    let mounted = true
      ; (async () => {
        try {
          await progressService.saveProgress({ count, evolution, hasClickedOnce })
        } catch (err: any) {
          // If server rejected because the account is locked, refresh the user and update lock state
          if (err && err.status === 403) {
            try {
              const user = await auth.getCurrentUser()
              if (!mounted) return
              setAccountLock({ lockReason: user.lockReason || null, lockUntil: typeof user.lockUntil === 'number' ? user.lockUntil : (user.lockUntil === null ? null : null), lockedAt: user.lockedAt || null })
            } catch (e) {
              // ignore failures to fetch user
            }
          }
        }
      })()
  }, [count, evolution, hasClickedOnce, hydrated, isLoggedIn, serverLoaded])

  // allow pressing Space to click when the player reaches evolution 15
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Only respond to the Space key (avoid interfering with other combos)
      if (e.code !== 'Space') return

      // Ignore repeats and modifier combos
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return

      // Don't trigger while typing in inputs or editable areas
      const active = document.activeElement as HTMLElement | null
      if (active) {
        const tag = active.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || active.isContentEditable) return
      }

      // Only enable this behaviour at evolution 15 or higher
      if (evolution < 15) return

      // Prevent the default page scroll on Space
      e.preventDefault()

      // If the main click button is disabled (or modal open), don't click
      if (buttonDisabled || modalOpen) return

      // Perform a click-like increment using the functional state updater
      setCount(prev => {
        const next = prev + 1
        setHasClickedOnce(true)
        if (next >= (evolution * 10) + 40) {
          setButtonDisabled(true)
          setModalOpen(true)
        }
        return next
      })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [evolution, buttonDisabled, modalOpen])


  function handleExitModal() {
    setModalOpen(false)
    setEvolution(evolution + 1)
    setCount(0)
    setButtonDisabled(false)
  }

  return (
    <div className="app">
      {/* Fullscreen loader while hydrating or waiting for server progress */}
      {(!hydrated || (isLoggedIn && !serverLoaded)) && <FullscreenLoader />}

      <aside className="game-sidebar">
        <h1>
          {/* Show the festive logo when enabled and in December (or forced via advanced settings) */}
          {(() => {
            const now = new Date()
            const isDecember = now.getMonth() === 11
            const showFestive = settings.festiveEnabled && (isDecember || settings.festiveOverride)
            const src = showFestive ? '/images/festive%20logo.png' : '/images/logo.png'
            return <img src={src} alt="Tusk" className="site-logo" />
          })()}
        </h1>

        {hasClickedOnce && (
          <p className="evolution-label">
            <IconLabel icon={<IconAward size={20} />}>Evolution {evolution}</IconLabel>
          </p>
        )}

        {/* Inlined account area: styled buttons and account row at the bottom */}
        <div className="sidebar-account-section">
          {isLoggedIn ? (
            <>
              <SidebarButton icon={<IconSettings size={25} />} onClick={() => setSettingsOpen(true)}>
                Settings
              </SidebarButton>
              <SidebarButton icon={<IconStar size={25} />} onClick={() => setCreditsOpen(true)}>
                Credits
              </SidebarButton>
              {isStaff && (
                <SidebarButton icon={<IconTools size={25} />} onClick={() => setStaffOpen(true)}>
                  Staff Panel
                </SidebarButton>
              )}
              <SidebarButton icon={<IconLogout size={25} />} onClick={() => {
                auth.setToken(null)
                setIsLoggedIn(false)
                setServerLoaded(false)
                setUsername(null)
                setIsStaff(false)
                setAccountLock(null)
                setLockCountdown(null)
              }} danger>
                Logout
              </SidebarButton>
              <SidebarButton icon={<IconUserCircle size={25} />}>
                {isStaff && <IconTools size={20} className="account-staff-icon" title="Staff" />}
                {username}
              </SidebarButton>
            </>
          ) : (
            <>
              <SidebarButton icon={<IconSettings size={25} />} onClick={() => setSettingsOpen(true)}>
                Settings
              </SidebarButton>
              <SidebarButton icon={<IconStar size={25} />} onClick={() => setCreditsOpen(true)}>
                Credits
              </SidebarButton>
              <SidebarButton icon={<IconLogin size={25} />} onClick={() => setSignInOpen(true)}>
                Sign In
              </SidebarButton>
              <SidebarButton icon={<IconUserPlus size={25} />} onClick={() => setRegisterOpen(true)}>
                Register
              </SidebarButton>
              <SidebarButton icon={<IconUserCircle size={25} />}>
                Guest
              </SidebarButton>
            </>
          )}
        </div>
      </aside>

      <main className="game-main">
        {/* If the account is locked, replace main content with lock info */}
        {(accountLock && (accountLock.lockUntil === -1 || (typeof accountLock.lockUntil === 'number' && accountLock.lockUntil > Date.now()))) ? (
          <Card className="locked-card"><div className="locked-card-wrapper">
            <div className="locked-card-top">
              <div className="locked-card-badge">
                <IconLock size={40} />
              </div>
              <div className="locked-card-title">
                <h2>Account locked</h2>
                <div className="locked-card-subtext">Access to the clicker area is currently restricted.</div>
              </div>
            </div>

            <div className="locked-card-body">
              {accountLock.lockReason && (
                <div className="locked-row locked-row--mb-md">
                  <IconAlertCircle size={18} />
                  <div><strong>Reason:</strong> {accountLock.lockReason}</div>
                </div>
              )}

              {accountLock.lockedAt && (
                <div className="locked-row locked-row--mb-sm">
                  <IconCalendar size={16} />
                  <div><strong>Locked at:</strong> {new Date(accountLock.lockedAt).toLocaleString()}</div>
                </div>
              )}

              <div className="locked-row locked-expires-row">
                <IconClock size={16} />
                <div>
                  <strong>Expires:</strong>{' '}
                  {accountLock.lockUntil === -1 ? (
                    <span>Permanent</span>
                  ) : (
                    <span>{lockCountdown !== null ? (lockCountdown > 0 ? `${Math.floor(lockCountdown / 3600)}h ${Math.floor((lockCountdown % 3600) / 60)}m ${lockCountdown % 60}s` : 'Expired') : 'Loading...'}</span>
                  )}
                </div>
              </div>

              <div className="locked-contact">
                If you believe this is a mistake, please contact staff for assistance.
              </div>
            </div>
          </div></Card>
        ) : (
          <>
            <Button onClick={handleClick} disabled={buttonDisabled}>{count ? `You have clicked ${count} times` : 'Click Me!'}</Button>

            <ProgressBar value={count / getMaxCount()} showValue maxValue={getMaxCount()} animated />
          </>
        )}
      </main>

      <Modal title="Congratulations!" isOpen={modalOpen} onClose={handleExitModal}>
        <p style={{ marginBottom: '1rem' }}>You've reached Evolution {evolution + 1}!</p>
        <Button onClick={handleExitModal}>Okay!</Button>
      </Modal>

      {/* Staff Panel (staff only) */}
      <StaffPanel isOpen={staffOpen} onClose={() => setStaffOpen(false)} />

      {/* Sign In modal */}
      <Modal title="Sign In" isOpen={signInOpen} onClose={() => setSignInOpen(false)} size="small">
        <LoginForm
          onClose={() => setSignInOpen(false)}
          onLogin={() => {
            setIsLoggedIn(true)
            // reset serverLoaded until the fetchUser effect completes
            setServerLoaded(false)
            setSignInOpen(false)
          }}
          onSwitchToRegister={() => {
            setSignInOpen(false)
            setRegisterOpen(true)
          }}
        />
      </Modal>

      {/* Settings modal */}
      <Modal title="Settings" isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} size="medium">
        <SettingsPanel settings={settings} onChange={(s) => {
          setSettings(s)
          settingsService.saveSettings(s)
        }} />
      </Modal>

      {/* Credits modal */}
      <Modal title="Credits" isOpen={creditsOpen} onClose={() => setCreditsOpen(false)} size="small">
        <div className="credits-intro" style={{ marginBottom: '1rem' }}>
          <p>Thanks to everyone who helped bring this project to life.</p>
        </div>

        {/* Credits grid */}
        <div className="credits-grid">
          {[
            {
              name: 'proplayer919',
              role: 'Creator & Developer',
              avatar: <IconUserCircle size={40} />,
              links: [
                { href: 'https://github.com/proplayer919', icon: <IconBrandGithub size={16} /> },
                { href: 'mailto:me@proplayer919.dev', icon: <IconMail size={16} /> }
              ]
            },
            {
              name: 'Ferretosan',
              role: 'Music, Sound Effects, and Art',
              avatar: <IconUserCircle size={40} />,
              links: [
                { href: 'https://github.com/Ferretosan', icon: <IconBrandGithub size={16} /> },
                { href: 'mailto:me@ferretosan.com', icon: <IconMail size={16} /> }
              ]
            }
          ].map(person => (
            <Card key={person.name} className="credit-card">
              <div className="credit-top">
                <div className="credit-avatar" aria-hidden>
                  {person.avatar}
                </div>
                <div className="credit-meta">
                  <div className="credit-name">{person.name}</div>
                  <div className="credit-role">{person.role}</div>
                </div>
              </div>
              {person.links && person.links.length > 0 && (
                <div className="credit-links">
                  {person.links.map(l => (
                    <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="credit-link">
                      {l.icon}
                    </a>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>

        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
          <Button onClick={() => setCreditsOpen(false)}>Close</Button>
        </div>
      </Modal>

      {/* Register modal */}
      <Modal title="Create account" isOpen={registerOpen} onClose={() => setRegisterOpen(false)} size="small">
        <RegisterForm
          onClose={() => setRegisterOpen(false)}
          onRegister={() => {
            // Pretend registration also logs the user in
            setIsLoggedIn(true)
            // reset serverLoaded until the fetchUser effect completes
            setServerLoaded(false)
            setRegisterOpen(false)
          }}
          onSwitchToSignIn={() => {
            setRegisterOpen(false)
            setSignInOpen(true)
          }}
        />
      </Modal>
    </div>
  )
}

export default App
