import { NextResponse, type NextRequest } from 'next/server'
// import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
    // PASS-THROUGH: Rely on Client-Side Auth Checks
    // We are disabling server-side middleware checks to avoid cookie persistence issues.
    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (files in public folder including images)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
