import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Test 1: Basic connection
        const { data: healthCheck, error: healthError } = await supabase
            .from('profiles')
            .select('count')
            .limit(1)

        // Test 2: Auth configuration
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        // Test 3: User check
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        const result = {
            timestamp: new Date().toISOString(),
            environment: {
                nodeEnv: process.env.NODE_ENV,
                vercelEnv: process.env.VERCEL_ENV,
                supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
                siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
                hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            },
            tests: {
                databaseConnection: {
                    success: !healthError,
                    error: healthError?.message || null
                },
                sessionCheck: {
                    success: !sessionError,
                    hasSession: !!session,
                    error: sessionError?.message || null,
                    sessionData: session ? {
                        userId: session.user.id,
                        email: session.user.email,
                        expiresAt: new Date(session.expires_at! * 1000).toISOString(),
                        provider: session.user.app_metadata?.provider
                    } : null
                },
                userCheck: {
                    success: !userError,
                    hasUser: !!user,
                    error: userError?.message || null,
                    userData: user ? {
                        id: user.id,
                        email: user.email,
                        provider: user.app_metadata?.provider
                    } : null
                }
            },
            cookies: {
                raw: request.headers.get('cookie') || '',
                parsed: request.headers.get('cookie')?.split('; ').map(c => {
                    const [name, value] = c.split('=')
                    return {
                        name,
                        value: value?.slice(0, 20) + (value?.length > 20 ? '...' : ''),
                        isAuth: name.includes('sb-') || name.includes('auth') || name.includes('orcid')
                    }
                }) || []
            },
            recommendations: [] as string[]
        }

        // Add recommendations based on test results
        if (!result.tests.databaseConnection.success) {
            result.recommendations.push('Database connection failed - check Supabase URL and keys')
        }

        if (result.tests.sessionCheck.error) {
            result.recommendations.push('Session check failed - check auth configuration')
        }

        if (!result.environment.hasAnonKey) {
            result.recommendations.push('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
        }

        if (!result.environment.hasServiceKey) {
            result.recommendations.push('Missing SUPABASE_SERVICE_ROLE_KEY')
        }

        const authCookies = result.cookies.parsed.filter(c => c.isAuth)
        if (authCookies.length === 0) {
            result.recommendations.push('No authentication cookies found - user may not be logged in')
        }

        return NextResponse.json({
            success: true,
            data: result
        })
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 })
    }
}