'use client'

import React, { useEffect, useState } from 'react'
import { createClientOnly } from '@/utils/supabase/client-only'

import { Loader2, Search, Filter, FileText, DollarSign } from 'lucide-react'

// Types
type Transaction = {
    id: number
    created_at: string
    user_id: string
    amount: number
    type: string
    description: string
    user?: { email: string }
}

type ActivityLog = {
    id: number
    created_at: string
    user_id: string
    action_type: string
    action_details: any
    user?: { email: string }
}

export default function AdminAuditPage() {
    const [activeTab, setActiveTab] = useState<'transactions' | 'activities'>('transactions')
    const [loading, setLoading] = useState(true)
    const [auditData, setAuditData] = useState<Transaction[] | ActivityLog[]>([])
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchData()
    }, [activeTab])

    const fetchData = async () => {
        setLoading(true)
        const supabase = createClientOnly()

        try {
            if (activeTab === 'transactions') {
                const { data, error } = await supabase
                    .from('token_transactions')
                    .select('*, user:profiles(email)')
                    .order('created_at', { ascending: false })
                    .limit(50)

                if (error) throw error
                setAuditData((data || []) as any)
            } else {
                const { data, error } = await supabase
                    .from('activity_logs')
                    .select('*, user:profiles(email)')
                    .order('created_at', { ascending: false })
                    .limit(50)

                if (error) throw error
                setAuditData((data || []) as any)
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error)
        } finally {
            setLoading(false)
        }
    }

    // Simple client-side search
    const filteredData = auditData.filter((item: any) =>
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.action_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Nhật ký hệ thống (Audit Logs)</h1>
                    <p className="text-slate-500 text-sm">Theo dõi dòng tiền và hoạt động người dùng.</p>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-slate-100 rounded-lg">
                    <button
                        onClick={() => setActiveTab('transactions')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'transactions' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <DollarSign className="w-4 h-4" />
                        Giao dịch (Transactions)
                    </button>
                    <button
                        onClick={() => setActiveTab('activities')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'activities' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        Hoạt động (Activities)
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm người dùng, hành động..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
                {/* Filter button placeholder */}
                <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg border border-slate-200">
                    <Filter className="w-4 h-4" />
                </button>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Thời gian</th>
                                    <th className="px-6 py-3">Người dùng</th>
                                    {activeTab === 'transactions' ? (
                                        <>
                                            <th className="px-6 py-3">Loại giao dịch</th>
                                            <th className="px-6 py-3">Số tiền</th>
                                            <th className="px-6 py-3">Nội dung</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-6 py-3">Hành động</th>
                                            <th className="px-6 py-3">Chi tiết</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredData.length > 0 ? (
                                    filteredData.map((item: any) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                                {new Date(item.created_at).toLocaleString('vi-VN')}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-700">
                                                {item.user?.email || 'Unknown User'}
                                            </td>

                                            {activeTab === 'transactions' ? (
                                                <>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.amount > 0
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-red-100 text-red-700'
                                                            }`}>
                                                            {item.type}
                                                        </span>
                                                    </td>
                                                    <td className={`px-6 py-4 font-mono font-medium ${item.amount > 0 ? 'text-green-600' : 'text-red-600'
                                                        }`}>
                                                        {item.amount > 0 ? '+' : ''}{item.amount.toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={item.description}>
                                                        {item.description}
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                                                            {item.action_type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                                                        {JSON.stringify(item.action_details || {})}
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                            Không tìm thấy dữ liệu
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
