'use client'

import { useState, useEffect } from 'react'
import { getSupabase } from '@/utils/supabase/client'
import { Star, MessageSquare } from 'lucide-react'
import ExportButton from './export-button'
import { NCSLoader } from '@/components/ui/NCSLoader'

export default function AdminFeedbackPage() {
    const supabase = getSupabase()
    const [loading, setLoading] = useState(true)
    const [feedbacks, setFeedbacks] = useState<any[]>([])
    const [averageRating, setAverageRating] = useState('0.0')

    useEffect(() => {
        const loadFeedback = async () => {
            try {
                const { data, error } = await supabase
                    .from('feedback')
                    .select(`
                        *,
                        profiles:user_id (
                            email,
                            full_name,
                            avatar_url
                        )
                    `)
                    .order('created_at', { ascending: false })

                if (error) {
                    console.error('Error fetching feedback:', error)
                } else if (data) {
                    setFeedbacks(data)
                    // Calculate average rating
                    const avg = data.length
                        ? (data.reduce((acc: number, curr: any) => acc + (curr.rating || 0), 0) / data.length).toFixed(1)
                        : '0.0'
                    setAverageRating(avg)
                }
            } catch (err) {
                console.error('[Feedback] Error:', err)
            } finally {
                setLoading(false)
            }
        }

        loadFeedback()
    }, [supabase])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <NCSLoader />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Quản lý Phản hồi</h1>
                    <p className="text-slate-500 text-sm mt-1">Xem và quản lý ý kiến đóng góp từ người dùng</p>
                </div>
                <ExportButton feedbacks={feedbacks} />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 uppercase">Tổng phản hồi</p>
                            <p className="text-3xl font-bold text-slate-900">{feedbacks.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Star className="w-6 h-6 fill-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 uppercase">Đánh giá TB</p>
                            <p className="text-3xl font-bold text-slate-900">{averageRating}/5</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Người dùng</th>
                                <th className="px-6 py-4">Đánh giá</th>
                                <th className="px-6 py-4 w-1/2">Nội dung</th>
                                <th className="px-6 py-4">Ngày gửi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {feedbacks.map((item: any) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                                {item.profiles?.full_name?.[0] || item.profiles?.email?.[0] || 'U'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{item.profiles?.full_name || 'User'}</p>
                                                <p className="text-xs text-slate-500">{item.profiles?.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1">
                                            <span className="font-bold text-slate-900">{item.rating}</span>
                                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 leading-relaxed">
                                        {item.content}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                        {new Date(item.created_at).toLocaleDateString('vi-VN')}
                                    </td>
                                </tr>
                            ))}
                            {feedbacks.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        Chưa có phản hồi nào.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
