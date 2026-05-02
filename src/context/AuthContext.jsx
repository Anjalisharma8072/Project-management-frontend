import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, setAuthToken } from '../api/client'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'))

  useEffect(() => {
    setAuthToken(token)
    if (token) localStorage.setItem('token', token)
    else localStorage.removeItem('token')
  }, [token])

  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user))
    else localStorage.removeItem('user')
  }, [user])

  const signup = async payload => {
    const { data } = await api.post('/auth/signup', payload)
    setAuthToken(data.token)
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
  }

  const login = async payload => {
    const { data } = await api.post('/auth/login', payload)
    setAuthToken(data.token)
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setAuthToken(null)
    setToken(null)
    setUser(null)
  }

  const value = useMemo(() => ({ token, user, signup, login, logout }), [token, user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
