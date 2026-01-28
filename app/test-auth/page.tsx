'use client'

import { useEffect, useState } from 'react'
import { getCurrentSession, signOut, SessionInfo } from '@/lib/session-utils'
import AuthStatus from '@/components/AuthStatus'
import EnvStatus from '@/components/EnvStatus'

export default function TestAuthPage() {
    const [session, setSession] = useState<SessionInfo | null>(null)
    const [loading, setLoading] = useState(true)
    const [testResults, setTestResults] = useState<string[]>([])
    const [supabaseConfig, setSupabaseConfig] = useState<any>(null)

    useEffect(() => {
        checkAuth()
        checkSupabaseConfig()
    }, [])

    const checkSupabaseConfig = async () => {
        addTestResult('Checking Supabase configuration...')
        try {
            const response = await fetch('/api/test-supabase-config')
            const result = await response.json()
            setSupabaseConfig(result)
            
            if (result.success) {
                addTestResult(`✅ Supabase config loaded`)
                addTestResult(`Site URL: ${result.config.siteUrl}`)
                addTestResult(`Supabase URL: ${result.config.supabaseUrl}`)
                addTestResult(`Database connection: ${result.config.databaseConnection ? '✅' : '❌'}`)
            } else {
                addTestResult(`❌ Supabase config error: ${result.error}`)
            }
        } catch (error: any) {
            addTestResult(`❌ Config check failed: ${error.message}`)
        }
    }

    const checkAuth = async () => {
        setLoading(true)
        try {
            const sessionInfo = await getCurrentSession()
            setSession(sessionInfo)
            addTestResult(`Session check: ${sessionInfo.isAuthenticated ? 'Authenticated' : 'Not authenticated'}`)
            if (sessionInfo.isAuthenticated) {
                addTestResult(`Auth type: ${sessionInfo.authType}`)
                addTestResult(`User ID: ${sessionInfo.userId}`)
            }
        } catch (error: any) {
            addTestResult(`Error: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    const addTestResult = (result: string) => {
        setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`])
    }

    const testSupabaseAuth = async () => {
        addTestResult('Testing Supabase auth...')
        try {
            const { getSupabase } = await import('@/utils/supabase/client')
            const supabase = getSupabase()
            
            const { data: { session }, error } = await supabase.auth.getSession()
            if (error) {
                addTestResult(`Supabase error: ${error.message}`)
            } else if (session) {
                addTestResult(`Supabase session found: ${session.user.email}`)
            } else {
                addTestResult('No Supabase session')
            }
        } catch (error: any) {
            addTestResult(`Supabase test error: ${error.message}`)
        }
    }

    const testOrcidAuth = () => {
        addTestResult('Testing ORCID auth...')
        const orcidCookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('orcid_user='))
            ?.split('=')[1]
        
        if (orcidCookie) {
            addTestResult(`ORCID cookie found: ${orcidCookie.slice(0, 8)}...`)
        } else {
            addTestResult('No ORCID cookie found')
        }
    }

    const clearAllAuth = async () => {
        addTestResult('Clearing all authentication...')
        try {
            await signOut()
            addTestResult('All auth cleared')
            setTimeout(() => {
                window.location.reload()
            }, 1000)
        } catch (error: any) {
            addTestResult(`Clear error: ${error.message}`)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">🧪 Authentication Test Page</h1>

                {/* Environment Status */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Environment Status</h2>
                    <EnvStatus />
                </div>

                {/* Current Auth Status */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Current Authentication Status</h2>
                    <AuthStatus showDetails={true} className="mb-4" />
                    
                    {loading ? (
                        <div className="text-gray-500">Loading session info...</div>
                    ) : (
                        <div className="bg-gray-50 p-4 rounded">
                            <pre className="text-sm">
                                {JSON.stringify(session, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Supabase Configuration */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Supabase Configuration</h2>
                    {supabaseConfig ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-600">Database Connection:</span>
                                    <span className={`ml-2 ${supabaseConfig.config?.databaseConnection ? 'text-green-600' : 'text-red-600'}`}>
                                        {supabaseConfig.config?.databaseConnection ? '✅ Connected' : '❌ Failed'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Site URL:</span>
                                    <span className="ml-2 font-mono text-xs">{supabaseConfig.config?.siteUrl}</span>
                                </div>
                            </div>
                            
                            <div className="bg-blue-50 p-4 rounded">
                                <h3 className="font-semibold text-blue-800 mb-2">Required Supabase Settings:</h3>
                                <div className="text-sm text-blue-700 space-y-1">
                                    <div>1. Site URL: <code className="bg-blue-100 px-1 rounded">{supabaseConfig.config?.siteUrl}</code></div>
                                    <div>2. Redirect URLs:</div>
                                    {supabaseConfig.config?.expectedCallbacks?.map((url: string, i: number) => (
                                        <div key={i} className="ml-4">• <code className="bg-blue-100 px-1 rounded">{url}</code></div>
                                    ))}
                                    <div>3. OAuth Provider Callback: <code className="bg-blue-100 px-1 rounded">{supabaseConfig.config?.supabaseCallback}</code></div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-gray-500">Loading configuration...</div>
                    )}
                </div>
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button
                            onClick={checkAuth}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            🔄 Refresh Auth
                        </button>
                        <button
                            onClick={testSupabaseAuth}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                            🔍 Test Supabase
                        </button>
                        <button
                            onClick={testOrcidAuth}
                            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                        >
                            🔍 Test ORCID
                        </button>
                        <button
                            onClick={clearAllAuth}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            🗑️ Clear All
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Navigation</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <a
                            href="/login"
                            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-center"
                        >
                            🔑 Login Page
                        </a>
                        <a
                            href="/debug-auth"
                            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-center"
                        >
                            🔍 Debug Auth
                        </a>
                        <a
                            href="/analyze"
                            className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 text-center"
                        >
                            📊 Analyze (Protected)
                        </a>
                        <a
                            href="/"
                            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-center"
                        >
                            🏠 Home
                        </a>
                    </div>
                </div>

                {/* Test Results */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Test Results</h2>
                    <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
                        {testResults.length === 0 ? (
                            <div className="text-gray-500">No test results yet...</div>
                        ) : (
                            testResults.map((result, i) => (
                                <div key={i} className="mb-1">
                                    {result}
                                </div>
                            ))
                        )}
                    </div>
                    <button
                        onClick={() => setTestResults([])}
                        className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                        Clear Results
                    </button>
                </div>
            </div>
        </div>
    )
}