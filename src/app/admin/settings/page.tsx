'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Settings, Save, Loader2 } from 'lucide-react'

interface SettingRow {
  key: string
  value: string
}

const SETTING_GROUPS = {
  회사정보: [
    { key: 'company_name', label: '회사명' },
    { key: 'ceo_name', label: '대표자명' },
    { key: 'business_number', label: '사업자등록번호' },
    { key: 'commerce_number', label: '통신판매업신고번호' },
    { key: 'address', label: '주소' },
    { key: 'email', label: '이메일' },
    { key: 'phone', label: '전화번호' },
  ],
  SEO설정: [
    { key: 'mission', label: '미션 (Mission)' },
    { key: 'vision', label: '비전 (Vision)' },
    { key: 'values', label: '핵심가치 (Values)' },
  ],
  기타: [
    { key: 'copyright', label: '저작권 텍스트' },
  ],
}

const ALL_KEYS = Object.values(SETTING_GROUPS).flat().map((f) => f.key)

export default function SiteSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ALL_KEYS)
      if (data) {
        const map: Record<string, string> = {}
        data.forEach((row: SettingRow) => {
          map[row.key] = row.value
        })
        setSettings(map)
      }
      setLoading(false)
    }
    load()
  }, [])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const supabase = createClient()
      const upserts = Object.entries(settings).map(([key, value]) => ({ key, value }))
      const { error } = await supabase
        .from('site_settings')
        .upsert(upserts, { onConflict: 'key' })
      if (error) throw error
      showToast('설정이 저장되었습니다.', 'success')
    } catch (err) {
      console.error(err)
      showToast('저장 중 오류가 발생했습니다.', 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleChange(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-gray-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">사이트 설정</h1>
            <p className="text-sm text-gray-500 mt-0.5">사이트 전체에 표시되는 기본 정보를 관리합니다</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 h-10 px-5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      {/* Groups */}
      <div className="space-y-8">
        {Object.entries(SETTING_GROUPS).map(([groupName, fields]) => (
          <div key={groupName} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">{groupName}</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {fields.map((field) => (
                <div key={field.key} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 w-48 shrink-0">
                    {field.label}
                    <span className="ml-1 text-xs text-gray-400 font-normal">({field.key})</span>
                  </label>
                  <input
                    type="text"
                    value={settings[field.key] ?? ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={`${field.label} 입력`}
                    className="flex-1 h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Save button (bottom) */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 h-10 px-6 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? '저장 중...' : '변경사항 저장'}
        </button>
      </div>
    </div>
  )
}
