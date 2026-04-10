import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 차단할 파일 확장자 (보안 위험)
const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.vbs', '.vbe', '.js', '.jse', '.ws', '.wsf', '.wsc', '.wsh',
  '.ps1', '.ps2', '.psc1', '.psc2', '.reg', '.inf', '.lnk',
  '.dll', '.sys', '.drv', '.cpl',
]

// 허용 파일 최대 크기 (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024

export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function isAdmin(userId: string) {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  return data?.role === 'admin'
}

export function isFileBlocked(fileName: string): boolean {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'))
  return BLOCKED_EXTENSIONS.includes(ext)
}

export function getFileType(fileName: string): string {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'))
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']
  if (imageExts.includes(ext)) return 'image'
  return 'file'
}

export interface ChatRoom {
  id: string
  user_id: string | null
  guest_id: string | null
  guest_name: string | null
  room_type: 'member' | 'guest'
  status: 'open' | 'closed'
  last_message: string | null
  last_message_at: string
  user_unread_count: number
  admin_unread_count: number
  created_at: string
  updated_at: string
  // join
  profiles?: { name: string; email: string; phone: string | null; company: string | null } | null
}

export interface ChatMessage {
  id: string
  room_id: string
  sender_id: string
  sender_type: 'user' | 'guest' | 'admin' | 'system'
  message_type: 'text' | 'file' | 'image' | 'payment_request' | 'system'
  content: string | null
  file_url: string | null
  file_name: string | null
  file_size: number | null
  file_type: string | null
  metadata: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}

export interface ChatPaymentRequest {
  id: string
  room_id: string
  user_id: string
  admin_id: string
  title: string
  description: string | null
  amount: number
  status: 'pending' | 'paid' | 'cancelled'
  order_id: number | null
  message_id: string | null
  created_at: string
  paid_at: string | null
  cancelled_at: string | null
}
