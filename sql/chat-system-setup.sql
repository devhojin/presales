-- ============================================
-- 채팅 시스템 (회원/비회원 ↔ 관리자)
-- 2026-04-10
-- ============================================

-- ① 채팅방
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- 회원이면 user_id, 비회원이면 null
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- 비회원 식별용 (브라우저 세션)
  guest_id TEXT,
  -- 비회원 표시명: 비회원0001, 비회원0002 ...
  guest_name TEXT,
  -- 'member' | 'guest'
  room_type TEXT NOT NULL DEFAULT 'guest' CHECK (room_type IN ('member', 'guest')),
  -- 'open' | 'closed'
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  -- 마지막 메시지 요약
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  -- 읽지 않은 수
  user_unread_count INT NOT NULL DEFAULT 0,
  admin_unread_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ② 채팅 메시지
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
  -- 보낸 사람: user_id(회원), guest_id(비회원), admin user_id(관리자)
  sender_id TEXT NOT NULL,
  -- 'user' | 'guest' | 'admin' | 'system'
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'guest', 'admin', 'system')),
  -- 'text' | 'file' | 'image' | 'payment_request' | 'system'
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'payment_request', 'system')),
  content TEXT,
  -- 파일 첨부 정보 (JSON)
  file_url TEXT,
  file_name TEXT,
  file_size INT,
  file_type TEXT,
  -- 결제요청 메타 (JSON)
  metadata JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ③ 채팅 결제요청
CREATE TABLE IF NOT EXISTS chat_payment_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  admin_id UUID REFERENCES auth.users(id) NOT NULL,
  -- 커스텀 상품 정보
  title TEXT NOT NULL,
  description TEXT,
  amount INT NOT NULL CHECK (amount > 0),
  -- 'pending' | 'paid' | 'cancelled'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  -- 결제 완료 시 주문 연결
  order_id INT,
  message_id UUID REFERENCES chat_messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_chat_rooms_user ON chat_rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_guest ON chat_rooms(guest_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_updated ON chat_rooms(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_payment_requests_room ON chat_payment_requests(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_payment_requests_user ON chat_payment_requests(user_id);

-- RLS 활성화
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_payment_requests ENABLE ROW LEVEL SECURITY;

-- RLS 정책: chat_rooms
-- 회원: 자기 방만 조회
CREATE POLICY "Members see own rooms" ON chat_rooms
  FOR SELECT USING (auth.uid() = user_id);

-- 관리자: 모든 방 조회/수정
CREATE POLICY "Admins manage all rooms" ON chat_rooms
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 비회원: service_role로만 접근 (API 경유)

-- RLS 정책: chat_messages
CREATE POLICY "Room participants see messages" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE chat_rooms.id = chat_messages.room_id
      AND (chat_rooms.user_id = auth.uid()
           OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

CREATE POLICY "Admins manage all messages" ON chat_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS 정책: chat_payment_requests
CREATE POLICY "Users see own payment requests" ON chat_payment_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins manage payment requests" ON chat_payment_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 비회원 번호 자동 생성 시퀀스
CREATE SEQUENCE IF NOT EXISTS guest_name_seq START 1;
