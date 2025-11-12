import { useEffect, useState } from 'react'
import {
  Button, ProgressBar, Modal, IconLabel, SidebarButton
} from './components'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import { IconAward, IconSettings, IconLogout, IconLogin, IconUserPlus, IconStar, IconUserCircle, IconTools } from '@tabler/icons-react';
import './App.css'
import auth from './services/auth'
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

  // modals for sign in / register
  const [signInOpen, setSignInOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  // global small modals: settings and credits
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [creditsOpen, setCreditsOpen] = useState(false)

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

        // Determine server progress: prefer explicit user.progress returned from /api/user
        // If missing, fall back to fetching /api/progress. Also, if guest local progress
        // exists, upload it and then reload server progress.
        try {
          const localKey = 'tusk_progress'
          const localRaw = localStorage.getItem(localKey)

          if (localRaw) {
            // merge local guest progress with server progress and sync the better one
            const merged = await progressService.mergeAndSyncLocalWithServer()
            if (merged) {
              if (typeof merged.count === 'number') setCount(merged.count)
              if (typeof merged.evolution === 'number') setEvolution(merged.evolution)
              if (merged.hasClickedOnce) setHasClickedOnce(true)
            }
          } else {
            // no guest progress to merge — apply server-side progress from user if present
            const serverProgress = user && user.progress ? user.progress : await progressService.loadProgress()
            if (serverProgress) {
              if (typeof serverProgress.count === 'number') setCount(serverProgress.count)
              if (typeof serverProgress.evolution === 'number') setEvolution(serverProgress.evolution)
              if (serverProgress.hasClickedOnce) setHasClickedOnce(true)
            }
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

  // persist progress when important pieces change (only after we've hydrated initial state)
  useEffect(() => {
    if (!hydrated) return
    // if logged in, wait until we've loaded/applied server progress before saving
    if (isLoggedIn && !serverLoaded) return
    progressService.saveProgress({ count, evolution, hasClickedOnce })
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

      // Only enable this behaviour at evolution 15
      if (evolution !== 15) return

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
          <img src="/images/logo.png" alt="Tusk" className="site-logo" />
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
              <SidebarButton icon={<IconLogout size={25} />} onClick={() => {
                auth.setToken(null)
                setIsLoggedIn(false)
                setServerLoaded(false)
                setUsername(null)
                setIsStaff(false)
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
        <Button onClick={handleClick} disabled={buttonDisabled}>{count ? `You have clicked ${count} times` : 'Click Me!'}</Button>

        <ProgressBar value={count / getMaxCount()} showValue maxValue={getMaxCount()} animated />
      </main>

      <Modal title="Congratulations!" isOpen={modalOpen} onClose={handleExitModal}>
        <p style={{ marginBottom: '1rem' }}>You've reached Evolution {evolution + 1}!</p>
        <Button onClick={handleExitModal}>Okay!</Button>
      </Modal>

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
      <Modal title="Settings" isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} size="small">
        <p style={{ marginBottom: '1rem' }}>Settings are not implemented yet. This is a placeholder.</p>
        <Button onClick={() => setSettingsOpen(false)}>Close</Button>
      </Modal>

      {/* Credits modal */}
      <Modal title="Credits" isOpen={creditsOpen} onClose={() => setCreditsOpen(false)} size="small">
        <div style={{ marginBottom: '1rem' }}>
          <p><strong>Tusk</strong></p>
          <p>proplayer919: Creator & Developer</p>
          <p>Ferretosan: Logo, art, sfx, and music</p>
        </div>
        <Button onClick={() => setCreditsOpen(false)}>Close</Button>
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
