import { useState } from 'react'
import {
  Button, ProgressBar, Modal, AccountBadge, IconLabel
} from './components'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import { IconAward, IconSettings, IconLogout, IconLogin, IconUserPlus, IconUserCircle } from '@tabler/icons-react';
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [evolution, setEvolution] = useState(1)
  const [buttonDisabled, setButtonDisabled] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [hasClickedOnce, setHasClickedOnce] = useState(false)

  // auth state: when false the account dropdown shows Sign In / Register
  const [isLoggedIn, setIsLoggedIn] = useState(false)

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

        <AccountBadge accountAvatar={!isLoggedIn ? <IconUserCircle size={30} /> : undefined} displayName={!isLoggedIn ? 'Guest' : undefined}>
          {isLoggedIn ? (
            <>
              <button className="account-menu-item" onClick={() => alert('Open settings (placeholder)')}>
                <IconLabel icon={<IconSettings size={20} />}>Settings</IconLabel>
              </button>
              <button
                className="account-menu-item logout"
                onClick={() => {
                  // set logged out and close menu (AccountBadge will close it)
                  setIsLoggedIn(false)
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
