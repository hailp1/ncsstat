'use client'

import { useEffect, useState } from 'react'
import { debugAuthClient, formatAuthDebug, AuthDebugInfo } from '@/lib/auth-debug'

export default function DebugAuthPage() {
    const [debugInfo, setDebugInfo] = useState<AuthDebugInfo | null>(null)
    const [serverDebug, setServerDebug] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [refreshCount, setRefreshCount] = useState(0)
    const [autoRefresh, setAutoRefresh] = useState(false)

    useEffect(() => {
        runDebug()
    }, [refreshCount])

    useEffect(() => {
        let interval: NodeJS.Timeout
        if (autoRefresh) {
            interval = setInterval(() => {
                setRefreshCount(prev => prev + 1)
            }, 5000) // Refresh every 5 seconds
        }
        return () => {
            if (interval) clearInterval(interval)
        }
    }, [autoRefresh])

    const runDebug = async () => {
        try {
            setLoading(true)
            setError(null)

            // Client-side debug
            const clientInfo = await debugAuthClient()
            setDebugInfo(clientInfo)

            // Server-side debug via API
            try {
                const response = await fetch('/api/debug-auth')
                const serverData = await response.json()
                setServerDebug(serverData)
            } catch (serverError: any) {
                console.warn('Server debug failed:', serverError)
                setServerDebug({ error: 'Server debug unavailable: ' + serverError.message })
            }

        } catch (error: any) {
            console.error('Debug error:', error)
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    const getStatusIcon = (status: boolean) => status ? '✅' : '❌'
    const getStatusColor = (status: boolean) => status ? 'text-green-600' : 'text-red-600'

    if (loading && !debugInfo) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Đang kiểm tra authentication...</p>
                </div>
            </div>
        )
    }

    if (error && !debugInfo) {
        return (
            <div className="p-8 bg-red-50">
                <h1 className="text-xl font-bold text-red-800 mb-4">🚨 Debug Error</h1>
                <p className="text-red-600">{error}</p>
                <button 
                    onClick={() => window.location.reload()} 
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    Retry
                </button>
            </div>
        )
    }

    return (
        <div className="p-8 font-mono text-xs overflow-auto min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">🔍 Advanced Auth Debug Tool</h1>
                    <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="rounded"
                            />
                            <span className="text-sm">Auto-refresh (5s)</span>
                        </label>
                        <button
                            onClick={() => setRefreshCount(prev => prev + 1)}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
                        </button>
                    </div>
                </div>

                {/* Performance Metrics */}
                {debugInfo && (
                    <div className="bg-white p-4 border rounded mb-6">
                        <h2 className="font-bold border-b mb-2">⚡ Performance Metrics</h2>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600">Client Check:</span>
                                <span className="ml-2 font-semibold">{debugInfo.performanceInfo.duration}ms</span>
                            </div>
                            <div>
                                <span className="text-gray-600">Server Check:</span>
                                <span className="ml-2 font-semibold">
                                    {serverDebug?.debug?.performanceInfo?.duration || 'N/A'}ms
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600">Last Updated:</span>
                                <span className="ml-2 font-semibold">
                                    {new Date(debugInfo.performanceInfo.checkEndTime).toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Status Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Authentication Status */}
                    <div className="bg-white p-4 border rounded">
                        <h3 className="font-bold mb-3">🔐 Authentication Status</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span>Supabase Session:</span>
                                <span className={getStatusColor(debugInfo?.hasSupabaseSession || false)}>
                                    {getStatusIcon(debugInfo?.hasSupabaseSession || false)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>ORCID Cookie:</span>
                                <span className={getStatusColor(debugInfo?.hasOrcidCookie || false)}>
                                    {getStatusIcon(debugInfo?.hasOrcidCookie || false)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Profile Valid:</span>
                                <span className={getStatusColor(serverDebug?.debug?.profileExists || false)}>
                                    {getStatusIcon(serverDebug?.debug?.profileExists || false)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Environment Status */}
                    <div className="bg-white p-4 border rounded">
                        <h3 className="font-bold mb-3">🌍 Environment Status</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span>Supabase Config:</span>
                                <span className={getStatusColor(debugInfo?.environmentInfo.supabaseConfigured || false)}>
                                    {getStatusIcon(debugInfo?.environmentInfo.supabaseConfigured || false)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>ORCID Config:</span>
                                <span className={getStatusColor(debugInfo?.environmentInfo.orcidConfigured || false)}>
                                    {getStatusIcon(debugInfo?.environmentInfo.orcidConfigured || false)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Environment:</span>
                                <span className="font-semibold">{debugInfo?.environmentInfo.nodeEnv || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Database Status */}
                    <div className="bg-white p-4 border rounded">
                        <h3 className="font-bold mb-3">🗄️ Database Status</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span>Total Profiles:</span>
                                <span className="font-semibold">{serverDebug?.debug?.databaseInfo?.profileCount || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Recent Logins:</span>
                                <span className="font-semibold">{serverDebug?.debug?.databaseInfo?.recentLogins?.length || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>System Config:</span>
                                <span className="font-semibold">{serverDebug?.debug?.databaseInfo?.systemConfig?.length || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cookie Analysis */}
                <div className="bg-white p-4 border rounded mb-6">
                    <h2 className="font-bold border-b mb-3">🍪 Cookie Analysis</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold mb-2">Authentication Cookies</h3>
                            {debugInfo?.cookieDetails.allAuthCookies.length ? (
                                <div className="space-y-2">
                                    {debugInfo.cookieDetails.allAuthCookies.map((cookie, i) => {
                                        const [name, value] = cookie.split('=')
                                        const isOrcid = name.includes('orcid')
                                        const isSupabase = name.includes('sb-')
                                        return (
                                            <div key={i} className={`p-2 rounded text-xs ${
                                                isOrcid ? 'bg-green-50 border border-green-200' :
                                                isSupabase ? 'bg-blue-50 border border-blue-200' :
                                                'bg-gray-50 border border-gray-200'
                                            }`}>
                                                <div className="font-semibold">{name}</div>
                                                <div className="text-gray-600 break-all">
                                                    {value.length > 50 ? value.slice(0, 50) + '...' : value}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-red-500">No authentication cookies found</div>
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">Cookie Summary</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Total Auth Cookies:</span>
                                    <span className="font-semibold">{debugInfo?.cookieDetails.allAuthCookies.length || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Supabase Tokens:</span>
                                    <span className="font-semibold">{debugInfo?.cookieDetails.supabaseTokens.length || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>ORCID User:</span>
                                    <span className="font-semibold">
                                        {debugInfo?.cookieDetails.orcidUser ? 
                                            debugInfo.cookieDetails.orcidUser.slice(0, 8) + '...' : 'None'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>ORCID Pending:</span>
                                    <span className="font-semibold">
                                        {debugInfo?.cookieDetails.orcidPending ? 'Yes' : 'No'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Database Activity */}
                {serverDebug?.debug?.databaseInfo?.recentLogins && (
                    <div className="bg-white p-4 border rounded mb-6">
                        <h2 className="font-bold border-b mb-3">👥 Recent User Activity</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-2">Email</th>
                                        <th className="text-left p-2">Name</th>
                                        <th className="text-left p-2">Provider</th>
                                        <th className="text-left p-2">Last Active</th>
                                        <th className="text-left p-2">Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {serverDebug.debug.databaseInfo.recentLogins.map((login: any, i: number) => (
                                        <tr key={i} className="border-b hover:bg-gray-50">
                                            <td className="p-2">{login.email || 'N/A'}</td>
                                            <td className="p-2">{login.full_name || 'N/A'}</td>
                                            <td className="p-2">
                                                <span className={`px-2 py-1 rounded text-xs ${
                                                    login.provider === 'orcid' ? 'bg-green-100 text-green-800' :
                                                    login.provider === 'google' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {login.provider || 'unknown'}
                                                </span>
                                            </td>
                                            <td className="p-2">
                                                {login.last_active ? 
                                                    new Date(login.last_active).toLocaleString() : 'Never'}
                                            </td>
                                            <td className="p-2">
                                                {login.created_at ? 
                                                    new Date(login.created_at).toLocaleDateString() : 'N/A'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* System Configuration */}
                {serverDebug?.debug?.databaseInfo?.systemConfig && (
                    <div className="bg-white p-4 border rounded mb-6">
                        <h2 className="font-bold border-b mb-3">⚙️ System Configuration</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {serverDebug.debug.databaseInfo.systemConfig.map((config: any, i: number) => (
                                <div key={i} className="p-3 bg-gray-50 rounded">
                                    <div className="font-semibold">{config.key}</div>
                                    <div className="text-gray-600 text-xs mt-1">
                                        {typeof config.value === 'object' ? 
                                            JSON.stringify(config.value) : 
                                            config.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Error Analysis */}
                {(debugInfo?.errors?.length || serverDebug?.debug?.errors?.length) && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded mb-6">
                        <h2 className="font-bold text-red-800 mb-3">🚨 Error Analysis</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {debugInfo?.errors && debugInfo.errors.length > 0 && (
                                <div>
                                    <h3 className="font-semibold text-red-700 mb-2">Client Errors</h3>
                                    <ul className="space-y-1">
                                        {debugInfo.errors.map((error, i) => (
                                            <li key={i} className="text-red-600 text-xs">• {error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {serverDebug?.debug?.errors?.length > 0 && (
                                <div>
                                    <h3 className="font-semibold text-red-700 mb-2">Server Errors</h3>
                                    <ul className="space-y-1">
                                        {serverDebug.debug.errors.map((error: string, i: number) => (
                                            <li key={i} className="text-red-600 text-xs">• {error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Raw Debug Data */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white p-4 border rounded">
                        <h3 className="font-bold mb-3">💻 Client Debug Data</h3>
                        <pre className="text-xs overflow-auto max-h-96 bg-gray-50 p-3 rounded">
                            {debugInfo ? formatAuthDebug(debugInfo) : 'Loading...'}
                        </pre>
                    </div>
                    <div className="bg-white p-4 border rounded">
                        <h3 className="font-bold mb-3">🖥️ Server Debug Data</h3>
                        <pre className="text-xs overflow-auto max-h-96 bg-gray-50 p-3 rounded">
                            {serverDebug?.formatted || JSON.stringify(serverDebug, null, 2)}
                        </pre>
                    </div>
                </div>

                {/* Actions */}
                <div className="bg-white p-4 border rounded">
                    <h2 className="font-bold border-b mb-3">🔧 Quick Actions</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <button
                            onClick={() => setRefreshCount(prev => prev + 1)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            🔄 Refresh Debug
                        </button>
                        <button
                            onClick={() => {
                                document.cookie.split(";").forEach(c => {
                                    const eqPos = c.indexOf("=");
                                    const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
                                    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
                                });
                                setTimeout(() => setRefreshCount(prev => prev + 1), 500);
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            🗑️ Clear Cookies
                        </button>
                        <button
                            onClick={() => {
                                localStorage.clear();
                                sessionStorage.clear();
                                setTimeout(() => setRefreshCount(prev => prev + 1), 500);
                            }}
                            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                        >
                            🧹 Clear Storage
                        </button>
                        <a
                            href="/test-auth"
                            className="inline-block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-center"
                        >
                            🧪 Test Auth
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}
