import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const SignupPage = () => {
  const navigate = useNavigate()
  const { signup } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member' })
  const [error, setError] = useState('')

  const onSubmit = async event => {
    event.preventDefault()
    try {
      await signup(form)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed')
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <h1>Create account</h1>
        <p className="muted small">Admins create projects and assign work. Members update their tasks.</p>
        <form onSubmit={onSubmit}>
          <label className="field">
            <span>Name</span>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          </label>
          <label className="field">
            <span>Role</span>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          {error ? <p className="error small">{error}</p> : null}
          <button type="submit" className="btn primary">
            Sign up
          </button>
        </form>
        <p className="muted small">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </section>
    </main>
  )
}

export default SignupPage
