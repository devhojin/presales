'use client'

import { useEffect, useState } from 'react'
import { useToastStore } from '@/stores/toast-store'
import { CheckCircle, Info, XCircle, X } from 'lucide-react'

const iconMap = {
  success: CheckCircle,
  info: Info,
  error: XCircle,
}

const colorMap = {
  success: 'bg-blue-50 border-blue-200 text-blue-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  error: 'bg-red-50 border-red-200 text-red-700',
}

const iconColorMap = {
  success: 'text-blue-500',
  info: 'text-blue-500',
  error: 'text-red-500',
}

function ToastItem({ id, message, type = 'success' }: { id: string; message: string; type?: 'success' | 'info' | 'error' }) {
  const { removeToast } = useToastStore()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(() => setVisible(false), 3700)
    return () => clearTimeout(timer)
  }, [])

  const Icon = iconMap[type]

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 ${colorMap[type]} ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 ${iconColorMap[type]}`} />
      <p className="text-sm font-medium flex-1">{message}</p>
      <button onClick={() => removeToast(id)} className="shrink-0 hover:opacity-70 transition-opacity cursor-pointer">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const { toasts } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem id={toast.id} message={toast.message} type={toast.type} />
        </div>
      ))}
    </div>
  )
}
