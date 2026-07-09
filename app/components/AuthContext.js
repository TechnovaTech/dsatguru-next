'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { logActivity } from '../../lib/clientActivity'

const AuthContext = createContext()

// Decode a JWT payload (the middle segment) without verifying the signature.
// Client-side we only need the claims (exp/role); the server still verifies.
function decodeJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

// True only when the token has an exp claim that is already in the past.
// A token with no exp is treated as not-expired (server remains the authority).
export function isTokenExpired(token) {
  const payload = decodeJwt(token)
  if (!payload || !payload.exp) return false
  return payload.exp * 1000 <= Date.now()
}

// The landing route for a logged-in user, keyed off their role.
export function roleHome(role) {
  if (role === 'Admin' || role === 'TutorAdmin') return '/admin'
  if (role === 'Tutor') return '/tutor/dashboard'
  return '/dashboard'
}

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

  // A single global 401 handler: the moment any API call reports an expired /
  // invalid session, drop the cached token and bounce to login. Guarded so a
  // burst of parallel 401s only triggers one redirect, and skipped on the auth
  // pages themselves so a failed login (which also 401s) shows its own error.
  useEffect(() => {
    let redirecting = false
    const id = axios.interceptors.response.use(
      (res) => res,
      (error) => {
        if (error?.response?.status === 401 && !redirecting) {
          const path = typeof window !== 'undefined' ? window.location.pathname : ''
          const onAuthPage = path.startsWith('/login') || path.startsWith('/register')
          if (!onAuthPage) {
            redirecting = true
            logout()
            window.location.href = '/login?expired=1'
          }
        }
        return Promise.reject(error)
      }
    )
    return () => axios.interceptors.response.eject(id)
  }, [])

  const checkAuth = () => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (token && userData) {
      // Don't restore an already-expired token: it would render the app as
      // logged-in while every API call 401s. Clear it out instead.
      if (isTokenExpired(token)) {
        logout()
      } else {
        try { setUser(JSON.parse(userData)) } catch { setUser(null) }
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      }
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