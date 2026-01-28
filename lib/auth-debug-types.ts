export interface AuthDebugInfo {
    hasSupabaseSession: boolean
    hasOrcidCookie: boolean
    supabaseUser: any
    orcidUserId: string | null
    profileExists: boolean
    sessionExpiry: string | null
    errors: string[]
    // Enhanced debug info
    cookieDetails: {
        orcidUser?: string
        orcidPending?: string
        supabaseTokens: string[]
        allAuthCookies: string[]
    }
    environmentInfo: {
        supabaseConfigured: boolean
        orcidConfigured: boolean
        siteUrl: string | null
        nodeEnv: string | null
        vercelEnv: string | null
    }
    databaseInfo?: {
        profileCount: number
        recentLogins: any[]
        systemConfig: any[]
    }
    performanceInfo: {
        checkStartTime: number
        checkEndTime: number
        duration: number
    }
}
