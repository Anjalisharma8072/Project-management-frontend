import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const onSubmit = async event => {
    event.preventDefault()
    try {
      await login(form)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <h1>Welcome back</h1>
        <p className="muted small">Log in with your workspace account.</p>
        <form onSubmit={onSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={e => {
                setError('')
                setForm({ ...form, email: e.target.value })
              }}
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={e => {
                setError('')
                setForm({ ...form, password: e.target.value })
              }}
              required
            />
          </label>
          {error ? (
            <div className="login-error-block">
              <p className="error small">{error}</p>
              {/not registered|sign up first/i.test(error) ? (
                <p className="muted small login-error-follow">
                  <Link to="/signup">Create an account</Link>
                </p>
              ) : null}
            </div>
          ) : null}
          <button type="submit" className="btn primary">
            Login
          </button>
        </form>
        <p className="muted small">
          New user? <Link to="/signup">Signup</Link>
        </p>
      </section>
    </main>
  )
}

export default LoginPage
