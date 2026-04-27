'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  MessageCircle, Send, Paperclip, Loader2, X, Search, FileText, Download,
  User, Mail, Phone, Building, CreditCard, AlertTriangle, Clock,
  ChevronDown, Image as ImageIcon, XCircle, Trash2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { ChatRoom, ChatMessage } from '@/lib/chat'
import { MAX_FILE_SIZE, MAX_FILE_SIZE_LABEL } from '@/lib/chat-constants'
import { uploadFile } from '@/lib/storage-upload'
import { fetchSignedUrl } from '@/lib/storage-signed-url'

// DB 에는 storage path 만 저장 → 렌더 시점에 서명 URL 재발급 (admin 은 모든 방 접근 가능)
function useAdminChatSignedUrl(storedValue: string | null | undefined) {
  const [signedFile, setSignedFile] = useState<{ storedValue: string; url: string | null } | null>(null)

  useEffect(() => {
    if (!storedValue) return
    let aborted = false
    fetchSignedUrl({ bucket: 'chat-files', storedValue }).then((signed) => {
      if (!aborted) setSignedFile({ storedValue, url: signed })
    })
    return () => { aborted = true }
  }, [storedValue])

  return storedValue && signedFile?.storedValue === storedValue ? signedFile.url : null
}

function AdminChatImage({ msg }: { msg: ChatMessage }) {
  const url = useAdminChatSignedUrl(msg.file_url)
  if (!url) return <span className="text-xs opacity-70">이미지 불러오는 중...</span>
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img src={url} alt={msg.file_name || '이미지'} className="max-w-full max-h-60 rounded-lg" />
    </a>
  )
}

function AdminChatFile({ msg, isAdmin }: { msg: ChatMessage; isAdmin: boolean }) {
  const url = useAdminChatSignedUrl(msg.file_url)
  const colorClass = isAdmin ? 'text-white/90 hover:text-white' : 'text-foreground hover:text-primary'
  if (!url) {
    return (
      <span className={`flex items-center gap-2 opacity-70 ${colorClass}`}>
        <FileText className="w-4 h-4 shrink-0" />
        <span className="truncate text-xs">{msg.file_name || '파일'}</span>
      </span>
    )
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 ${colorClass}`}>
      <FileText className="w-4 h-4 shrink-0" />
      <span className="truncate text-xs">{msg.file_name}</span>
      <Download className="w-3.5 h-3.5 shrink-0" />
    </a>
  )
}

const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.vbs', '.vbe', '.js', '.jse', '.ws', '.wsf', '.wsc', '.wsh',
  '.ps1', '.ps2', '.psc1', '.psc2', '.reg', '.inf', '.lnk',
  '.dll', '.sys', '.drv', '.cpl',
]

type ChatUploadResult = {
  url: string
  name: string
  size: number
  type: string
  fileType: 'image' | 'file'
}

async function uploadAdminChatFile(file: File, roomId: string): Promise<ChatUploadResult | null> {
  const lastDot = file.name.lastIndexOf('.')
  const ext = lastDot > 0 ? file.name.slice(lastDot) : ''
  const safeName = `${roomId}/${Date.now()}_${Math.random().toString(36).slice(2, 10)}${ext}`
  const result = await uploadFile({
    bucket: 'chat-files',
    path: safeName,
    file,
    contentType: file.type,
  })
  if (!result.ok) return null
  // DB 에는 storage path 만 저장. 표시 시점에 서명 URL 재발급.
  return {
    url: safeName,
    name: file.name,
    size: file.size,
    type: file.type,
    fileType: file.type.startsWith('image/') ? 'image' : 'file',
  }
}

function isBlocked(name: string) {
  const ext = name.toLowerCase().slice(name.lastIndexOf('.'))
  return BLOCKED_EXTENSIONS.includes(ext)
}

function formatTime(d: string) {
  const date = new Date(d)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return '방금'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`
  if (diff < 86400000) return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

function formatFullTime(d: string) {
  return new Date(d).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatAmount(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n) + '원'
}

// ============================================
// 회원 정보 모달
// ============================================
function MemberModal({ room, onClose }: { room: ChatRoom; onClose: () => void }) {
  const profile = room.profiles
  if (!profile && room.room_type === 'guest') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-background border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">비회원 정보</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3"><User className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{room.guest_name || '비회원'}</span></div>
            <div className="flex items-center gap-3"><Clock className="w-4 h-4 text-muted-foreground" /><span className="text-sm">접속: {formatFullTime(room.created_at)}</span></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">회원 정보</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        {profile ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3"><User className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-medium">{profile.name || '이름 미설정'}</span></div>
            <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{profile.email}</span></div>
            {profile.phone && <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{profile.phone}</span></div>}
            {profile.company && <div className="flex items-center gap-3"><Building className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{profile.company}</span></div>}
            <div className="flex items-center gap-3"><Clock className="w-4 h-4 text-muted-foreground" /><span className="text-sm">채팅 시작: {formatFullTime(room.created_at)}</span></div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">프로필 정보가 없습니다</p>
        )}
      </div>
    </div>
  )
}

// ============================================
// 결제요청 모달
// ============================================
function PaymentRequestModal({ roomId, userId, onClose, onSent }: {
  roomId: string; userId: string; onClose: () => void; onSent: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!title.trim() || !amount) return
    const numAmount = parseInt(amount.replace(/,/g, ''))
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('유효한 금액을 입력하세요')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/chat/payment-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          target_user_id: userId,
          title: title.trim(),
          description: description.trim() || null,
          amount: numAmount,
        }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        return
      }
      onSent()
      onClose()
    } catch {
      setError('결제 요청에 실패했습니다')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-700" /> 결제 요청
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">상품명 *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              placeholder="커스텀 제안서 패키지"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 resize-none"
              rows={2}
              placeholder="상세 설명 (선택)"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">금액 (원) *</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9,]/g, ''))}
              className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              placeholder="99,000"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-xs">
              <AlertTriangle className="w-3.5 h-3.5" /> {error}
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !amount || sending}
            className="w-full py-2.5 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '결제 요청 보내기'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// 삭제 확인 모달
// ============================================
function DeleteConfirmModal({ roomName, onCancel, onConfirm }: {
  roomName: string
  onCancel: () => void
  onConfirm: (mode: 'hide' | 'full') => void
}) {
  const [deleting, setDeleting] = useState<'hide' | 'full' | null>(null)

  const handleClick = async (mode: 'hide' | 'full') => {
    setDeleting(mode)
    await onConfirm(mode)
    setDeleting(null)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-background border border-border rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-red-500" /> 채팅방 삭제
          </h3>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-5">
          <span className="font-medium text-foreground">{roomName}</span> 채팅방을 어떻게 삭제하시겠습니까?
        </p>

        <div className="space-y-2">
          <button
            onClick={() => handleClick('hide')}
            disabled={deleting !== null}
            className="w-full p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors text-left cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center shrink-0">
                {deleting === 'hide' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">리스트에서 삭제</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  채팅방을 목록에서 숨깁니다. 대화 내역은 DB에 남아있습니다.
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleClick('full')}
            disabled={deleting !== null}
            className="w-full p-4 border border-red-200 rounded-xl hover:bg-red-50 transition-colors text-left cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                {deleting === 'full' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-600">완전 삭제</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  채팅방과 모든 대화 내역을 DB에서 영구 삭제합니다. 복구할 수 없습니다.
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// 관리자 채팅 메인
// ============================================
export default function AdminChatPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread' | 'member' | 'guest'>('all')
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ChatRoom | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 방 목록 로드
  const loadRooms = useCallback(async () => {
    const res = await fetch('/api/chat/rooms')
    const data = await res.json()
    if (data.rooms) setRooms(data.rooms)
    setLoading(false)
  }, [])

  useEffect(() => { loadRooms() }, [loadRooms])

  // Realtime 구독: 채팅방 목록 실시간 갱신 (INSERT / UPDATE)
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('admin-chat-rooms')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_rooms' },
        () => { loadRooms() }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_rooms' },
        () => { loadRooms() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadRooms])

  // 메시지 로드
  const loadMessages = useCallback(async (roomId: string) => {
    try {
      const res = await fetch(`/api/chat/messages?room_id=${roomId}`)
      if (!res.ok) {
        setError(`메시지 로드 실패 (HTTP ${res.status})`)
        return
      }
      const data = await res.json()
      if (data.error) {
        setError(`메시지 로드 실패: ${data.error}`)
        return
      }
      setMessages(data.messages || [])
      // 읽음 처리
      await fetch('/api/chat/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomId }),
      })
      loadRooms()
    } catch (e) {
      setError(`메시지 로드 오류: ${e instanceof Error ? e.message : '알 수 없는 오류'}`)
    }
  }, [loadRooms])

  // 방 선택 — 이전 방 메시지를 즉시 비워서 깜빡임 방지
  const selectRoom = (room: ChatRoom) => {
    if (selectedRoom?.id === room.id) return
    setMessages([])
    setError(null)
    setSelectedRoom(room)
    loadMessages(room.id)
  }

  // Realtime 구독: 선택한 방의 새 메시지 실시간 수신
  useEffect(() => {
    if (!selectedRoom) return

    const supabase = createClient()
    const channel = supabase
      .channel(`admin-chat-messages-${selectedRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${selectedRoom.id}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          // 읽음 처리
          fetch('/api/chat/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room_id: selectedRoom.id }),
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedRoom])

  useEffect(() => {
    // 컨테이너 내부에서만 스크롤 (페이지 전체 스크롤 방지)
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages])

  // 전송
  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !selectedRoom) return
    setSending(true)
    setInput('')
    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: selectedRoom.id, content: text }),
      })
    } catch {
      setError('전송 실패')
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  // 파일 업로드
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedRoom) return

    if (isBlocked(file.name)) {
      setError(`보안상 위험한 파일은 전송 불가: ${file.name}`)
      e.target.value = ''
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`파일 ${MAX_FILE_SIZE_LABEL} 이하만 가능`)
      e.target.value = ''
      return
    }

    setUploading(true)
    try {
      const uploadData = await uploadAdminChatFile(file, selectedRoom.id)
      if (!uploadData) { setError('파일 업로드 실패'); return }

      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: selectedRoom.id,
          content: file.name,
          message_type: uploadData.fileType === 'image' ? 'image' : 'file',
          file_url: uploadData.url,
          file_name: uploadData.name,
          file_size: uploadData.size,
          file_type: uploadData.type,
        }),
      })
    } catch { setError('파일 업로드 실패') }
    finally { setUploading(false); e.target.value = '' }
  }

  // 이미지 붙여넣기
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items || !selectedRoom) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (!blob) continue
        setUploading(true)
        const ext = blob.type.split('/')[1] || 'png'
        const file = new File([blob], `clipboard_${Date.now()}.${ext}`, { type: blob.type })
        try {
          const uploadData = await uploadAdminChatFile(file, selectedRoom.id)
          if (uploadData) {
            await fetch('/api/chat/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                room_id: selectedRoom.id,
                content: file.name,
                message_type: 'image',
                file_url: uploadData.url,
                file_name: uploadData.name,
                file_size: uploadData.size,
                file_type: uploadData.type,
              }),
            })
          }
        } catch { /* ignore */ }
        finally { setUploading(false) }
        break
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // 방 닫기
  const closeRoom = async () => {
    if (!selectedRoom) return
    await fetch('/api/chat/rooms', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: selectedRoom.id, status: 'closed' }),
    })
    setSelectedRoom(null)
    loadRooms()
  }

  // 필터링
  const filteredRooms = rooms.filter((r) => {
    if (filter === 'unread' && r.admin_unread_count === 0) return false
    if (filter === 'member' && r.room_type !== 'member') return false
    if (filter === 'guest' && r.room_type !== 'guest') return false
    if (search) {
      const name = r.room_type === 'member'
        ? (r.profiles?.name || r.profiles?.email || '')
        : (r.guest_name || '')
      return name.toLowerCase().includes(search.toLowerCase())
    }
    return true
  })

  const getRoomName = (r: ChatRoom) =>
    r.room_type === 'member'
      ? (r.profiles?.name || r.profiles?.email || '회원')
      : (r.guest_name || '비회원')

  const totalUnread = rooms.reduce((s, r) => s + r.admin_unread_count, 0)

  // 삭제 처리
  const handleDelete = async (mode: 'hide' | 'full') => {
    if (!deleteTarget) return
    try {
      await fetch(`/api/chat/rooms?id=${deleteTarget.id}&mode=${mode}`, { method: 'DELETE' })
      setDeleteTarget(null)
      if (selectedRoom?.id === deleteTarget.id) {
        setSelectedRoom(null)
        setMessages([])
      }
      loadRooms()
    } catch {
      setError('삭제에 실패했습니다')
    }
  }

  // 메시지 렌더
  const renderMessage = (msg: ChatMessage) => {
    const isAdmin = msg.sender_type === 'admin'
    const isSystem = msg.sender_type === 'system'
    const isPayment = msg.message_type === 'payment_request'

    if (isSystem) {
      return (
        <div key={msg.id} className="flex justify-center my-2">
          <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">{msg.content}</span>
        </div>
      )
    }

    if (isPayment && msg.metadata) {
      const meta = msg.metadata as { title: string; amount: number; status: string }
      return (
        <div key={msg.id} className="flex justify-center my-3">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-[320px] w-full">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-blue-700" />
              <span className="text-xs font-semibold text-blue-800">결제 요청</span>
              <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full ${
                meta.status === 'pending' ? 'bg-yellow-100 text-yellow-700'
                : meta.status === 'paid' ? 'bg-blue-100 text-blue-800'
                : 'bg-red-100 text-red-600'
              }`}>
                {meta.status === 'pending' ? '대기' : meta.status === 'paid' ? '완료' : '취소'}
              </span>
            </div>
            <p className="font-medium text-sm">{meta.title}</p>
            <p className="text-lg font-bold text-blue-800 mt-1">{formatAmount(meta.amount)}</p>
            <p className="text-[10px] text-muted-foreground mt-2">{formatFullTime(msg.created_at)}</p>
          </div>
        </div>
      )
    }

    return (
      <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className="max-w-[70%]">
          {!isAdmin && (
            <p className="text-[10px] text-muted-foreground mb-0.5 ml-1">
              {msg.sender_type === 'user' ? '회원' : msg.sender_type === 'guest' ? '비회원' : ''}
            </p>
          )}
          <div className={`px-3 py-2 rounded-2xl text-sm break-words ${
            isAdmin ? 'bg-blue-700 text-white rounded-br-md' : 'bg-muted/70 text-foreground rounded-bl-md'
          }`}>
            {(msg.message_type === 'image' && msg.file_url) ? (
              <AdminChatImage msg={msg} />
            ) : (msg.message_type === 'file' && msg.file_url) ? (
              <AdminChatFile msg={msg} isAdmin={isAdmin} />
            ) : (
              <p className="whitespace-pre-wrap">{msg.content}</p>
            )}
          </div>
          <p className={`text-[10px] text-muted-foreground mt-0.5 ${isAdmin ? 'text-right mr-1' : 'ml-1'}`}>
            {formatFullTime(msg.created_at)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">채팅 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            고객 문의 {rooms.length}건{totalUnread > 0 && ` (읽지 않음 ${totalUnread})`}
          </p>
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[500px]">
        {/* 좌측: 채팅방 목록 */}
        <div className="w-80 shrink-0 border border-border/50 rounded-xl bg-card flex flex-col overflow-hidden">
          {/* 검색 */}
          <div className="p-3 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="검색..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-border/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              />
            </div>
            <div className="flex gap-1 mt-2">
              {(['all', 'unread', 'member', 'guest'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                    filter === f ? 'bg-blue-700 text-white' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {f === 'all' ? '전체' : f === 'unread' ? '읽지않음' : f === 'member' ? '회원' : '비회원'}
                </button>
              ))}
            </div>
          </div>

          {/* 목록 */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">채팅이 없습니다</div>
            ) : (
              filteredRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => selectRoom(room)}
                  className={`group relative px-4 py-3 border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer ${
                    selectedRoom?.id === room.id ? 'bg-muted/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                        room.room_type === 'member'
                          ? 'bg-blue-50 text-blue-800'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {room.room_type === 'member' ? <User className="w-3.5 h-3.5" /> : 'G'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{getRoomName(room)}</p>
                        <p className="text-xs text-muted-foreground truncate">{room.last_message || '새 대화'}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2 flex items-center gap-2">
                      <div className="flex flex-col items-end">
                        <p className="text-[10px] text-muted-foreground">{formatTime(room.last_message_at)}</p>
                        {room.admin_unread_count > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-blue-700 text-white rounded-full mt-0.5">
                            {room.admin_unread_count}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(room) }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 cursor-pointer transition-opacity"
                        title="채팅방 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 우측: 대화 영역 */}
        <div className="flex-1 border border-border/50 rounded-xl bg-card flex flex-col overflow-hidden">
          {!selectedRoom ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">채팅을 선택하세요</p>
              </div>
            </div>
          ) : (
            <>
              {/* 대화 헤더 */}
              <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowMemberModal(true)}
                    className="flex items-center gap-2 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      selectedRoom.room_type === 'member'
                        ? 'bg-blue-50 text-blue-800'
                        : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {selectedRoom.room_type === 'member' ? <User className="w-3.5 h-3.5" /> : 'G'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{getRoomName(selectedRoom)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {selectedRoom.room_type === 'member' ? '회원' : '비회원'}
                        {selectedRoom.status === 'closed' && ' (종료)'}
                      </p>
                    </div>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {selectedRoom.room_type === 'member' && selectedRoom.user_id && selectedRoom.status === 'open' && (
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-800 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" /> 결제요청
                    </button>
                  )}
                  {selectedRoom.status === 'open' && (
                    <button
                      onClick={closeRoom}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" /> 종료
                    </button>
                  )}
                </div>
              </div>

              {/* 메시지 영역 */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">대화 내용이 없습니다</div>
                ) : (
                  messages.map(renderMessage)
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 에러 */}
              {error && (
                <div className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <p className="text-xs text-red-600 flex-1">{error}</p>
                  <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 cursor-pointer"><X className="w-3 h-3" /></button>
                </div>
              )}

              {/* 입력 */}
              {selectedRoom.status === 'open' ? (
                <div className="border-t border-border/50 px-4 py-3 shrink-0">
                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="text-muted-foreground hover:text-foreground p-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                      title="파일 첨부"
                    >
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                    </button>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onPaste={handlePaste}
                      placeholder="메시지를 입력하세요..."
                      rows={1}
                      className="flex-1 resize-none border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 max-h-20"
                      style={{ minHeight: '36px' }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || sending}
                      className="text-blue-700 hover:text-blue-800 p-1.5 shrink-0 cursor-pointer disabled:opacity-30"
                    >
                      {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-border/50 px-4 py-3 text-center text-sm text-muted-foreground">
                  종료된 대화입니다
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 모달 */}
      {showMemberModal && selectedRoom && (
        <MemberModal room={selectedRoom} onClose={() => setShowMemberModal(false)} />
      )}
      {showPaymentModal && selectedRoom && selectedRoom.user_id && (
        <PaymentRequestModal
          roomId={selectedRoom.id}
          userId={selectedRoom.user_id}
          onClose={() => setShowPaymentModal(false)}
          onSent={() => loadMessages(selectedRoom.id)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          roomName={getRoomName(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
