import React from 'react'

interface NCSLoaderProps {
    text?: string
    size?: 'sm' | 'md' | 'lg'
}

export function NCSLoader({ text, size = 'md' }: NCSLoaderProps) {
    const sizeClasses = {
        sm: 'w-12 h-12',
        md: 'w-20 h-20',
        lg: 'w-32 h-32'
    }

    const logoSize = {
        sm: 'w-6',
        md: 'w-10',
        lg: 'w-16'
    }

    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
                {/* Spinning Ring */}
                <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>

                {/* Pulsing Logo */}
                <div className={`relative z-10 ${logoSize[size]} animate-pulse`}>
                    <img src="/logo.svg" alt="Loading..." className="w-full h-auto object-contain" />
                </div>
            </div>

            {text && (
                <div className="text-center space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <p className="text-slate-900 font-medium text-lg">{text}</p>
                    <p className="text-slate-400 text-sm">Đang xử lý dữ liệu...</p>
                </div>
            )}
        </div>
    )
}
