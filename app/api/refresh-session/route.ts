import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Session Refresh API
 * 
 * Forces a session refresh and returns current session status
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        
        console.log('[Refresh Session] Starting session refresh...')
        
        // Get current session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
            console.error('[Refresh Session] Session error:', sessionError)
            return NextResponse.json({
                success: false,
                error: 'Session error: ' + sessionError.message,
                hasSession: false
            })
        }
        
        if (!currentSession) {
            console.log('[Refresh Session] No current session found')
            return NextResponse.json({
                success: false,
                error: 'No session found',
                hasSession: false
            })
        }
        
        console.log('[Refresh Session] Current session found, attempting refresh...')
        
        // Attempt to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        
        if (refreshError) {
            console.error('[Refresh Session] Refresh error:', refreshError)
            return NextResponse.json({
                success: false,
                error: 'Refresh error: ' + refreshError.message,
                hasSession: !!currentSession,
                currentSession: {
                    user: currentSession.user.email,
                    expires_at: new Date(currentSession.expires_at! * 1000).toISOString()
                }
            })
        }
        
        const newSession = refreshData.session
        if (!newSession) {
            console.warn('[Refresh Session] Refresh succeeded but no new session returned')
            return NextResponse.json({
                success: false,
                error: 'Refresh succeeded but no new session',
                hasSession: !!currentSession
            })
        }
        
        console.log('[Refresh Session] Session refreshed successfully')
        
        return NextResponse.json({
            success: true,
            message: 'Session refreshed successfully',
            hasSession: true,
            session: {
                user: newSession.user.email,
                expires_at: new Date(newSession.expires_at! * 1000).toISOString(),
                provider: newSession.user.app_metadata?.provider
            },
            refreshed: true
        })
        
    } catch (error: any) {
        console.error('[Refresh Session] Unexpected error:', error)
        return NextResponse.json({
            success: false,
            error: 'Unexpected error: ' + error.message,
            hasSession: false
        }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        
        // Just get current session status
        const { data: { session }, error } = await supabase.auth.getSession()
        
        return NextResponse.json({
            hasSession: !!session,
            error: error?.message,
            session: session ? {
                user: session.user.email,
                expires_at: new Date(session.expires_at! * 1000).toISOString(),
                provider: session.user.app_metadata?.provider
            } : null
        })
        
    } catch (error: any) {
        return NextResponse.json({
            hasSession: false,
            error: error.message
        }, { status: 500 })
    }
}