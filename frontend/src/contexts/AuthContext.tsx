import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { User } from '../types'
import { getCurrentUser, setCurrentUser, getUserByLogin } from '../utils/storage'
import { getPermissions, type Permissions } from '../utils/permissions'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (login: string, senha: string) => Promise<boolean>
  logout: () => void
  isAdmin: boolean
  isGestor: boolean
  canEdit: boolean
  permissions: Permissions | null
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

  const permissions = user ? getPermissions(user.perfil) : null
  const isAdmin  = permissions?.isAdmin  ?? false
  const isGestor = permissions?.isGestor ?? false
  const canEdit  = (permissions?.canEditOwnRequisition || permissions?.canEditAllRequisitions) ?? false

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isGestor, canEdit, permissions }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
