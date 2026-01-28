'use client'

import { useEffect, useState } from 'react'

interface EnvStatusProps {
    className?: string
}

export function EnvStatus({ className = '' }: EnvStatusProps) {
    const [envStatus, setEnvStatus] = useState<{
        supabaseConfigured: boolean
        orcidConfigured: boolean
        siteUrl: string | null
        nodeEnv: string | null
    } | null>(null)

    useEffect(() => {
        const checkEnv = () => {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            const orcidClientId = process.env.NEXT_PUBLIC_ORCID_CLIENT_ID
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

            setEnvStatus({
                supabaseConfigured: !!(supabaseUrl && supabaseKey && 
                                     !supabaseUrl.includes('placeholder') && 
                                     !supabaseKey.includes('placeholder')),
                orcidConfigured: !!orcidClientId,
                siteUrl: siteUrl || null,
                nodeEnv: process.env.NODE_ENV || null
            })
        }

        checkEnv()
    }, [])

    if (!envStatus) {
        return (
            <div className={`text-xs text-gray-500 ${className}`}>
                Checking environment...
            </div>
        )
    }

    return (
        <div className={`text-xs space-y-1 ${className}`}>
            <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${envStatus.supabaseConfigured ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span>Supabase: {envStatus.supabaseConfigured ? 'Configured' : 'Not configured'}</span>
            </div>
            <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${envStatus.orcidConfigured ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                <span>ORCID: {envStatus.orcidConfigured ? 'Configured' : 'Not configured'}</span>
            </div>
            <div className="text-gray-500">
                Environment: {envStatus.nodeEnv} | Site: {envStatus.siteUrl || 'Not set'}
            </div>
        </div>
    )
}

export default EnvStatus