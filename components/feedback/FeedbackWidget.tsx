'use client';

import { useState } from 'react';
import { MessageSquarePlus, X, Send, Loader2, Bug, Lightbulb, Heart } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function FeedbackWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [type, setType] = useState<'bug' | 'idea' | 'other'>('idea');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const pathname = usePathname();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    message,
                    page_url: pathname
                })
            });

            const data = await res.json();

            if (res.ok) {
                setMessage('');
                setIsOpen(false);
                toast.success(data.rewarded
                    ? `Cảm ơn! Bạn được +${data.points} NCS Credits!`
                    : 'Cảm ơn đóng góp của bạn!'
                );
            } else {
                toast.error(data.error || 'Có lỗi xảy ra, vui lòng thử lại.');
            }
        } catch (error) {
            toast.error('Không thể gửi phản hồi. Vui lòng kiểm tra mạng.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="group flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 transform hover:scale-105"
                >
                    <MessageSquarePlus className="w-6 h-6" />
                    <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out whitespace-nowrap font-medium pr-1">
                        Góp ý & Nhận quà
                    </span>
                </button>
            )}

            {/* Form Modal */}
            {isOpen && (
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-80 md:w-96 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between text-white">
                        <div className="flex items-center gap-2">
                            <MessageSquarePlus className="w-5 h-5" />
                            <h3 className="font-bold">Gửi góp ý</h3>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="hover:bg-white/20 p-1 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-4 space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => setType('bug')}
                                className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-medium border transition-all ${type === 'bug'
                                        ? 'bg-red-50 border-red-200 text-red-700'
                                        : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                                    }`}
                            >
                                <Bug className="w-4 h-4" />
                                Báo lỗi
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('idea')}
                                className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-medium border transition-all ${type === 'idea'
                                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                                        : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                                    }`}
                            >
                                <Lightbulb className="w-4 h-4" />
                                Ý tưởng
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('other')}
                                className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-medium border transition-all ${type === 'other'
                                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                                        : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                                    }`}
                            >
                                <Heart className="w-4 h-4" />
                                Khác
                            </button>
                        </div>

                        <div>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Hãy chia sẻ ý kiến của bạn..."
                                className="w-full min-h-[100px] text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                maxLength={500}
                                required
                            />
                            <div className="flex justify-between items-center mt-1">
                                <span className="text-xs text-slate-400">{message.length}/500</span>
                                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    +50 NCS Credits
                                </span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || !message.trim()}
                            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-medium py-2.5 rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Gửi ngay
                                </>
                            )}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
