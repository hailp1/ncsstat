import { createBrowserClient } from '@supabase/ssr'

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export function getSupabase() {
    if (!supabaseInstance) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('[Supabase Client] Missing environment variables:', {
                hasUrl: !!supabaseUrl,
                hasKey: !!supabaseAnonKey,
                url: supabaseUrl || 'MISSING',
                keyLength: supabaseAnonKey?.length || 0
            })
            // Warning: Using placeholder values for build/production when env vars are missing
            console.warn('[Supabase Client] Using placeholder values. Make sure to set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel settings.')
            supabaseInstance = createBrowserClient(
                'https://placeholder.supabase.co',
                'placeholder-key'
            )
        } else {
            console.log('[Supabase Client] Initializing with environment variables')
            supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey)
        }
    }
    return supabaseInstance
}

// Backward compatible alias
export const createClient = getSupabase
