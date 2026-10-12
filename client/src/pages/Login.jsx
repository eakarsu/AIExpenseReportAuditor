import React, { useState } from 'react'
import { api } from '../services/api'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const demoAutofillEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL === 'true'

  const fillDemo = async () => {
    setDemoLoading(true)
    setError('')
    try {
      const credentials = await api.getDemoCredentials()
      setEmail(credentials.email)
      setPassword(credentials.password)
    } catch (err) {
      setError(err.message)
    } finally {
      setDemoLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await api.login(email, password)
      onLogin(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo">{'\u{1F4B8}'}</div>
        <h1>AI Expense Auditor</h1>
        <p className="subtitle">Enterprise expense management powered by AI</p>

        {error && <div className="error-msg">{error}</div>}

        {demoAutofillEnabled && (
          <button type="button" className="demo-btn" onClick={fillDemo} disabled={demoLoading} aria-label="Fill Demo Credentials">
            {'\u{1F511}'} {demoLoading ? 'Loading Demo Credentials...' : 'Fill Demo Credentials'}
          </button>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
