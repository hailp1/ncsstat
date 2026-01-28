/**
 * Session Management Utilities
 * 
 * Provides utilities for managing both Supabase and ORCID sessions
 */

import { getSupabase } from '@/utils/supabase/client'

export interface SessionInfo {
    isAuthenticated: boolean
    authType: 'supabase' | 'orcid' | null
    userId: string | null
    email: string | null
    name: string | null
    orcidId: string | null
}

/**
 * Get current session information (client-side)
 */
export async function getCurrentSession(): Promise<SessionInfo> {
    const sessionInfo: SessionInfo = {
        isAuthenticated: false,
        authType: null,
        userId: null,
        email: null,
        name: null,
        orcidId: null
    }

    try {
        // Check ORCID session first
        if (typeof document !== 'undefined') {
            const orcidCookie = document.cookie
                .split('; ')
                .find(row => row.startsWith('orcid_user='))
                ?.split('=')[1]

            if (orcidCookie) {
                sessionInfo.isAuthenticated = true
                sessionInfo.authType = 'orcid'
                sessionInfo.userId = orcidCookie
                // Note: We can't get full profile info from client-side easily
                return sessionInfo
            }
        }

        // Check Supabase session only if environment is configured
        const hasSupabaseConfig = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                                 process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
                                 !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

        if (hasSupabaseConfig) {
            const supabase = getSupabase()
            const { data: { session }, error } = await supabase.auth.getSession()

            if (!error && session?.user) {
                sessionInfo.isAuthenticated = true
                sessionInfo.authType = 'supabase'
                sessionInfo.userId = session.user.id
                sessionInfo.email = session.user.email || null
                sessionInfo.name = session.user.user_metadata?.full_name || 
                                 session.user.user_metadata?.name || null
            }
        } else {
            console.warn('[Session Utils] Supabase not configured, skipping Supabase session check')
        }

    } catch (error) {
        console.error('[Session Utils] Error getting session:', error)
    }

    return sessionInfo
}

/**
 * Sign out from current session
 */
export async function signOut(): Promise<void> {
    try {
        // Clear ORCID cookie
        if (typeof document !== 'undefined') {
            document.cookie = 'orcid_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
            document.cookie = 'orcid_pending=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        }

        // Sign out from Supabase only if configured
        const hasSupabaseConfig = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                                 process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
                                 !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

        if (hasSupabaseConfig) {
            const supabase = getSupabase()
            await supabase.auth.signOut()
        }

        // Clear any other auth-related storage
        if (typeof localStorage !== 'undefined') {
            // Clear Supabase tokens
            Object.keys(localStorage).forEach(key => {
                if (key.includes('supabase') || key.includes('sb-')) {
                    localStorage.removeItem(key)
                }
            })
        }

        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.clear()
        }

        console.log('[Session Utils] Signed out successfully')
    } catch (error) {
        console.error('[Session Utils] Error signing out:', error)
    }
}

/**
 * Check if user is authenticated (quick check)
 */
export function isAuthenticated(): boolean {
    if (typeof document === 'undefined') return false
    
    // Quick check for ORCID cookie
    const hasOrcidCookie = document.cookie.includes('orcid_user=')
    
    // Quick check for Supabase session in localStorage
    let hasSupabaseSession = false
    if (typeof localStorage !== 'undefined') {
        // Look for any Supabase auth token
        const authKeys = Object.keys(localStorage).filter(key => 
            key.includes('supabase') && key.includes('auth') && key.includes('token')
        )
        hasSupabaseSession = authKeys.length > 0
    }
    
    return hasOrcidCookie || hasSupabaseSession
}

/**
 * Redirect to login with current page as next parameter
 */
export function redirectToLogin(): void {
    const currentPath = window.location.pathname + window.location.search
    const loginUrl = `/login?next=${encodeURIComponent(currentPath)}`
    window.location.href = loginUrl
}

/**
 * Get user ID from current session (quick method)
 */
export function getCurrentUserId(): string | null {
    if (typeof document === 'undefined') return null
    
    // Check ORCID cookie first
    const orcidCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('orcid_user='))
        ?.split('=')[1]

    if (orcidCookie) {
        return orcidCookie
    }

    // Check Supabase session in localStorage (synchronous)
    if (typeof localStorage !== 'undefined') {
        try {
            // Look for Supabase auth token with the actual project ID
            const authKeys = Object.keys(localStorage).filter(key => 
                key.includes('supabase') && key.includes('auth') && key.includes('token')
            )
            
            for (const key of authKeys) {
                const authToken = localStorage.getItem(key)
                if (authToken) {
                    const parsed = JSON.parse(authToken)
                    if (parsed?.user?.id) {
                        return parsed.user.id
                    }
                }
            }
        } catch {
            // Ignore parsing errors
        }
    }

    return null
}