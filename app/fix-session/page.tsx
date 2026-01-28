'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/utils/supabase/client'
import { SessionSync } from '@/components/SessionSync'

export default function FixSessionPage() {
    const [clientSession, setClientSession] = useState<any>(null)
    const [serverSession, setServerSession] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [logs, setLogs] = useState<string[]>([])

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString()
        setLogs(prev => [...prev, `${timestamp}: ${message}`])
        console.log(`[Fix Session] ${message}`)
    }

    useEffect(() => {
        checkSessions()
    }, [])

    const checkSessions = async () => {
        setLoading(true)
        addLog('Starting session check...')

        try {
            // Check client session
            addLog('Checking client session...')
            const supabase = getSupabase()
            const { data: { session: clientSess }, error: clientError } = await supabase.auth.getSession()
            
            if (clientError) {
                addLog('Client session error: ' + clientError.message)
            } else if (clientSess) {
                addLog('Client session found: ' + clientSess.user.email)
                setClientSession(clientSess)
            } else {
                addLog('No client session found')
            }

            // Check server session
            addLog('Checking server session...')
            const serverResponse = await fetch('/api/refresh-session')
            const serverData = await serverResponse.json()
            
            if (serverData.hasSession) {
                addLog('Server session found: ' + serverData.session.user)
                setServerSession(serverData.session)
            } else {
                addLog('No server session found')
            }

            // Analyze the situation
            if (clientSess && serverData.hasSession) {
                addLog('✅ Both client and server have sessions - all good!')
            } else if (!clientSess && serverData.hasSession) {
                addLog('⚠️ Server has session but client does not - sync needed')
            } else if (clientSess && !serverData.hasSession) {
                addLog('⚠️ Client has session but server does not - unusual')
            } else {
                addLog('❌ Neither client nor server have sessions - need to login')
            }

        } catch (error: any) {
            addLog('Error checking sessions: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const fixSessionSync = async () => {
        addLog('Starting session sync fix...')
        
        try {
            // Method 1: Force refresh server session
            addLog('Method 1: Force refresh server session...')
            const refreshResponse = await fetch('/api/refresh-session', { method: 'POST' })
            const refreshData = await refreshResponse.json()
            
            if (refreshData.success) {
                addLog('✅ Server session refreshed successfully')
                
                // Method 2: Refresh client session
                addLog('Method 2: Refreshing client session...')
                const supabase = getSupabase()
                const { data: clientRefresh, error: clientRefreshError } = await supabase.auth.refreshSession()
                
                if (clientRefreshError) {
                    addLog('❌ Client refresh failed: ' + clientRefreshError.message)
                } else if (clientRefresh.session) {
                    addLog('✅ Client session refreshed successfully')
                    setClientSession(clientRefresh.session)
                } else {
                    addLog('⚠️ Client refresh succeeded but no session returned')
                }
            } else {
                addLog('❌ Server refresh failed: ' + refreshData.error)
            }

            // Method 3: Re-check sessions
            addLog('Method 3: Re-checking sessions...')
            await checkSessions()

        } catch (error: any) {
            addLog('❌ Fix session sync error: ' + error.message)
        }
    }

    const testProtectedRoute = async () => {
        addLog('Testing protected route access...')
        
        try {
            window.open('/analyze', '_blank')
            addLog('Opened /analyze in new tab - check if it works')
        } catch (error: any) {
            addLog('Error opening protected route: ' + error.message)
        }
    }

    const clearAllSessions = async () => {
        addLog('Clearing all sessions...')
        
        try {
            const supabase = getSupabase()
            await supabase.auth.signOut()
            addLog('✅ Client session cleared')
            
            setClientSession(null)
            setServerSession(null)
            
            addLog('All sessions cleared - you can now login fresh')
        } catch (error: any) {
            addLog('Error clearing sessions: ' + error.message)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">🔧 Fix Session Sync Issue</h1>

                {/* Problem Description */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold text-yellow-800 mb-4">🚨 Detected Issue</h2>
                    <div className="text-yellow-700 space-y-2">
                        <div>**Server has session**: ✅ `phuchai.le@gmail.com`</div>
                        <div>**Client missing session**: ❌ Client-side cannot see the session</div>
                        <div>**Result**: `no_session` error when accessing protected routes</div>
                        <div className="mt-4 p-3 bg-yellow-100 rounded">
                            <strong>Root Cause</strong>: Cookie synchronization issue between server and client
                        </div>
                    </div>
                </div>

                {/* Session Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Client Session */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4">💻 Client Session</h3>
                        {clientSession ? (
                            <div className="space-y-2 text-green-700">
                                <div>✅ <strong>Status</strong>: Active</div>
                                <div>👤 <strong>User</strong>: {clientSession.user.email}</div>
                                <div>⏰ <strong>Expires</strong>: {new Date(clientSession.expires_at * 1000).toLocaleString()}</div>
                            </div>
                        ) : (
                            <div className="text-red-700">
                                <div>❌ <strong>Status</strong>: No session</div>
                                <div>Client cannot see authentication</div>
                            </div>
                        )}
                    </div>

                    {/* Server Session */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4">🖥️ Server Session</h3>
                        {serverSession ? (
                            <div className="space-y-2 text-green-700">
                                <div>✅ <strong>Status</strong>: Active</div>
                                <div>👤 <strong>User</strong>: {serverSession.user}</div>
                                <div>⏰ <strong>Expires</strong>: {new Date(serverSession.expires_at).toLocaleString()}</div>
                            </div>
                        ) : (
                            <div className="text-red-700">
                                <div>❌ <strong>Status</strong>: No session</div>
                                <div>Server cannot see authentication</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Session Sync Component */}
                <div className="mb-6">
                    <SessionSync onSessionSync={(hasSession) => {
                        addLog(`Session sync result: ${hasSession ? 'Success' : 'Failed'}`)
                        if (hasSession) {
                            checkSessions()
                        }
                    }} />
                </div>

                {/* Fix Actions */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">🛠️ Fix Actions</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button
                            onClick={checkSessions}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? '🔄 Checking...' : '🔍 Check Sessions'}
                        </button>
                        <button
                            onClick={fixSessionSync}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                            🔧 Fix Sync
                        </button>
                        <button
                            onClick={testProtectedRoute}
                            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                        >
                            🧪 Test /analyze
                        </button>
                        <button
                            onClick={clearAllSessions}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            🗑️ Clear All
                        </button>
                    </div>
                </div>

                {/* Alternative Solutions */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">🔄 Alternative Solutions</h2>
                    <div className="space-y-4">
                        <div className="border-l-4 border-blue-500 pl-4">
                            <h3 className="font-semibold">Option 1: Use Bypass (Immediate)</h3>
                            <p className="text-sm text-gray-600 mb-2">Access the app immediately while we fix the session</p>
                            <a
                                href="/analyze?bypass_auth=temp_access_2026"
                                className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                🚀 Access /analyze (Bypass)
                            </a>
                        </div>
                        
                        <div className="border-l-4 border-green-500 pl-4">
                            <h3 className="font-semibold">Option 2: Fresh Login</h3>
                            <p className="text-sm text-gray-600 mb-2">Clear everything and login again</p>
                            <a
                                href="/login"
                                className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                🔑 Go to Login
                            </a>
                        </div>
                    </div>
                </div>

                {/* Logs */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">📝 Debug Logs</h2>
                    <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
                        {logs.map((log, i) => (
                            <div key={i} className="mb-1">{log}</div>
                        ))}
                        {logs.length === 0 && (
                            <div className="text-gray-500">No logs yet...</div>
                        )}
                    </div>
                    <button
                        onClick={() => setLogs([])}
                        className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                        Clear Logs
                    </button>
                </div>
            </div>
        </div>
    )
}