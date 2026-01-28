'use client'

import { getSupabase } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'

export default function AuthDebugPage() {
    const [debugInfo, setDebugInfo] = useState<any>({ status: 'loading' })

    useEffect(() => {
        const checkSession = async () => {
            const supabase = getSupabase()

            // Check Session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()

            // Check User
            const { data: { user }, error: userError } = await supabase.auth.getUser()

            // Check Cookies (Client side)
            const cookies = document.cookie.split(';').map(c => c.trim())
            const sbCookie = cookies.find(c => c.startsWith('sb-'))

            setDebugInfo({
                timestamp: new Date().toISOString(),
                session: {
                    exists: !!session,
                    email: session?.user?.email,
                    expires_at: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
                },
                user: {
                    exists: !!user,
                    email: user?.email,
                    id: user?.id
                },
                cookies: {
                    count: cookies.length,
                    hasSupabaseCookie: !!sbCookie,
                    cookieNames: cookies.map(c => c.split('=')[0])
                },
                errors: {
                    session: sessionError?.message,
                    user: userError?.message
                }
            })
        }

        checkSession()
    }, [])

    return (
        <div className="p-8 font-mono text-sm max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Auth Debugger</h1>

            <div className="bg-gray-100 p-4 rounded mb-4">
                <h2 className="font-bold mb-2">Instructions</h2>
                <p>If you see "hasSupabaseCookie: false", the session cookie is missing.</p>
                <p>If you see "session.exists: false" but cookies exist, the cookie might be invalid/expired.</p>
            </div>

            <div className="border rounded p-4 bg-white shadow">
                <pre className="whitespace-pre-wrap overflow-auto">
                    {JSON.stringify(debugInfo, null, 2)}
                </pre>
            </div>

            <div className="mt-4 flex gap-4">
                <a href="/login" className="bg-blue-500 text-white px-4 py-2 rounded">Go to Login</a>
                <button onClick={() => window.location.reload()} className="bg-gray-500 text-white px-4 py-2 rounded">Refresh</button>
            </div>
        </div>
    )
}
