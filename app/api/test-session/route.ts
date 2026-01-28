import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        
        // Get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        // Get user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        const result = {
            timestamp: new Date().toISOString(),
            hasSession: !!session,
            hasUser: !!user,
            sessionError: sessionError?.message || null,
            userError: userError?.message || null,
            sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
            userEmail: user?.email || null,
            userId: user?.id || null,
            cookies: request.headers.get('cookie') || '',
            userAgent: request.headers.get('user-agent') || '',
        }
        
        console.log('[Test Session API]', result)
        
        return NextResponse.json({
            success: true,
            data: result
        })
    } catch (error: any) {
        console.error('[Test Session API] Error:', error)
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}