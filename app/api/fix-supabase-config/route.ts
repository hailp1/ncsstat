import { NextRequest, NextResponse } from 'next/server'

/**
 * Supabase Configuration Fix API
 * 
 * This endpoint attempts to automatically configure Supabase settings
 * that are causing the no_session error.
 */
export async function POST(request: NextRequest) {
    try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ncsstat.ncskit.org'
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({
                success: false,
                error: 'Missing Supabase configuration',
                details: {
                    hasSupabaseUrl: !!supabaseUrl,
                    hasServiceRoleKey: !!serviceRoleKey
                }
            }, { status: 400 })
        }

        // Extract project reference from Supabase URL
        const projectRef = supabaseUrl.split('//')[1]?.split('.')[0]
        if (!projectRef) {
            return NextResponse.json({
                success: false,
                error: 'Invalid Supabase URL format'
            }, { status: 400 })
        }

        // Configuration to apply
        const authConfig = {
            SITE_URL: siteUrl,
            URI_ALLOW_LIST: [
                `${siteUrl}/auth/callback`,
                `${siteUrl}/auth/orcid/callback`,
                siteUrl
            ].join(','),
            DISABLE_SIGNUP: false,
            ENABLE_SIGNUP: true,
            ENABLE_EMAIL_CONFIRMATIONS: false,
            ENABLE_EMAIL_AUTOCONFIRM: true
        }

        console.log('[Fix Config] Attempting to configure Supabase:', {
            projectRef,
            siteUrl,
            authConfig
        })

        // Try to update auth configuration using Supabase Management API
        const managementApiUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`
        
        const response = await fetch(managementApiUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json',
                'apikey': serviceRoleKey
            },
            body: JSON.stringify(authConfig)
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[Fix Config] Management API error:', response.status, errorText)
            
            return NextResponse.json({
                success: false,
                error: 'Failed to update Supabase configuration via API',
                details: {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText,
                    attempted: authConfig
                },
                manualSteps: {
                    message: 'Please configure manually in Supabase Dashboard',
                    dashboardUrl: `https://supabase.com/dashboard/project/${projectRef}/auth/settings`,
                    settings: authConfig
                }
            }, { status: 500 })
        }

        const result = await response.json()
        console.log('[Fix Config] Configuration updated successfully:', result)

        return NextResponse.json({
            success: true,
            message: 'Supabase configuration updated successfully',
            applied: authConfig,
            result: result,
            nextSteps: [
                'Test authentication flow at /test-callback',
                'Try logging in with Google or LinkedIn',
                'Check if no_session error is resolved'
            ]
        })

    } catch (error: any) {
        console.error('[Fix Config] Unexpected error:', error)
        
        return NextResponse.json({
            success: false,
            error: 'Unexpected error while configuring Supabase',
            details: error.message,
            stack: error.stack,
            manualFix: {
                message: 'Please configure manually in Supabase Dashboard',
                steps: [
                    'Go to Supabase Dashboard → Authentication → Settings',
                    `Set Site URL: ${process.env.NEXT_PUBLIC_SITE_URL}`,
                    `Add Redirect URLs: ${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
                    'Enable OAuth providers (Google, LinkedIn)',
                    'Set callback URL for providers: ' + process.env.NEXT_PUBLIC_SUPABASE_URL + '/auth/v1/callback'
                ]
            }
        }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    // Return current configuration status
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const projectRef = supabaseUrl?.split('//')[1]?.split('.')[0]

    return NextResponse.json({
        currentConfig: {
            siteUrl,
            supabaseUrl,
            projectRef,
            hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        },
        requiredConfig: {
            siteUrl: siteUrl,
            redirectUrls: [
                `${siteUrl}/auth/callback`,
                `${siteUrl}/auth/orcid/callback`
            ],
            oauthCallbackUrl: `${supabaseUrl}/auth/v1/callback`
        },
        dashboardUrl: `https://supabase.com/dashboard/project/${projectRef}/auth/settings`,
        instructions: [
            'POST to this endpoint to attempt automatic configuration',
            'Or configure manually using the dashboard URL above'
        ]
    })
}