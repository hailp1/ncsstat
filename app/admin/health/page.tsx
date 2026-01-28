'use client'

import React, { useEffect, useState } from 'react'
import { getActivityBreakdown } from '@/lib/admin-actions'
import { getSupabase } from '@/utils/supabase/client'
import { Activity, Database, Server, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'

export default function AdminHealthPage() {
    const [loading, setLoading] = useState(true)
    const [dbStatus, setDbStatus] = useState<'ok' | 'error' | 'checking'>('checking')
    const [latency, setLatency] = useState<number>(0)
    const [activityStats, setActivityStats] = useState<{ type: string; count: number }[]>([])

    useEffect(() => {
        checkHealth()
    }, [])

    const checkHealth = async () => {
        setLoading(true)
        setDbStatus('checking')
        const start = performance.now()

        try {
            const supabase = getSupabase()
            // Check DB connection
            const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true })

            const end = performance.now()
            setLatency(Math.round(end - start))

            if (error) throw error
            setDbStatus('ok')

            // Fetch activity stats
            const stats = await getActivityBreakdown(7) // last 7 days
            setActivityStats(stats)

        } catch (error) {
            console.error('Health check failed:', error)
            setDbStatus('error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-5xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Trạng thái hệ thống</h1>
                    <p className="text-slate-500 text-sm">Giám sát sức khỏe Server và Cơ sở dữ liệu.</p>
                </div>
                <button
                    onClick={checkHealth}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Kiểm tra lại
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Database Status Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-lg font-medium text-slate-700">Supabase DB</p>
                            <p className="text-sm text-slate-500 mt-1">Kết nối cơ sở dữ liệu</p>
                        </div>
                        <div className={`p-3 rounded-full ${dbStatus === 'ok' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            <Database className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="mt-6 flex items-center gap-2">
                        {dbStatus === 'ok' ? (
                            <>
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <span className="font-semibold text-green-700">Hoạt động tốt</span>
                                <span className="text-slate-400 text-sm ml-auto">{latency}ms</span>
                            </>
                        ) : (
                            <>
                                <AlertCircle className="w-5 h-5 text-red-500" />
                                <span className="font-semibold text-red-700">Mất kết nối</span>
                            </>
                        )}
                    </div>
                </div>

                {/* API Status Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-lg font-medium text-slate-700">API Routes</p>
                            <p className="text-sm text-slate-500 mt-1">Next.js Server Functions</p>
                        </div>
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                            <Server className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="mt-6 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span className="font-semibold text-green-700">Sẵn sàng</span>
                        <span className="text-slate-400 text-sm ml-auto">Vercel Edge</span>
                    </div>
                </div>

                {/* WebR Status Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-lg font-medium text-slate-700">R Engine</p>
                            <p className="text-sm text-slate-500 mt-1">WASM Runtime</p>
                        </div>
                        <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                            <Activity className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="mt-6 flex items-center gap-2">
                        <span className="text-sm text-slate-600">Client-side runtime</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full ml-auto">v0.4.2</span>
                    </div>
                </div>
            </div>

            {/* Activity Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-800">Hoạt động trong 7 ngày qua</h2>
                </div>
                <div className="p-6">
                    {activityStats.length > 0 ? (
                        <div className="space-y-4">
                            {activityStats.map((stat, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <span className="text-slate-600 font-medium capitalize">
                                        {stat.type.replace(/_/g, ' ')}
                                    </span>
                                    <div className="flex items-center gap-3 w-2/3">
                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full"
                                                style={{ width: `${Math.min(100, (stat.count / Math.max(...activityStats.map(s => s.count))) * 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-bold text-slate-800 w-8 text-right">{stat.count}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400 text-center py-8">Chưa có dữ liệu hoạt động</p>
                    )}
                </div>
            </div>
        </div>
    )
}
