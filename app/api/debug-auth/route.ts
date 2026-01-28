import { NextRequest, NextResponse } from 'next/server'
import { debugAuthServer, formatAuthDebug } from '@/lib/auth-debug-server'

export async function GET(request: NextRequest) {
    try {
        const debugInfo = await debugAuthServer(request)
        const formattedInfo = formatAuthDebug(debugInfo)

        console.log(formattedInfo)

        return NextResponse.json({
            success: true,
            debug: debugInfo,
            formatted: formattedInfo
        })
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}