'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { logActivity } from '../../lib/clientActivity'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  // Keep this tab in sync with the token/user if they change in ANOTHER tab.
  // Without this, logging in as a different role (e.g. a student) in one tab
  // silently leaves other tabs (e.g. the admin panel) sending the wrong token,
  // which causes 403s and actions saved under the wrong account.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'token' || e.key === 'user' || e.key === null) checkAuth()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const checkAuth = () => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (token && userData) {
      try { setUser(JSON.parse(userData)) } catch { setUser(null) }
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      setUser(null)
      delete axios.defaults.headers.common['Authorization']
    }
    setLoading(false)
  }

  const login = (token, userData) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  const logout = () => {
    logActivity('logout', 'Logged out') // reads the token synchronously before we clear it
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    delete axios.defaults.headers.common['Authorization']
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}