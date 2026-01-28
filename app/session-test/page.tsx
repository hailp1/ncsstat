'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/utils/supabase/client'

export default function SessionTestPage() {
    const [sessionData, setSessionData] = useState<any>(null)
    const [serverData, setServerData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        checkSession()
    }, [])

    const checkSession = async () => {
        setLoading(true)
        
        try {
            // Client-side session check
            const supabase = getSupabase()
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()
            const { data: { user }, error: userError } = await supabase.auth.getUser()
            
            setSessionData({
                hasSession: !!session,
                hasUser: !!user,
                sessionError: sessionError?.message || null,
                userError: userError?.message || null,
                sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
                userEmail: user?.email || null,
                userId: user?.id || null,
                timestamp: new Date().toISOString()
            })

            // Server-side session check
            const response = await fetch('/api/test-session')
            const serverResult = await response.json()
            setServerData(serverResult)

        } catch (error: any) {
            console.error('Session check error:', error)
            setSessionData({ error: error.message })
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Checking session...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">🧪 Session Test Page</h1>
                
                {/* Quick Status */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Quick Status</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="font-semibold mb-2">Client-side</h3>
                            <div className="space-y-1 text-sm">
                                <div>Session: {sessionData?.hasSession ? '✅' : '❌'}</div>
                                <div>User: {sessionData?.hasUser ? '✅' : '❌'}</div>
                                <div>Email: {sessionData?.userEmail || 'N/A'}</div>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">Server-side</h3>
                            <div className="space-y-1 text-sm">
                                <div>Session: {serverData?.data?.hasSession ? '✅' : '❌'}</div>
                                <div>User: {serverData?.data?.hasUser ? '✅' : '❌'}</div>
                                <div>Email: {serverData?.data?.userEmail || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Data */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4">Client Session Data</h3>
                        <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto">
                            {JSON.stringify(sessionData, null, 2)}
                        </pre>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4">Server Session Data</h3>
                        <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto">
                            {JSON.stringify(serverData, null, 2)}
                        </pre>
                    </div>
                </div>

                {/* Actions */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Actions</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button
                            onClick={checkSession}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            🔄 Refresh
                        </button>
                        <a
                            href="/login"
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-center"
                        >
                            🔑 Login
                        </a>
                        <a
                            href="/analyze"
                            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-center"
                        >
                            📊 Analyze
                        </a>
                        <a
                            href="/debug-auth"
                            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-center"
                        >
                            🔍 Debug
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}