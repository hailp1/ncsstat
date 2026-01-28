'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/utils/supabase/client'

export default function DebugSupabasePage() {
    const [status, setStatus] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [testResults, setTestResults] = useState<any[]>([])

    useEffect(() => {
        runDiagnostics()
    }, [])

    const addTestResult = (test: string, result: any, success: boolean) => {
        setTestResults(prev => [...prev, {
            test,
            result,
            success,
            timestamp: new Date().toLocaleTimeString()
        }])
    }

    const runDiagnostics = async () => {
        setLoading(true)
        setTestResults([])

        try {
            // Test 1: Environment Variables
            addTestResult('Environment Variables', {
                supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
                siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
                hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            }, true)

            // Test 2: Supabase Client Creation
            try {
                const supabase = getSupabase()
                addTestResult('Supabase Client', 'Created successfully', true)

                // Test 3: Basic Connection
                try {
                    const { data, error } = await supabase.from('profiles').select('count').limit(1)
                    addTestResult('Database Connection', { 
                        success: !error, 
                        error: error?.message 
                    }, !error)
                } catch (dbError: any) {
                    addTestResult('Database Connection', { 
                        error: dbError.message 
                    }, false)
                }

                // Test 4: Auth Session
                try {
                    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
                    addTestResult('Auth Session', {
                        hasSession: !!session,
                        error: sessionError?.message,
                        user: session?.user?.email
                    }, !sessionError)
                } catch (authError: any) {
                    addTestResult('Auth Session', { 
                        error: authError.message 
                    }, false)
                }

                // Test 5: Auth User
                try {
                    const { data: { user }, error: userError } = await supabase.auth.getUser()
                    addTestResult('Auth User', {
                        hasUser: !!user,
                        error: userError?.message,
                        user: user?.email
                    }, !userError)
                } catch (userTestError: any) {
                    addTestResult('Auth User', { 
                        error: userTestError.message 
                    }, false)
                }

            } catch (clientError: any) {
                addTestResult('Supabase Client', { 
                    error: clientError.message 
                }, false)
            }

            // Test 6: API Endpoints
            try {
                const response = await fetch('/api/check-supabase-auth')
                const apiResult = await response.json()
                addTestResult('API Check', apiResult, apiResult.success)
            } catch (apiError: any) {
                addTestResult('API Check', { 
                    error: apiError.message 
                }, false)
            }

            // Test 7: Configuration Check
            try {
                const configResponse = await fetch('/api/fix-supabase-config')
                const configResult = await configResponse.json()
                addTestResult('Configuration Status', configResult, true)
            } catch (configError: any) {
                addTestResult('Configuration Status', { 
                    error: configError.message 
                }, false)
            }

        } catch (error: any) {
            addTestResult('Overall Test', { 
                error: error.message 
            }, false)
        } finally {
            setLoading(false)
        }
    }

    const testOAuthFlow = async (provider: 'google' | 'linkedin_oidc') => {
        try {
            const supabase = getSupabase()
            const redirectTo = `${window.location.origin}/test-callback`
            
            addTestResult(`OAuth ${provider}`, `Initiating OAuth flow...`, true)
            
            const { error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: redirectTo,
                },
            })

            if (error) {
                addTestResult(`OAuth ${provider}`, { error: error.message }, false)
            } else {
                addTestResult(`OAuth ${provider}`, 'Redirecting to provider...', true)
            }
        } catch (error: any) {
            addTestResult(`OAuth ${provider}`, { error: error.message }, false)
        }
    }

    const attemptAutoFix = async () => {
        try {
            addTestResult('Auto Fix', 'Attempting automatic configuration...', true)
            
            const response = await fetch('/api/fix-supabase-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            const result = await response.json()
            addTestResult('Auto Fix', result, result.success)
        } catch (error: any) {
            addTestResult('Auto Fix', { error: error.message }, false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">🔍 Supabase Debug Dashboard</h1>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button
                            onClick={runDiagnostics}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? '🔄 Running...' : '🔍 Run Diagnostics'}
                        </button>
                        <button
                            onClick={attemptAutoFix}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                            🔧 Auto Fix
                        </button>
                        <button
                            onClick={() => testOAuthFlow('google')}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            🔵 Test Google
                        </button>
                        <button
                            onClick={() => testOAuthFlow('linkedin_oidc')}
                            className="px-4 py-2 bg-blue-800 text-white rounded hover:bg-blue-900"
                        >
                            🔗 Test LinkedIn
                        </button>
                    </div>
                </div>

                {/* Test Results */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Diagnostic Results</h2>
                    
                    {testResults.length === 0 && !loading && (
                        <p className="text-gray-500">Click "Run Diagnostics" to start testing</p>
                    )}

                    {loading && (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3">Running diagnostics...</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        {testResults.map((result, i) => (
                            <div key={i} className={`border-l-4 pl-4 py-2 ${
                                result.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold">
                                        {result.success ? '✅' : '❌'} {result.test}
                                    </h3>
                                    <span className="text-sm text-gray-500">{result.timestamp}</span>
                                </div>
                                <div className="mt-2">
                                    {typeof result.result === 'string' ? (
                                        <p className="text-sm">{result.result}</p>
                                    ) : (
                                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                                            {JSON.stringify(result.result, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Configuration Guide */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold text-yellow-800 mb-4">🚨 Configuration Required</h2>
                    <div className="space-y-4 text-yellow-700">
                        <div>
                            <h3 className="font-semibold">Supabase Dashboard Settings:</h3>
                            <div className="ml-4 mt-2 space-y-1 text-sm">
                                <div>1. Go to: <a href="https://supabase.com/dashboard/project/qshimpxmirkyfenhklfh/auth/settings" target="_blank" className="underline">Supabase Dashboard</a></div>
                                <div>2. Set Site URL: <code className="bg-yellow-100 px-1 rounded">https://ncsstat.ncskit.org</code></div>
                                <div>3. Add Redirect URLs:</div>
                                <div className="ml-4">
                                    <div>- <code className="bg-yellow-100 px-1 rounded">https://ncsstat.ncskit.org/auth/callback</code></div>
                                    <div>- <code className="bg-yellow-100 px-1 rounded">https://ncsstat.ncskit.org/auth/orcid/callback</code></div>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <h3 className="font-semibold">OAuth Providers:</h3>
                            <div className="ml-4 mt-2 text-sm">
                                <div>Configure Google & LinkedIn with callback URL:</div>
                                <code className="bg-yellow-100 px-1 rounded">https://qshimpxmirkyfenhklfh.supabase.co/auth/v1/callback</code>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Links */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Useful Links</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <a
                            href="/fix-auth"
                            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-center"
                        >
                            🔧 Fix Auth Tool
                        </a>
                        <a
                            href="/test-callback"
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-center"
                        >
                            🧪 Test Callback
                        </a>
                        <a
                            href="/debug-auth"
                            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-center"
                        >
                            🔍 Debug Auth
                        </a>
                        <a
                            href="https://supabase.com/dashboard/project/qshimpxmirkyfenhklfh/auth/settings"
                            target="_blank"
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-center"
                        >
                            🔗 Supabase Dashboard
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}