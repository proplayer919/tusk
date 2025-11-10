import { useEffect, useState } from 'react'
import {
  Button, ProgressBar, Modal, AccountBadge, IconLabel
} from './components'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import { IconAward, IconSettings, IconLogout, IconLogin, IconUserPlus } from '@tabler/icons-react';
import './App.css'
import auth from './services/auth'
import progressService from './services/progress'

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

  // modals for sign in / register
  const [signInOpen, setSignInOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)

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


  function handleExitModal() {
    setModalOpen(false)
    setEvolution(evolution + 1)
    setCount(0)
    setButtonDisabled(false)
  }

  return (
    <div className="app">
      <header className="game-header">
        <h1>Tusk</h1>

        {hasClickedOnce && (
          <p className="evolution-label">
            <IconLabel icon={<IconAward size={20} />}>Evolution {evolution}</IconLabel>
          </p>
        )}

        <AccountBadge displayName={!isLoggedIn ? 'Guest' : username ?? undefined}>
          {isLoggedIn ? (
            <>
              <button className="account-menu-item" onClick={() => alert('Open settings (placeholder)')}>
                <IconLabel icon={<IconSettings size={20} />}>Settings</IconLabel>
              </button>
              <button
                className="account-menu-item logout"
                onClick={() => {
                  // logout
                  auth.setToken(null)
                  setIsLoggedIn(false)
                  setServerLoaded(false)
                  setUsername(null)
                }}
              >
                <IconLabel icon={<IconLogout size={20} />}>Logout</IconLabel>
              </button>
            </>
          ) : (
            <>
              <button
                className="account-menu-item"
                onClick={() => setSignInOpen(true)}
              >
                <IconLabel icon={<IconLogin size={20} />}>Sign In</IconLabel>
              </button>
              <button
                className="account-menu-item"
                onClick={() => setRegisterOpen(true)}
              >
                <IconLabel icon={<IconUserPlus size={20} />}>Register</IconLabel>
              </button>
            </>
          )}
        </AccountBadge>
      </header>

      <Button onClick={handleClick} disabled={buttonDisabled}>{count ? `You have clicked ${count} times` : 'Click Me!'}</Button>

      <ProgressBar value={count / getMaxCount()} animated />

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
