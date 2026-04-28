'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import {
  MessageCircle, X, Send, Paperclip, Loader2, FileText, Download,
  Image as ImageIcon, AlertTriangle, CreditCard, ChevronDown,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useChatWidgetStore, getOrCreateGuestId } from '@/stores/chat-store'
import type { ChatMessage } from '@/lib/chat'
import { MAX_FILE_SIZE, MAX_FILE_SIZE_LABEL } from '@/lib/chat-constants'
import { uploadFile } from '@/lib/storage-upload'
import { fetchSignedUrl } from '@/lib/storage-signed-url'
import { openKakaoChannelChat } from '@/lib/kakao-share'

// DB 에는 storage path 만 저장 → 렌더 시점에 서명 URL 재발급해서 표시
function useChatSignedUrl(storedValue: string | null | undefined, guestId: string | null) {
  const [signedFile, setSignedFile] = useState<{ storedValue: string; guestId: string | null; url: string | null } | null>(null)

  useEffect(() => {
    if (!storedValue) return
    let aborted = false
    fetchSignedUrl({ bucket: 'chat-files', storedValue, guestId }).then((signed) => {
      if (!aborted) setSignedFile({ storedValue, guestId, url: signed })
    })
    return () => { aborted = true }
  }, [storedValue, guestId])

  return storedValue && signedFile?.storedValue === storedValue && signedFile.guestId === guestId
    ? signedFile.url
    : null
}

function ChatImageMessage({ msg, guestId }: { msg: ChatMessage; guestId: string | null }) {
  const url = useChatSignedUrl(msg.file_url, guestId)
  if (!url) {
    return <span className="text-xs opacity-70">이미지 불러오는 중...</span>
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img src={url} alt={msg.file_name || '이미지'} className="max-w-full max-h-48 rounded-lg" />
    </a>
  )
}

function ChatFileMessage({ msg, isMe, guestId }: { msg: ChatMessage; isMe: boolean; guestId: string | null }) {
  const url = useChatSignedUrl(msg.file_url, guestId)
  const colorClass = isMe ? 'text-white/90 hover:text-white' : 'text-foreground hover:text-primary'
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

function isBlocked(name: string) {
  const ext = name.toLowerCase().slice(name.lastIndexOf('.'))
  return BLOCKED_EXTENSIONS.includes(ext)
}

type ChatUploadResult = {
  url: string
  name: string
  size: number
  type: string
  fileType: 'image' | 'file'
}

// 인증 사용자는 TUS 직접 업로드(≤1GB), 게스트는 서버 라우트로 fallback(~4MB)
async function uploadChatFile(
  file: File,
  roomId: string,
  guestId: string | null,
): Promise<ChatUploadResult | null> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const fileType: 'image' | 'file' = file.type.startsWith('image/') ? 'image' : 'file'

  if (session) {
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
    // DB 에는 storage 상대 path 만 저장. 표시 시점에 서명 URL 재발급.
    return {
      url: safeName,
      name: file.name,
      size: file.size,
      type: file.type,
      fileType,
    }
  }

  // 게스트 fallback — Vercel body size 한계로 사실상 ~4MB
  const formData = new FormData()
  formData.append('file', file)
  formData.append('room_id', roomId)
  if (guestId) formData.append('guest_id', guestId)
  const res = await fetch('/api/chat/files', { method: 'POST', body: formData })
  const data = await res.json()
  if (data.error) return null
  return {
    url: data.url,
    name: data.name,
    size: data.size,
    type: data.type,
    fileType: data.fileType,
  }
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

function formatAmount(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n) + '원'
}

export function ChatWidget() {
  const pathname = usePathname()
  const { isOpen, toggle, close, roomId, setRoomId } = useChatWidgetStore()

  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [guestId, setGuestId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roomStatus, setRoomStatus] = useState<string>('open')
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [guestEmail, setGuestEmail] = useState('')
  const [guestEmailSaved, setGuestEmailSaved] = useState(false)
  const [emailPromptDismissed, setEmailPromptDismissed] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const kakaoJavascriptKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY
  const kakaoChannelPublicId = process.env.NEXT_PUBLIC_KAKAO_CHANNEL_PUBLIC_ID
  const canUseKakaoChannel = Boolean(kakaoJavascriptKey && kakaoChannelPublicId)

  // 사용자 상태 확인
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) {
        setUser({ id: u.id, email: u.email })
      } else {
        setGuestId(getOrCreateGuestId())
      }
    })
  }, [])

  // 채팅방 초기화
  const initRoom = useCallback(async () => {
    if (roomId) return
    setLoading(true)
    try {
      if (user) {
        const res = await fetch('/api/chat/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'member' }),
        })
        const data = await res.json()
        if (data.room) {
          setRoomId(data.room.id)
          setRoomStatus(data.room.status)
        }
      } else if (guestId) {
        // 기존 방 확인
        const checkRes = await fetch(`/api/chat/guest?guest_id=${guestId}`)
        const checkData = await checkRes.json()
        if (checkData.room) {
          setRoomId(checkData.room.id)
          setRoomStatus(checkData.room.status)
        } else {
          // 새 방 생성
          const res = await fetch('/api/chat/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guest_id: guestId }),
          })
          const data = await res.json()
          if (data.room) {
            setRoomId(data.room.id)
            setRoomStatus(data.room.status)
          }
        }
      }
    } catch {
      setError('채팅 연결에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [user, guestId, roomId, setRoomId])

  // 위젯 열 때 방 초기화
  useEffect(() => {
    if (isOpen) initRoom()
  }, [isOpen, initRoom])

  // 외부에서 채팅 위젯 열기 (나의콘솔 등)
  useEffect(() => {
    const handler = () => { useChatWidgetStore.getState().open() }
    window.addEventListener('open-chat-widget', handler)
    return () => window.removeEventListener('open-chat-widget', handler)
  }, [])

  // 방 로드 시 게스트 이메일 복원 (서버에 저장돼 있으면 guestEmailSaved 로 표시)
  useEffect(() => {
    if (!roomId || user) return
    let aborted = false
    fetch(`/api/chat/guest?guest_id=${guestId}`)
      .then(r => r.json())
      .then(data => {
        if (aborted) return
        const existing = data?.room?.guest_email
        if (existing) {
          setGuestEmail(existing)
          setGuestEmailSaved(true)
        }
      })
      .catch(() => { /* 무시 */ })
    return () => { aborted = true }
  }, [roomId, user, guestId])

  async function saveGuestEmail() {
    if (!roomId || !guestId || !guestEmail.trim()) return
    const trimmed = guestEmail.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('올바른 이메일 형식이 아닙니다')
      return
    }
    try {
      const res = await fetch('/api/chat/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomId, guest_id: guestId, guest_email: trimmed }),
      })
      if (!res.ok) throw new Error('저장 실패')
      setGuestEmail(trimmed)
      setGuestEmailSaved(true)
      setError(null)
    } catch {
      setError('이메일 저장에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  // 초기 메시지 로드
  useEffect(() => {
    if (!roomId || !isOpen) return
    const loadMessages = async () => {
      if (user) {
        const res = await fetch(`/api/chat/messages?room_id=${roomId}`)
        const data = await res.json()
        if (data.messages) setMessages(data.messages)
      } else if (guestId) {
        const res = await fetch('/api/chat/guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_id: roomId, guest_id: guestId }),
        })
        const data = await res.json()
        if (data.messages) setMessages(data.messages)
      }
      // 읽음 처리
      fetch('/api/chat/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomId, guest_id: guestId }),
      })
    }
    loadMessages()
  }, [roomId, isOpen, user, guestId])

  // Realtime 구독: 새 메시지 실시간 수신
  useEffect(() => {
    if (!roomId || !isOpen) return

    const supabase = createClient()
    const channel = supabase
      .channel(`chat-messages-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
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
            body: JSON.stringify({ room_id: roomId, guest_id: guestId }),
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, isOpen, guestId])

  // 스크롤 관리
  useEffect(() => {
    if (!showScrollBtn) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, showScrollBtn])

  // 관리자 페이지에서는 채팅 위젯 숨김 (훅 호출 순서 보존 위해 렌더 직전에 처리)
  if (pathname?.startsWith('/admin')) return null

  const handleScroll = () => {
    const el = scrollContainerRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    setShowScrollBtn(!isNearBottom)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowScrollBtn(false)
  }

  // 메시지 전송
  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !roomId) return
    setSending(true)
    setInput('')

    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          content: text,
          guest_id: guestId,
        }),
      })
    } catch {
      setError('전송에 실패했습니다')
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  // 파일 업로드
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !roomId) return

    if (isBlocked(file.name)) {
      setError(`보안상 위험한 파일은 전송할 수 없습니다: ${file.name}`)
      e.target.value = ''
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`파일 크기는 ${MAX_FILE_SIZE_LABEL} 이하만 가능합니다`)
      e.target.value = ''
      return
    }

    setUploading(true)
    try {
      const uploadData = await uploadChatFile(file, roomId, guestId)
      if (!uploadData) {
        setError('파일 업로드에 실패했습니다')
        return
      }

      // 파일 메시지 전송
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          content: file.name,
          message_type: uploadData.fileType === 'image' ? 'image' : 'file',
          file_url: uploadData.url,
          file_name: uploadData.name,
          file_size: uploadData.size,
          file_type: uploadData.type,
          guest_id: guestId,
        }),
      })
    } catch {
      setError('파일 업로드에 실패했습니다')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // 이미지 붙여넣기
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items || !roomId) return

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (!blob) continue

        setUploading(true)
        const ext = blob.type.split('/')[1] || 'png'
        const file = new File([blob], `clipboard_${Date.now()}.${ext}`, { type: blob.type })

        try {
          const uploadData = await uploadChatFile(file, roomId, guestId)
          if (uploadData) {
            await fetch('/api/chat/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                room_id: roomId,
                content: file.name,
                message_type: 'image',
                file_url: uploadData.url,
                file_name: uploadData.name,
                file_size: uploadData.size,
                file_type: uploadData.type,
                guest_id: guestId,
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // 메시지 렌더
  const renderMessage = (msg: ChatMessage) => {
    // sender_id 가 현재 유저/게스트와 일치하면 내 메시지
    // (관리자 계정이 위젯에서 대화해도 자기 id 메시지는 오른쪽에 표시)
    const isMe = user
      ? msg.sender_id === user.id
      : msg.sender_id === guestId
    const isSystem = msg.sender_type === 'system'
    const isPayment = msg.message_type === 'payment_request'

    if (isSystem) {
      return (
        <div key={msg.id} className="flex justify-center my-2">
          <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
            {msg.content}
          </span>
        </div>
      )
    }

    if (isPayment && msg.metadata) {
      const meta = msg.metadata as { title: string; amount: number; status: string; payment_request_id: string }
      return (
        <div key={msg.id} className="flex justify-center my-3">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-[280px] w-full">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-blue-700" />
              <span className="text-xs font-semibold text-blue-800">결제 요청</span>
            </div>
            <p className="font-medium text-sm text-foreground">{meta.title}</p>
            <p className="text-lg font-bold text-blue-800 mt-1">{formatAmount(meta.amount)}</p>
            {meta.status === 'pending' && !isMe && (
              <button
                onClick={() => handlePayment(meta.payment_request_id, meta.amount, meta.title)}
                className="mt-3 w-full py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors cursor-pointer"
              >
                결제하기
              </button>
            )}
            {meta.status === 'paid' && (
              <div className="mt-2 text-xs text-blue-700 font-medium">결제 완료</div>
            )}
            {meta.status === 'cancelled' && (
              <div className="mt-2 text-xs text-red-500 font-medium">취소됨</div>
            )}
            <p className="text-[10px] text-muted-foreground mt-2">{formatTime(msg.created_at)}</p>
          </div>
        </div>
      )
    }

    return (
      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className={`max-w-[80%] ${isMe ? 'order-1' : ''}`}>
          {!isMe && (
            <p className="text-[10px] text-muted-foreground mb-0.5 ml-1">
              {msg.sender_type === 'admin' ? '상담원' : ''}
            </p>
          )}
          <div
            className={`px-3 py-2 rounded-2xl text-sm break-words ${
              isMe
                ? 'bg-blue-700 text-white rounded-br-md'
                : 'bg-muted/70 text-foreground rounded-bl-md'
            }`}
          >
            {(msg.message_type === 'image' && msg.file_url) ? (
              <ChatImageMessage msg={msg} guestId={guestId} />
            ) : (msg.message_type === 'file' && msg.file_url) ? (
              <ChatFileMessage msg={msg} isMe={isMe} guestId={guestId} />
            ) : (
              <p className="whitespace-pre-wrap">{msg.content}</p>
            )}
          </div>
          <p className={`text-[10px] text-muted-foreground mt-0.5 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
            {formatTime(msg.created_at)}
          </p>
        </div>
      </div>
    )
  }

  const handlePayment = (paymentRequestId: string, amount: number, title: string) => {
    const params = new URLSearchParams({
      chat_payment_id: paymentRequestId,
      amount: String(amount),
      description: title,
    })
    window.location.href = `/checkout?${params.toString()}`
  }

  const handleKakaoChannelChat = async () => {
    try {
      const result = await openKakaoChannelChat({
        javascriptKey: kakaoJavascriptKey,
        channelPublicId: kakaoChannelPublicId,
      })
      if (result !== 'opened') {
        setError('카카오톡 채널 설정이 필요합니다')
        toggle()
      }
    } catch {
      setError('카카오톡 상담을 열지 못했습니다. 채팅 문의로 남겨주세요.')
      toggle()
    }
  }

  // 플로팅 버튼 (닫혀있을 때)
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {canUseKakaoChannel && (
          <button
            onClick={() => { void handleKakaoChannelChat() }}
            className="w-14 h-14 bg-[#FEE500] hover:bg-[#F4D900] text-[#191919] rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
            title="카카오톡 상담"
            aria-label="카카오톡 상담"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        )}
        <button
          onClick={toggle}
          className="w-14 h-14 bg-blue-700 hover:bg-blue-800 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
          title="채팅 문의"
          aria-label="채팅 문의"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[380px] h-[100dvh] sm:h-[540px] sm:max-h-[calc(100dvh-6rem)] bg-background border border-border/60 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm">프리세일즈 상담</h3>
          <p className="text-[11px] text-blue-100 truncate">
            {user ? '회원 상담' : '비회원 문의'}
            {roomStatus === 'closed' && ' · 종료됨'}
            {roomId && ` · ID ${roomId.slice(0, 8)}`}
          </p>
        </div>
        <button onClick={close} className="text-white/80 hover:text-white transition-colors cursor-pointer ml-2 shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 비회원 이메일 수집 배너: 답변 알림용, 선택 사항 */}
      {!user && roomId && !guestEmailSaved && !emailPromptDismissed && (
        <div className="border-b border-border/60 bg-blue-50/60 px-3 py-2">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="text-[11px] text-blue-900 leading-snug">
              답변이 도착하면 이메일로 알려드려요. 창을 닫아두셔도 됩니다.
            </p>
            <button
              onClick={() => setEmailPromptDismissed(true)}
              className="text-blue-900/60 hover:text-blue-900 cursor-pointer shrink-0"
              title="나중에"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-1.5">
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="이메일 주소"
              className="flex-1 min-w-0 px-2 py-1.5 border border-border/60 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500/40"
            />
            <button
              onClick={saveGuestEmail}
              disabled={!guestEmail.trim()}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs rounded-md cursor-pointer shrink-0"
            >
              알림받기
            </button>
          </div>
        </div>
      )}
      {!user && guestEmailSaved && (
        <div className="border-b border-border/60 bg-green-50/60 px-3 py-1.5">
          <p className="text-[11px] text-green-800 leading-snug">
            답변 알림을 <strong>{guestEmail}</strong>로 보내드립니다.
          </p>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1 relative"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <MessageCircle className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">안녕하세요!</p>
            <p className="text-xs text-muted-foreground/70 mt-1">궁금한 점을 편하게 물어보세요.</p>
            <p className="text-[11px] text-muted-foreground/60 mt-3 leading-relaxed">
              많은 문의로 답변이 지연될 수 있습니다.<br />
              창을 닫아두셔도 답변이 오면{' '}
              {user ? '이메일과' : guestEmailSaved ? '이메일과' : '(이메일 등록 시)'}{' '}
              다시 열었을 때 확인하실 수 있습니다.
            </p>
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        <div ref={messagesEndRef} />

        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background border border-border rounded-full p-1.5 shadow-md cursor-pointer"
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <p className="text-xs text-red-600 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 cursor-pointer">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border/50 px-3 py-2 shrink-0">
        <div className="flex items-end gap-2">
          {/* File attach */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-muted-foreground hover:text-foreground p-1.5 shrink-0 cursor-pointer disabled:opacity-50"
            title="파일 첨부 (10MB 이하, .exe 등 실행파일 차단)"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="메시지를 입력하세요..."
            rows={1}
            className="flex-1 resize-none border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 max-h-20 bg-background"
            style={{ minHeight: '36px' }}
          />

          {/* Send */}
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="text-blue-700 hover:text-blue-800 p-1.5 shrink-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="전송"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/50 mt-1 text-center">
          이미지 복사+붙여넣기 가능 | 파일 첨부 10MB 이하
        </p>
      </div>
    </div>
  )
}
