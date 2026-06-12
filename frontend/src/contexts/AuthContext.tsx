import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { User } from '../types'
import { getCurrentUser, setCurrentUser, getUserByLogin } from '../utils/storage'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (login: string, senha: string) => Promise<boolean>
  logout: () => void
  isAdmin: boolean
  canEdit: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = getCurrentUser()
    if (stored) setUser(stored)
    setLoading(false)
  }, [])

  const login = useCallback(async (loginInput: string, senha: string): Promise<boolean> => {
    const found = await getUserByLogin(loginInput)
    if (found && found.senha === senha) {
      const { senha: _, ...safeUser } = found
      setUser(safeUser as User)
      setCurrentUser(safeUser as User)
      return true
    }
    return false
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setCurrentUser(null)
  }, [])

  const isAdmin = user?.perfil === 'admin'
  const canEdit = user?.perfil === 'admin' || user?.perfil === 'vendedor' || user?.perfil === 'operacional'

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, canEdit }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
