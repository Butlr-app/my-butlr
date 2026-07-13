import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from './types'
import type { Role } from './roleContext'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  profileLoading: boolean
  signUp: (email: string, password: string, fullName: string, role: Role) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null }>
  refreshProfile: (options?: { silent?: boolean }) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  profileLoading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  resendVerificationEmail: async () => ({ error: null }),
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string, options?: { silent?: boolean }) => {
    if (!options?.silent) setProfileLoading(true)

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, company, role, onboarding_completed, date_format')
      .eq('id', userId)
      .single()

    if (error) {
      // Fallback if onboarding_completed column is not migrated yet
      const { data: fallback } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, company, role')
        .eq('id', userId)
        .single()

      setProfile(fallback ? {
        ...fallback,
        onboarding_completed: false,
        date_format: 'DD/MM/YYYY',
      } as Profile : null)
    } else {
      setProfile({
        ...(data as Profile),
        onboarding_completed: data?.onboarding_completed ?? false,
        date_format: data?.date_format ?? 'DD/MM/YYYY',
      })
    }

    if (!options?.silent) setProfileLoading(false)
  }, [])

  const refreshProfile = useCallback(async (options?: { silent?: boolean }) => {
    if (user) await fetchProfile(user.id, options)
  }, [user, fetchProfile])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setProfileLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setProfileLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signUp = async (email: string, password: string, fullName: string, role: Role) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })

    if (!error) {
      await supabase.auth.signOut()
    }

    return { error: error as Error | null }
  }

  const resendVerificationEmail = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })
    return { error: error as Error | null }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading, profileLoading,
      signUp, signIn, signOut, resendVerificationEmail, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
