'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'

interface ConsultingRequest {
  id: number
  name: string
  email: string
  phone: string | null
  company: string | null
  package_type: string
  message: string | null
  status: string
  created_at: string
}

const packageLabels: Record<string, string> = {
  spot: '스팟 상담',
  review: '제안서 리뷰',
  project: '프로젝트 컨설팅',
}

const statusMap: Record<string, { label: string; class: string }> = {
  pending: { label: '대기', class: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  confirmed: { label: '확정', class: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed: { label: '완료', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: '취소', class: 'bg-gray-50 text-gray-500 border-gray-200' },
}

export default function AdminConsulting() {
  const [requests, setRequests] = useState<ConsultingRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRequests()
  }, [])

  async function loadRequests() {
    const supabase = createClient()
    const { data } = await supabase
      .from('consulting_requests')
      .select('*')
      .order('created_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  async function updateStatus(id: number, status: string) {
    const supabase = createClient()
    await supabase.from('consulting_requests').update({ status }).eq('id', id)
    loadRequests()
  }

  const formatDate = (date: string) => new Date(date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">컨설팅 신청 관리</h1>

      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">로딩 중...</div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">컨설팅 신청이 없습니다</div>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{req.name}</h3>
                    <Badge className={`text-xs border ${statusMap[req.status]?.class || ''}`}>
                      {statusMap[req.status]?.label || req.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    {req.email} {req.phone && `| ${req.phone}`} {req.company && `| ${req.company}`}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-xs">{packageLabels[req.package_type] || req.package_type}</Badge>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(req.created_at)}</p>
                </div>
              </div>
              {req.message && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-600">{req.message}</p>
                </div>
              )}
              <div className="flex gap-2">
                {req.status === 'pending' && (
                  <>
                    <button onClick={() => updateStatus(req.id, 'confirmed')} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">확정</button>
                    <button onClick={() => updateStatus(req.id, 'cancelled')} className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">취소</button>
                  </>
                )}
                {req.status === 'confirmed' && (
                  <button onClick={() => updateStatus(req.id, 'completed')} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">완료 처리</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
