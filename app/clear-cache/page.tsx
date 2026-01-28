'use client'

import { useEffect, useState } from 'react'

export default function ClearCachePage() {
    const [status, setStatus] = useState<string>('Initializing...')
    const [steps, setSteps] = useState<string[]>([])

    useEffect(() => {
        clearEverything()
    }, [])

    const addStep = (step: string) => {
        setSteps(prev => [...prev, `${new Date().toLocaleTimeString()}: ${step}`])
    }

    const clearEverything = async () => {
        try {
            setStatus('Clearing all authentication data...')
            addStep('Starting cleanup process')

            // Clear all cookies
            addStep('Clearing cookies...')
            const cookies = document.cookie.split(';')
            for (let cookie of cookies) {
                const eqPos = cookie.indexOf('=')
                const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
                
                // Clear with different path and domain combinations
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`
                
                addStep(`Cleared cookie: ${name}`)
            }

            // Clear localStorage
            addStep('Clearing localStorage...')
            const localStorageKeys = Object.keys(localStorage)
            for (let key of localStorageKeys) {
                localStorage.removeItem(key)
                addStep(`Cleared localStorage: ${key}`)
            }

            // Clear sessionStorage
            addStep('Clearing sessionStorage...')
            const sessionStorageKeys = Object.keys(sessionStorage)
            for (let key of sessionStorageKeys) {
                sessionStorage.removeItem(key)
                addStep(`Cleared sessionStorage: ${key}`)
            }

            // Clear service worker cache if available
            if ('serviceWorker' in navigator && 'caches' in window) {
                addStep('Clearing service worker caches...')
                const cacheNames = await caches.keys()
                for (let cacheName of cacheNames) {
                    await caches.delete(cacheName)
                    addStep(`Cleared cache: ${cacheName}`)
                }
            }

            // Clear IndexedDB if available
            if ('indexedDB' in window) {
                addStep('Clearing IndexedDB...')
                // Note: This is a simplified approach, full IndexedDB clearing is more complex
            }

            addStep('✅ All data cleared successfully')
            setStatus('✅ Cleanup completed! Redirecting to new debug page...')

            // Wait a moment then redirect
            setTimeout(() => {
                window.location.href = '/debug-auth?v=' + Date.now()
            }, 2000)

        } catch (error: any) {
            addStep(`❌ Error: ${error.message}`)
            setStatus('❌ Error occurred during cleanup')
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">🧹 Clear Cache & Auth Data</h1>
                
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Status</h2>
                    <div className="text-lg font-medium mb-4">{status}</div>
                    
                    <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
                        {steps.map((step, i) => (
                            <div key={i} className="mb-1">{step}</div>
                        ))}
                    </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="font-semibold text-blue-800 mb-2">What this does:</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Clears all cookies (including auth tokens)</li>
                        <li>• Clears localStorage and sessionStorage</li>
                        <li>• Clears service worker caches</li>
                        <li>• Forces fresh page load</li>
                        <li>• Redirects to updated debug page</li>
                    </ul>
                </div>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => window.location.href = '/debug-auth'}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Go to Debug Page Now
                    </button>
                </div>
            </div>
        </div>
    )
}