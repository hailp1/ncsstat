import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

export async function POST(request: NextRequest) {
    try {
        // Revalidate all auth-related paths
        const pathsToRevalidate = [
            '/debug-auth',
            '/test-auth',
            '/session-test',
            '/login',
            '/analyze',
            '/supabase-setup'
        ]

        for (const path of pathsToRevalidate) {
            revalidatePath(path)
        }

        // Revalidate auth-related tags
        /*
        const tagsToRevalidate = [
            'auth',
            'session',
            'debug',
            'supabase'
        ]

        for (const tag of tagsToRevalidate) {
            revalidateTag(tag)
        }
        */

        return NextResponse.json({
            success: true,
            message: 'Cache cleared successfully',
            revalidatedPaths: pathsToRevalidate,
            timestamp: new Date().toISOString()
        })
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    return NextResponse.json({
        message: 'Use POST method to clear cache',
        availableEndpoints: {
            'POST /api/clear-cache': 'Clear server-side cache',
            'GET /clear-cache': 'Clear client-side cache and data'
        }
    })
}