import React, { useState } from 'react'
import Input from './Input'
import Button from './Button'
import './Form.css'

interface RegisterFormProps {
  onClose: () => void
  onRegister: () => void
  onSwitchToSignIn?: () => void
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onClose, onRegister, onSwitchToSignIn }) => {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setError('')

    if (!username.trim() || !email.trim() || !password.trim()) {
      setError('Please fill out all required fields.')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    // Placeholder: pretend registration succeeded
    onRegister()
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="form-row">
        <Input label="Username" placeholder="your handle" value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>

      <div className="form-row">
        <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div className="form-row">
        <Input label="Password" type="password" placeholder="Choose a password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>

      <div className="form-row">
        <Input label="Confirm" type="password" placeholder="Repeat password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="form-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit}>Create Account</Button>
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
