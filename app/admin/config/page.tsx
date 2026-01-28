'use client'

import React, { useEffect, useState } from 'react'
import { getAnalysisCosts, updateAnalysisCosts, ANALYSIS_TYPES } from '@/lib/ncs-credits'
import { toast } from 'react-hot-toast'
import { Save, Loader2, RefreshCw } from 'lucide-react'

export default function AdminConfigPage() {
    const [costs, setCosts] = useState<Record<string, number>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [originalCosts, setOriginalCosts] = useState<Record<string, number>>({})

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const data = await getAnalysisCosts()
            setCosts(data)
            setOriginalCosts(JSON.parse(JSON.stringify(data)))
        } catch (error) {
            console.error('Failed to load costs', error)
            toast.error('Không thể tải cấu hình giá')
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (key: string, value: string) => {
        const numValue = parseInt(value) || 0
        setCosts(prev => ({
            ...prev,
            [key]: numValue
        }))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const success = await updateAnalysisCosts(costs)
            if (success) {
                toast.success('Đã cập nhật cấu hình giá thành công')
                setOriginalCosts(JSON.parse(JSON.stringify(costs)))
            } else {
                toast.error('Lỗi khi lưu cấu hình')
            }
        } catch (error) {
            console.error('Save error:', error)
            toast.error('Có lỗi xảy ra')
        } finally {
            setSaving(false)
        }
    }

    const hasChanges = JSON.stringify(costs) !== JSON.stringify(originalCosts)

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Cấu hình hệ thống</h1>
                    <p className="text-slate-500 text-sm">Quản lý giá (Credits) cho các loại phân tích.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => loadData()}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Tải lại"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${hasChanges && !saving
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Lưu thay đổi
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="font-semibold text-slate-700">Bảng giá phân tích (Analysis Costs)</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Loại phân tích</th>
                                <th className="px-6 py-3">Mã hệ thống (Key)</th>
                                <th className="px-6 py-3 text-right">Giá tiền (NCS)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {Object.entries(ANALYSIS_TYPES).map(([key, label]) => (
                                <tr key={key} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-slate-700">
                                        {label}
                                    </td>
                                    <td className="px-6 py-3 text-slate-400 font-mono text-xs">
                                        {key}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <input
                                            type="number"
                                            value={costs[key] || 0}
                                            onChange={(e) => handleChange(key, e.target.value)}
                                            className="w-32 px-3 py-1 text-right border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
