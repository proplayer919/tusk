import React, { useState } from 'react'
import Input from './Input'
import Button from './Button'
import './Form.css'

interface LoginFormProps {
  onClose: () => void
  onLogin: () => void
  onSwitchToRegister?: () => void
}

const LoginForm: React.FC<LoginFormProps> = ({ onClose, onLogin, onSwitchToRegister }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.')
      return
    }

    // Placeholder: pretend sign-in succeeded
    onLogin()
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="form-row">
        <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div className="form-row">
        <Input label="Password" type="password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="form-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit}>Sign In</Button>
      </div>

      <div className="form-footer">
        <div className="form-note">Don't have an account?</div>
        <div>
          <button type="button" className="form-link" onClick={() => onSwitchToRegister && onSwitchToRegister()}>Create account</button>
        </div>
      </div>
    </form>
  )
}

export default LoginForm
