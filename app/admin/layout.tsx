'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getSupabase } from '@/utils/supabase/client'
import Link from 'next/link'
import { Shield, MessageSquare, ArrowLeft, Users, Settings, Activity, ShieldCheck } from 'lucide-react'
import { NCSLoader } from '@/components/ui/NCSLoader'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const supabase = getSupabase()

    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const { data: { user }, error } = await supabase.auth.getUser()

                if (error || !user) {
                    router.push('/login?next=' + pathname)
                    return
                }

                // Check if user is admin
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                const userProfile = profile as any
                if (userProfile?.role !== 'admin') {
                    router.push('/')
                    return
                }

                setIsAdmin(true)
            } catch (err) {
                console.error('[Admin] Error checking admin:', err)
                router.push('/login')
            } finally {
                setLoading(false)
            }
        }

        checkAdmin()
    }, [router, pathname, supabase])

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <NCSLoader text="Đang xác thực quyền admin..." />
            </div>
        )
    }

    if (!isAdmin) {
        return null // Will redirect
    }

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col">
                <div className="p-6 border-b border-slate-800">
                    <Link href="/" className="flex items-center gap-2 text-slate-100 hover:text-white transition-colors">
                        <Shield className="w-6 h-6 text-blue-400" />
                        <span className="font-bold text-lg">NCS Admin</span>
                    </Link>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <NavLink href="/admin/feedback" icon={<MessageSquare className="w-4 h-4" />} active={pathname?.includes('/feedback')}>
                        Phản hồi (Feedback)
                    </NavLink>
                    <NavLink href="/admin/users" icon={<Users className="w-4 h-4" />} active={pathname?.includes('/users')}>
                        Người dùng
                    </NavLink>
                    <NavLink href="/admin/config" icon={<Settings className="w-4 h-4" />} active={pathname?.includes('/config')}>
                        Cấu hình
                    </NavLink>
                    <NavLink href="/admin/health" icon={<Activity className="w-4 h-4" />} active={pathname?.includes('/health')}>
                        Hệ thống
                    </NavLink>
                    <NavLink href="/admin/audit" icon={<ShieldCheck className="w-4 h-4" />} active={pathname?.includes('/audit')}>
                        Nhật ký (Audit)
                    </NavLink>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4" />
                        Về trang chủ
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto h-screen">
                {children}
            </main>
        </div>
    )
}

function NavLink({ href, icon, children, active }: { href: string; icon: any; children: React.ReactNode; active?: boolean }) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${active
                ? 'bg-slate-800 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
        >
            {icon}
            {children}
        </Link>
    )
}
