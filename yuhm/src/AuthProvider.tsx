import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { foodDb, foodDbConfigured } from './lib/foodRepository'

type AuthValue = { member: User | null; authReady: boolean }

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!foodDbConfigured)

  useEffect(() => {
    if (!foodDb) return
    foodDb.auth.getSession().then(({ data }) => setMember(data.session?.user ?? null)).finally(() => setAuthReady(true))
    const { data } = foodDb.auth.onAuthStateChange((_event, session) => {
      setMember(session?.user ?? null)
      setAuthReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ member, authReady }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth requires an AuthProvider')
  return value
}
