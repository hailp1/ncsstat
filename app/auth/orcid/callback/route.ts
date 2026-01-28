import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { exchangeOrcidCode, getOrcidProfile } from '@/lib/orcid-auth';

/**
 * ORCID OAuth Callback Handler
 * 
 * This route handles the callback from ORCID OAuth authorization.
 * It exchanges the code for tokens, gets the user profile,
 * and creates/links the user in Supabase.
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    console.log('[ORCID Callback] Processing callback:', { 
        code: code?.slice(0, 8) + '...', 
        state, 
        error,
        origin: request.nextUrl.origin 
    });

    // Handle errors from ORCID
    if (error) {
        console.error('[ORCID Callback] OAuth error:', error, errorDescription);
        return NextResponse.redirect(
            new URL(`/login?error=${encodeURIComponent('ORCID lỗi: ' + (errorDescription || error))}`, request.url)
        );
    }

    // Validate code
    if (!code) {
        console.error('[ORCID Callback] No authorization code provided');
        return NextResponse.redirect(
            new URL('/login?error=no_orcid_code', request.url)
        );
    }

    // Parse state to get next URL and validate CSRF
    let nextUrl = '/analyze';
    let csrfToken = null;
    try {
        if (state) {
            const stateData = JSON.parse(atob(state));
            nextUrl = stateData.next || '/analyze';
            csrfToken = stateData.csrf;
            console.log('[ORCID Callback] Parsed state - next URL:', nextUrl, 'CSRF token present:', !!csrfToken);
        }
    } catch (err) {
        console.warn('[ORCID Callback] Failed to parse state, using default next URL');
    }

    // Basic CSRF validation (check if token exists)
    if (!csrfToken) {
        console.warn('[ORCID Callback] Missing CSRF token in state');
        return NextResponse.redirect(
            new URL('/login?error=invalid_request_state', request.url)
        );
    }

    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/auth/orcid/callback`;

    try {
        // Exchange code for tokens
        console.log('[ORCID Callback] Exchanging code for tokens');
        const tokenData = await exchangeOrcidCode(code, redirectUri);
        if (!tokenData) {
            console.error('[ORCID Callback] Token exchange failed');
            return NextResponse.redirect(
                new URL('/login?error=orcid_token_exchange_failed', request.url)
            );
        }

        console.log('[ORCID Callback] Token exchange successful, ORCID:', tokenData.orcid);

        // Get ORCID profile
        console.log('[ORCID Callback] Fetching ORCID profile');
        const profile = await getOrcidProfile(tokenData.orcid, tokenData.access_token);
        if (!profile) {
            console.error('[ORCID Callback] Profile fetch failed');
            return NextResponse.redirect(
                new URL('/login?error=orcid_profile_failed', request.url)
            );
        }

        console.log('[ORCID Callback] Profile fetched successfully:', profile.name);

        // Create or update user in Supabase
        const supabase = await createClient();

        // Check if user already exists with this ORCID
        console.log('[ORCID Callback] Checking for existing profile');
        const { data: existingProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('orcid_id', tokenData.orcid)
            .single();

        if (profileError && profileError.code !== 'PGRST116') {
            console.error('[ORCID Callback] Database error checking profile:', profileError);
            return NextResponse.redirect(
                new URL('/login?error=database_error', request.url)
            );
        }

        if (existingProfile) {
            console.log('[ORCID Callback] Existing user found, signing in:', existingProfile.id);
            
            // User exists, sign them in
            // Update last_active
            await supabase
                .from('profiles')
                .update({ last_active: new Date().toISOString() })
                .eq('id', existingProfile.id);

            // Create a secure session cookie
            const response = NextResponse.redirect(new URL(nextUrl, request.url));
            response.cookies.set('orcid_user', existingProfile.id, {
                httpOnly: true, // Secure: Prevent XSS attacks
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 1 week
                path: '/',
            });

            console.log('[ORCID Callback] Session cookie set, redirecting to:', nextUrl);
            return response;
        }

        console.log('[ORCID Callback] New user, redirecting to complete profile');

        // New ORCID user - redirect to complete profile
        // Store ORCID data temporarily for registration
        const response = NextResponse.redirect(
            new URL(`/auth/complete-profile?orcid=${tokenData.orcid}&name=${encodeURIComponent(profile.name)}`, request.url)
        );

        response.cookies.set('orcid_pending', JSON.stringify({
            orcid: tokenData.orcid,
            name: profile.name,
            email: profile.email,
            // access_token removed for security - will re-fetch if needed
        }), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 10, // 10 minutes
            path: '/',
        });

        return response;

    } catch (error: any) {
        console.error('[ORCID Callback] Unexpected error:', error);
        return NextResponse.redirect(
            new URL(`/login?error=${encodeURIComponent('Lỗi ORCID không mong muốn: ' + error.message)}`, request.url)
        );
    }
}
