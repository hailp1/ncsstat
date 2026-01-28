'use client'

import { useEffect, useState } from 'react'

export default function SupabaseSetupPage() {
    const [config, setConfig] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadConfig()
    }, [])

    const loadConfig = async () => {
        try {
            const response = await fetch('/api/test-supabase-config')
            const result = await response.json()
            setConfig(result)
        } catch (error) {
            console.error('Failed to load config:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Loading configuration...</p>
                </div>
            </div>
        )
    }

    const siteUrl = config?.config?.siteUrl || process.env.NEXT_PUBLIC_SITE_URL
    const supabaseUrl = config?.config?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL
    const projectId = supabaseUrl?.split('//')[1]?.split('.')[0]

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">🔧 Supabase Setup Guide</h1>

                {/* Current Status */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Current Status</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-gray-600">Database Connection:</span>
                            <span className={`ml-2 ${config?.config?.databaseConnection ? 'text-green-600' : 'text-red-600'}`}>
                                {config?.config?.databaseConnection ? '✅ Connected' : '❌ Failed'}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-600">Configuration:</span>
                            <span className={`ml-2 ${config?.success ? 'text-green-600' : 'text-red-600'}`}>
                                {config?.success ? '✅ Loaded' : '❌ Error'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Step-by-step Setup */}
                <div className="space-y-6">
                    {/* Step 1: Supabase Dashboard */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                            <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">1</span>
                            Supabase Dashboard Settings
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <p className="mb-2">Go to your Supabase project dashboard:</p>
                                <a 
                                    href={`https://supabase.com/dashboard/project/${projectId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                    🔗 Open Supabase Dashboard
                                </a>
                            </div>

                            <div className="bg-blue-50 p-4 rounded">
                                <h4 className="font-semibold mb-2">Authentication → Settings</h4>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <strong>Site URL:</strong>
                                        <code className="ml-2 bg-blue-100 px-2 py-1 rounded">{siteUrl}</code>
                                    </div>
                                    <div>
                                        <strong>Redirect URLs (add these):</strong>
                                        <div className="ml-4 mt-1 space-y-1">
                                            <div><code className="bg-blue-100 px-2 py-1 rounded">{siteUrl}/auth/callback</code></div>
                                            <div><code className="bg-blue-100 px-2 py-1 rounded">{siteUrl}/auth/orcid/callback</code></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: OAuth Providers */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                            <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">2</span>
                            OAuth Providers Setup
                        </h3>

                        <div className="space-y-6">
                            {/* Google OAuth */}
                            <div className="border-l-4 border-blue-500 pl-4">
                                <h4 className="font-semibold mb-2">🔵 Google OAuth</h4>
                                <div className="space-y-2 text-sm">
                                    <p>1. Go to <a href="https://console.developers.google.com/" target="_blank" className="text-blue-600 underline">Google Console</a></p>
                                    <p>2. Create/select your project</p>
                                    <p>3. Enable Google+ API</p>
                                    <p>4. Create OAuth 2.0 credentials</p>
                                    <p>5. Add authorized redirect URI:</p>
                                    <code className="block bg-gray-100 p-2 rounded mt-1">{supabaseUrl}/auth/v1/callback</code>
                                    <p>6. Copy Client ID and Secret to Supabase → Authentication → Providers → Google</p>
                                </div>
                            </div>

                            {/* LinkedIn OAuth */}
                            <div className="border-l-4 border-blue-700 pl-4">
                                <h4 className="font-semibold mb-2">🔗 LinkedIn OIDC</h4>
                                <div className="space-y-2 text-sm">
                                    <p>1. Go to <a href="https://www.linkedin.com/developers/apps" target="_blank" className="text-blue-600 underline">LinkedIn Developer</a></p>
                                    <p>2. Create/select your app</p>
                                    <p>3. Go to Auth tab</p>
                                    <p>4. Add authorized redirect URL:</p>
                                    <code className="block bg-gray-100 p-2 rounded mt-1">{supabaseUrl}/auth/v1/callback</code>
                                    <p>5. Copy Client ID and Secret to Supabase → Authentication → Providers → LinkedIn OIDC</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Test */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                            <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">3</span>
                            Test Configuration
                        </h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <a
                                href="/test-auth"
                                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-center"
                            >
                                🧪 Test Auth
                            </a>
                            <a
                                href="/debug-auth"
                                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-center"
                            >
                                🔍 Debug Auth
                            </a>
                            <a
                                href="/session-test"
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-center"
                            >
                                📊 Session Test
                            </a>
                            <a
                                href="/login"
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-center"
                            >
                                🔑 Try Login
                            </a>
                        </div>
                    </div>

                    {/* Troubleshooting */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-4 text-red-800">🚨 Common Issues</h3>
                        <div className="space-y-2 text-sm text-red-700">
                            <div>❌ <strong>no_session error:</strong> Site URL or Redirect URLs not configured correctly</div>
                            <div>❌ <strong>OAuth provider error:</strong> Client ID/Secret not set or redirect URI mismatch</div>
                            <div>❌ <strong>Callback fails:</strong> Supabase callback URL not added to OAuth provider</div>
                            <div>❌ <strong>Session not persisting:</strong> Cookie settings or middleware issues</div>
                        </div>
                    </div>
                </div>

                {/* Configuration Details */}
                {config && (
                    <div className="bg-white rounded-lg shadow p-6 mt-6">
                        <h3 className="text-lg font-semibold mb-4">📋 Configuration Details</h3>
                        <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto">
                            {JSON.stringify(config, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    )
}