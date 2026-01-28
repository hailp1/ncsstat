'use client'

import Link from 'next/link'
import UserMenu from '@/components/UserMenu'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { NcsBalanceBadge } from '@/components/NcsBalanceBadge'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { getStoredLocale, t, type Locale } from '@/lib/i18n'
import { useAuth } from '@/context/AuthContext'

interface HeaderProps {
    user?: any
    profile?: any
    centerContent?: React.ReactNode
    rightActions?: React.ReactNode
    hideNav?: boolean
}

export default function Header({ centerContent, rightActions, hideNav = false, user: propUser, profile: propProfile }: HeaderProps) {
    const pathname = usePathname()
    const { user: authUser, profile: authProfile, loading } = useAuth()

    // Use auth context if loaded, otherwise fallback to props to reduce flicker
    const user = authUser || propUser;
    const profile = authProfile || propProfile;
    const [locale, setLocale] = useState<Locale>('vi')

    useEffect(() => {
        setLocale(getStoredLocale())
        const handleStorageChange = () => setLocale(getStoredLocale())
        window.addEventListener('storage', handleStorageChange)
        window.addEventListener('localeChange', handleStorageChange)
        return () => {
            window.removeEventListener('storage', handleStorageChange)
            window.removeEventListener('localeChange', handleStorageChange)
        }
    }, [])

    return (
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200 sticky top-0 z-50">
            <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-2 md:gap-4">
                {/* Left: Logo & Nav */}
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                        <img src="/logo.svg" alt="ncsStat" className="h-9 w-auto" />
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200 uppercase tracking-wide">Beta</span>
                    </Link>

                    {/* Desktop Nav */}
                    {!hideNav && !centerContent && (
                        <nav className="hidden md:flex items-center gap-1">
                            <NavLink href="/analyze" active={pathname?.startsWith('/analyze')}>{t(locale, 'nav.analyze')}</NavLink>
                            {user && (
                                <NavLink href="/profile" active={pathname?.startsWith('/profile')}>{t(locale, 'nav.profile')}</NavLink>
                            )}
                        </nav>
                    )}
                </div>

                {/* Center: Custom Content (e.g. Toolbar) or Spacer */}
                {centerContent ? (
                    <div className="flex-1 flex justify-center min-w-0">
                        {centerContent}
                    </div>
                ) : (
                    <div className="flex-1" /> // Spacer
                )}

                {/* Right: Actions & User */}
                <div className="flex items-center gap-3 shrink-0">
                    {rightActions}

                    {/* Separator if actions exist */}
                    {rightActions && <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />}

                    {/* NCS Balance Badge - show when user is logged in */}
                    {user && (
                        <NcsBalanceBadge balance={profile?.tokens || 0} size="sm" />
                    )}

                    {/* Language Switcher */}
                    <LanguageSwitcher compact />

                    {user ? (
                        <UserMenu user={user} profile={profile} />
                    ) : (
                        <Link href="/login" className="px-5 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-all shadow-sm">
                            Login
                        </Link>
                    )}
                </div>
            </div>
        </header>
    )
}

function NavLink({ href, active, children }: { href: string, active?: boolean, children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${active
                ? 'text-blue-600 bg-blue-50/80'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
        >
            {children}
            {active && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-600 rounded-full" />
            )}
        </Link>
    )
}
