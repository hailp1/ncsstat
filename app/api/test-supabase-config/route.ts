import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        
        // Test basic connection
        const { data, error } = await supabase.from('profiles').select('count').limit(1)
        
        const config = {
            timestamp: new Date().toISOString(),
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
            siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
            hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            databaseConnection: !error,
            databaseError: error?.message || null,
            expectedCallbacks: [
                `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
                `${process.env.NEXT_PUBLIC_SITE_URL}/auth/orcid/callback`
            ],
            supabaseCallback: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback`,
            instructions: {
                step1: 'Go to Supabase Dashboard → Authentication → Settings',
                step2: `Set Site URL to: ${process.env.NEXT_PUBLIC_SITE_URL}`,
                step3: `Add Redirect URLs: ${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
                step4: 'Go to Authentication → Providers',
                step5: `Configure OAuth providers with redirect URI: ${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback`
            }
        }
        
        return NextResponse.json({
            success: true,
            config
        })
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            config: {
                supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
                siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
                hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            }
        }, { status: 500 })
    }
}