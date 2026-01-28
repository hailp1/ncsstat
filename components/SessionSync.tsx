'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/utils/supabase/client'

interface SessionSyncProps {
    onSessionSync?: (hasSession: boolean) => void
}

export function SessionSync({ onSessionSync }: SessionSyncProps) {
    const [syncing, setSyncing] = useState(false)
    const [status, setStatus] = useState<string>('')

    useEffect(() => {
        syncSession()
    }, [])

    const syncSession = async () => {
        setSyncing(true)
        setStatus('Checking session...')

        try {
            const supabase = getSupabase()
            
            // First, try to get current session
            const { data: { session }, error } = await supabase.auth.getSession()
            
            if (error) {
                setStatus('Session error: ' + error.message)
                onSessionSync?.(false)
                return
            }

            if (session) {
                setStatus('Session found: ' + session.user.email)
                onSessionSync?.(true)
                return
            }

            // No session on client, but server might have one
            setStatus('No client session, checking server...')
            
            // Check server session
            const serverResponse = await fetch('/api/refresh-session')
            const serverData = await serverResponse.json()
            
            if (serverData.hasSession) {
                setStatus('Server has session, refreshing client...')
                
                // Try to refresh session to sync client with server
                const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
                
                if (refreshError) {
                    setStatus('Refresh failed: ' + refreshError.message)
                    onSessionSync?.(false)
                    return
                }

                if (refreshData.session) {
                    setStatus('Session synced: ' + refreshData.session.user.email)
                    onSessionSync?.(true)
                } else {
                    setStatus('Refresh succeeded but no session')
                    onSessionSync?.(false)
                }
            } else {
                setStatus('No session on server either')
                onSessionSync?.(false)
            }

        } catch (error: any) {
            setStatus('Sync error: ' + error.message)
            onSessionSync?.(false)
        } finally {
            setSyncing(false)
        }
    }

    const forceRefresh = async () => {
        setSyncing(true)
        setStatus('Force refreshing...')

        try {
            // Call server refresh API
            const response = await fetch('/api/refresh-session', { method: 'POST' })
            const data = await response.json()
            
            if (data.success) {
                setStatus('Force refresh successful: ' + data.session.user)
                onSessionSync?.(true)
                
                // Also refresh client
                const supabase = getSupabase()
                await supabase.auth.refreshSession()
            } else {
                setStatus('Force refresh failed: ' + data.error)
                onSessionSync?.(false)
            }
        } catch (error: any) {
            setStatus('Force refresh error: ' + error.message)
            onSessionSync?.(false)
        } finally {
            setSyncing(false)
        }
    }

    return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">🔄 Session Sync</h3>
            <div className="space-y-2">
                <div className="text-sm text-blue-700">
                    Status: {status || 'Ready'}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={syncSession}
                        disabled={syncing}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                        {syncing ? '🔄 Syncing...' : '🔄 Sync Session'}
                    </button>
                    <button
                        onClick={forceRefresh}
                        disabled={syncing}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                        {syncing ? '⚡ Refreshing...' : '⚡ Force Refresh'}
                    </button>
                </div>
            </div>
        </div>
    )
}