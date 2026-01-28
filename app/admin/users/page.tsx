'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientOnly } from '@/utils/supabase/client-only'
import UsersTable from '@/components/admin/UsersTable'
import { Loader2 } from 'lucide-react'

export default function AdminUsersPage() {
    const router = useRouter()
    // Auth validation is handled by AdminLayout

    // Direct render UsersTable
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Quản lý người dùng</h1>
                <p className="text-slate-500 text-sm">Danh sách tài khoản và hồ sơ học thuật của thành viên.</p>
            </div>

            <UsersTable />
        </div>
    )
}
