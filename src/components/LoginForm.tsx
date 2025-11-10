import React, { useState } from 'react'
import Input from './Input'
import Button from './Button'
import './Form.css'
import auth from '../services/auth'

interface LoginFormProps {
  onClose: () => void
  onLogin: () => void
  onSwitchToRegister?: () => void
}

const LoginForm: React.FC<LoginFormProps> = ({ onClose, onLogin, onSwitchToRegister }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.')
      return
    }

    try {
      const body = await auth.login(username.trim(), password)
      if (body.token) auth.setToken(body.token)
      onLogin()
    } catch (err: any) {
      setError(err.message || 'Sign in failed')
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="form-row">
        <Input label="Username" placeholder="your handle" value={username} onChange={(e) => setUsername(e.target.value)} />
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
