import { useState } from 'react'
import {
  Button, ProgressBar, Modal, AccountBadge, IconLabel
} from './components'
import { IconAward, IconSettings, IconLogout } from '@tabler/icons-react';
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [evolution, setEvolution] = useState(1)
  const [buttonDisabled, setButtonDisabled] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  function getMaxCount() {
    return (evolution * 10) + 40
  }

  function handleClick() {
    setCount(count + 1)

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

        <p className="evolution-label">
          <IconLabel icon={<IconAward size={20} />}>Evolution {evolution}</IconLabel>
        </p>

        <AccountBadge>
          <button className="account-menu-item" onClick={() => alert('Open settings (placeholder)')}>
            <IconLabel icon={<IconSettings size={20} />}>Settings</IconLabel>
          </button>
          <button className="account-menu-item logout" onClick={() => alert('Logged out (placeholder)')}>
            <IconLabel icon={<IconLogout size={20} />}>Logout</IconLabel>
          </button>
        </AccountBadge>
      </header>

      <Button onClick={handleClick} disabled={buttonDisabled}>{count ? `You have clicked ${count} times` : 'Click Me!'}</Button>

      <ProgressBar value={count / getMaxCount()} animated />

      <Modal title="Congratulations!" isOpen={modalOpen} onClose={handleExitModal}>
        <p style={{ marginBottom: '1rem' }}>You've reached Evolution {evolution + 1}!</p>

        <Button onClick={handleExitModal}>Okay!</Button>
      </Modal>
    </div>
  )
}

export default App
