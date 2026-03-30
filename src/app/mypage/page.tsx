'use client'

import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { FileText, Download, MessageSquare, User, Settings } from 'lucide-react'

export default function MyPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <h1 className="text-2xl font-bold mb-8">마이페이지</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="space-y-1">
          {[
            { icon: FileText, label: '주문 내역', active: true },
            { icon: Download, label: '다운로드', active: false },
            { icon: MessageSquare, label: '문의 내역', active: false },
            { icon: User, label: '내 정보 관리', active: false },
            { icon: Settings, label: '환경설정', active: false },
          ].map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                item.active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="md:col-span-3">
          <div className="border border-border rounded-xl p-6">
            <h2 className="font-semibold mb-4">주문 내역</h2>
            <Separator className="mb-6" />
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">주문 내역이 없습니다</p>
              <p className="text-sm mt-2">템플릿을 구매하시면 여기에 표시됩니다.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
