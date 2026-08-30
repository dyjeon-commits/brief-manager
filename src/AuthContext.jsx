import React, { createContext, useContext, useEffect, useState } from 'react'
import { call } from './backend'

const AuthContext = createContext(null)
const STORAGE_KEY = 'brief-manager-profile'

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try { setProfile(JSON.parse(saved)) } catch { /* ignore */ }
    }
    setLoading(false)
  }, [])

  async function signIn(name) {
    const found = await call('login', { name })
    if (!found) return '등록되지 않은 이름입니다. 팀 관리자에게 문의해주세요.'
    setProfile(found)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(found))
    return null
  }

  function signOut() {
    setProfile(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <AuthContext.Provider value={{ user: profile, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
