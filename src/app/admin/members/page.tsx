'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'

interface Profile {
  id: string
  email: string
  name: string | null
  phone: string | null
  company: string | null
  role: string
  created_at: string
}

export default function AdminMembers() {
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMembers()
  }, [])

  async function loadMembers() {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setMembers(data || [])
    setLoading(false)
  }

  async function toggleAdmin(id: string, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    if (newRole === 'admin' && !confirm('관리자 권한을 부여하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('profiles').update({ role: newRole }).eq('id', id)
    loadMembers()
  }

  const formatDate = (date: string) => new Date(date).toLocaleDateString('ko-KR')

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">회원 관리</h1>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">이름</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">이메일</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">연락처</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">회사</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">권한</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">가입일</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">로딩 중...</td></tr>
            ) : members.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">가입된 회원이 없습니다</td></tr>
            ) : (
              members.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium">{m.name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{m.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{m.phone || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{m.company || '-'}</td>
                  <td className="px-6 py-4">
                    <Badge className={m.role === 'admin' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-500 border-gray-200'}>
                      {m.role === 'admin' ? '관리자' : '일반'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(m.created_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end">
                      <button
                        onClick={() => toggleAdmin(m.id, m.role)}
                        className={`text-xs px-2 py-1 rounded ${
                          m.role === 'admin'
                            ? 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        {m.role === 'admin' ? '권한 해제' : '관리자 지정'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
