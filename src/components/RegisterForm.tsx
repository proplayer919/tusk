import React, { useState } from 'react'
import Input from './Input'
import Button from './Button'
import './Form.css'
import auth from '../services/auth'

interface RegisterFormProps {
  onClose: () => void
  onRegister: () => void
  onSwitchToSignIn?: () => void
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onClose, onRegister, onSwitchToSignIn }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [usernameTouched, setUsernameTouched] = useState(false)

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Please fill out all required fields.')
      return
    }

    // client-side username validation (same rules as server)
    const usernamePattern = /^[A-Za-z0-9_-]{3,20}$/
    if (!usernamePattern.test(username.trim())) {
      setError('Invalid username: must be 3-20 characters and contain only letters, numbers, underscores or dashes')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    // call backend
    try {
      const body = await auth.register(username.trim(), password)
      if (body.token) auth.setToken(body.token)
      onRegister()
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="form-row">
        <Input label="Username" placeholder="your handle" value={username} onChange={(e) => setUsername(e.target.value)} onBlur={() => setUsernameTouched(true)} />
        {/* helper / validation message */}
        {usernameTouched && (
          (() => {
            const val = username.trim()
            const usernamePattern = /^[A-Za-z0-9_-]{3,20}$/
            if (!val) return <div className="form-note">Username should be 3-20 characters: letters, numbers, underscores or dashes.</div>
            if (!usernamePattern.test(val)) return <div className="form-error">Invalid username format.</div>
            return <div className="form-note">Looks good.</div>
          })()
        )}
      </div>

      {/* removed email requirement: register with username + password */}

      <div className="form-row">
        <Input label="Password" type="password" placeholder="Choose a password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>

      <div className="form-row">
        <Input label="Confirm" type="password" placeholder="Repeat password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="form-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={
            !username.trim() || !password.trim() || password !== confirm || !/^[A-Za-z0-9_-]{3,20}$/.test(username.trim())
          }
        >
          Create Account
        </Button>
      </div>

      <div className="form-footer">
        <div className="form-note">Already registered?</div>
        <div>
          <button type="button" className="form-link" onClick={() => onSwitchToSignIn && onSwitchToSignIn()}>Sign in</button>
        </div>
      </div>
    </form>
  )
}

export default RegisterForm
