'use client'

import { useEffect, useState } from 'react'
import { getCurrentSession, signOut, SessionInfo } from '@/lib/session-utils'

interface AuthStatusProps {
    showDetails?: boolean
    className?: string
}

export function AuthStatus({ showDetails = false, className = '' }: AuthStatusProps) {
    const [session, setSession] = useState<SessionInfo | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkSession = async () => {
            try {
                const sessionInfo = await getCurrentSession()
                setSession(sessionInfo)
            } catch (error) {
                console.error('Error checking session:', error)
            } finally {
                setLoading(false)
            }
        }

        checkSession()
    }, [])

    const handleSignOut = async () => {
        try {
            await signOut()
            window.location.href = '/login'
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

    if (loading) {
        return (
            <div className={`flex items-center space-x-2 ${className}`}>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-500">Checking auth...</span>
            </div>
        )
    }

    if (!session?.isAuthenticated) {
        return (
            <div className={`flex items-center space-x-2 ${className}`}>
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm text-red-600">Not authenticated</span>
                {showDetails && (
                    <a href="/login" className="text-blue-600 hover:underline text-sm">
                        Login
                    </a>
                )}
            </div>
        )
    }

    return (
        <div className={`flex items-center space-x-2 ${className}`}>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-600">
                Authenticated via {session.authType?.toUpperCase()}
            </span>
            {showDetails && (
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>ID: {session.userId?.slice(0, 8)}...</span>
                    {session.email && <span>Email: {session.email}</span>}
                    {session.orcidId && <span>ORCID: {session.orcidId}</span>}
                    <button
                        onClick={handleSignOut}
                        className="text-red-600 hover:underline"
                    >
                        Sign Out
                    </button>
                </div>
            )}
        </div>
    )
}

export default AuthStatus