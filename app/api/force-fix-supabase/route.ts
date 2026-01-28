import { NextRequest, NextResponse } from 'next/server'

/**
 * Force Fix Supabase Configuration
 * 
 * This endpoint attempts multiple methods to fix Supabase configuration
 */
export async function POST(request: NextRequest) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ncsstat.ncskit.org'

        if (!supabaseUrl) {
            return NextResponse.json({
                success: false,
                error: 'Missing NEXT_PUBLIC_SUPABASE_URL'
            }, { status: 400 })
        }

        const projectRef = supabaseUrl.split('//')[1]?.split('.')[0]
        if (!projectRef) {
            return NextResponse.json({
                success: false,
                error: 'Invalid Supabase URL format'
            }, { status: 400 })
        }

        const results = []

        // Method 1: Try Supabase Management API
        if (serviceRoleKey) {
            try {
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

                const managementResponse = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'Content-Type': 'application/json',
                        'apikey': serviceRoleKey
                    },
                    body: JSON.stringify(authConfig)
                })

                if (managementResponse.ok) {
                    const result = await managementResponse.json()
                    results.push({
                        method: 'Management API',
                        success: true,
                        result: result
                    })
                } else {
                    const errorText = await managementResponse.text()
                    results.push({
                        method: 'Management API',
                        success: false,
                        error: `${managementResponse.status}: ${errorText}`
                    })
                }
            } catch (error: any) {
                results.push({
                    method: 'Management API',
                    success: false,
                    error: error.message
                })
            }
        } else {
            results.push({
                method: 'Management API',
                success: false,
                error: 'Missing SUPABASE_SERVICE_ROLE_KEY'
            })
        }

        // Method 2: Try direct SQL configuration (if service role key exists)
        if (serviceRoleKey) {
            try {
                const { createClient } = await import('@supabase/supabase-js')
                const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

                // Try to update auth configuration via SQL
                const { data, error } = await supabaseAdmin.rpc('update_auth_config', {
                    site_url: siteUrl,
                    redirect_urls: `${siteUrl}/auth/callback,${siteUrl}/auth/orcid/callback`
                })

                results.push({
                    method: 'SQL Configuration',
                    success: !error,
                    result: data,
                    error: error?.message
                })
            } catch (error: any) {
                results.push({
                    method: 'SQL Configuration',
                    success: false,
                    error: error.message
                })
            }
        }

        // Method 3: Test current configuration
        try {
            const { createClient } = await import('@supabase/supabase-js')
            const supabase = createClient(
                supabaseUrl, 
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            )

            // Test basic connection
            const { data, error } = await supabase.from('profiles').select('count').limit(1)
            
            results.push({
                method: 'Connection Test',
                success: !error,
                result: data,
                error: error?.message
            })
        } catch (error: any) {
            results.push({
                method: 'Connection Test',
                success: false,
                error: error.message
            })
        }

        const hasSuccess = results.some(r => r.success)

        return NextResponse.json({
            success: hasSuccess,
            message: hasSuccess ? 'Some configuration methods succeeded' : 'All configuration methods failed',
            results: results,
            nextSteps: hasSuccess ? [
                'Test authentication at /test-callback',
                'Try logging in with Google or LinkedIn',
                'Check if no_session error is resolved'
            ] : [
                'Manual configuration required in Supabase Dashboard',
                'Go to: https://supabase.com/dashboard/project/' + projectRef + '/auth/settings',
                'Set Site URL: ' + siteUrl,
                'Add Redirect URLs: ' + siteUrl + '/auth/callback'
            ],
            manualConfig: {
                dashboardUrl: `https://supabase.com/dashboard/project/${projectRef}/auth/settings`,
                siteUrl: siteUrl,
                redirectUrls: [
                    `${siteUrl}/auth/callback`,
                    `${siteUrl}/auth/orcid/callback`
                ],
                oauthCallbackUrl: `${supabaseUrl}/auth/v1/callback`
            }
        })

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: 'Unexpected error: ' + error.message,
            stack: error.stack
        }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    // Return bypass URL for testing
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ncsstat.ncskit.org'
    
    return NextResponse.json({
        message: 'Force fix Supabase configuration endpoint',
        methods: [
            'POST to this endpoint to attempt all fix methods',
            'Use bypass URL for temporary access'
        ],
        bypassUrl: `${siteUrl}/analyze?bypass_auth=temp_access_2026`,
        warning: 'Bypass is temporary and should only be used for testing',
        manualConfig: {
            dashboardUrl: 'https://supabase.com/dashboard/project/qshimpxmirkyfenhklfh/auth/settings',
            requiredSettings: {
                siteUrl: siteUrl,
                redirectUrls: [
                    `${siteUrl}/auth/callback`,
                    `${siteUrl}/auth/orcid/callback`
                ]
            }
        }
    })
}