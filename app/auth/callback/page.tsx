'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabase } from '@/utils/supabase/client'
import { Loader2 } from 'lucide-react'

function CallbackContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [status, setStatus] = useState('Đang xử lý đăng nhập...')

    // Use ref to track processed code to prevent double execution in Strict Mode
    const processedCode = useRef<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const handleAuthCallback = async () => {
            const code = searchParams.get('code')
            const next = searchParams.get('next') || '/analyze'
            const error = searchParams.get('error')
            const errorDescription = searchParams.get('error_description')

            console.log('[AuthCallback] v2.1 init - code:', code ? 'present' : 'missing');

            if (error) {
                console.error('[AuthCallback] URL Error:', error, errorDescription)
                if (isMounted) window.location.href = `/login?error=${encodeURIComponent(errorDescription || error)}`
                return
            }

            if (!code) {
                // If no code, check session directly
                const supabase = getSupabase()
                const { data } = await supabase.auth.getSession()
                if (data?.session) {
                    if (isMounted) window.location.href = next
                } else {
                    if (isMounted) window.location.href = '/login'
                }
                return
            }

            // Prevent double processing
            if (processedCode.current === code) {
                console.log('[AuthCallback] Code already processed, skipping...');
                return;
            }
            processedCode.current = code;

            const supabase = getSupabase();

            // FAST CHECK: Local session might exist
            const { data: existing } = await supabase.auth.getSession();
            if (existing?.session) {
                console.log('[AuthCallback] Existing session found, redirecting...');
                if (isMounted) window.location.href = next;
                return;
            }

            try {
                if (isMounted) setStatus('Đang xác thực bảo mật...');

                // Exchange code logic with strong timeout and error handling
                // We wrap the promise to ensure it never throws "Uncaught (in promise)"
                const exchangePromise = supabase.auth.exchangeCodeForSession(code)
                    .then((res: any) => ({ data: res.data, error: res.error, timeout: false }))
                    .catch((e: any) => ({ data: null, error: e, timeout: false }));

                const timeoutPromise = new Promise<{ data: any, error: any, timeout: boolean }>((resolve) => {
                    setTimeout(() => resolve({ data: null, error: new Error('Exchange Timeout'), timeout: true }), 15000);
                });

                // Race logic
                const result = await Promise.race([exchangePromise, timeoutPromise]);
                const { data, error: exchangeError, timeout } = result;

                if (timeout) {
                    console.warn('[AuthCallback] Timeout occurred during exchange');
                    throw new Error('Exchange Timeout');
                }

                if (exchangeError) {
                    // Start checking for session recovery if code was used (common issue)
                    if (exchangeError.message?.includes('code_challenge') || exchangeError.message?.includes('already been used')) {
                        console.warn('[AuthCallback] Code issue, checking session recovery...');
                        // Wait a moment for potential BG sync
                        await new Promise(r => setTimeout(r, 1000));
                        const { data: recovery } = await supabase.auth.getSession();
                        if (recovery?.session) {
                            console.log('[AuthCallback] Session recovered!');
                            if (isMounted) window.location.href = next;
                            return;
                        }
                    }
                    throw exchangeError;
                }

                if (data?.session) {
                    console.log('[AuthCallback] Exchange successful!');
                    if (isMounted) {
                        setStatus('Đăng nhập thành công!');
                        // Use window.location to force full reload and clean state
                        window.location.href = next;
                    }
                } else {
                    throw new Error('No session returned');
                }

            } catch (err: any) {
                console.error('[AuthCallback] Critical processing error:', err);

                // FINAL ATTEMPT: Check session one last time
                try {
                    const { data: finalCheck } = await supabase.auth.getSession();
                    if (finalCheck?.session) {
                        console.log('[AuthCallback] Session found in final check');
                        if (isMounted) window.location.href = next;
                        return;
                    }
                } catch (e) { /* ignore */ }

                if (isMounted) {
                    setStatus('Đăng nhập thất bại. Đang chuyển hướng...');
                    setTimeout(() => {
                        window.location.href = `/login?error=${encodeURIComponent(err.message || 'Login Failed')}`;
                    }, 1500);
                }
            }
        };

        handleAuthCallback();

        return () => { isMounted = false };
    }, [router, searchParams]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col items-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <p className="text-gray-600 font-medium">{status}</p>
            </div>
        </div>
    )
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        }>
            <CallbackContent />
        </Suspense>
    )
}
