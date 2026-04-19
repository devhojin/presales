// 클라이언트/서버 양쪽에서 안전하게 import 가능한 채팅 상수.
// next/headers 를 쓰는 chat.ts 에서 constants 를 뺀 이유는 client component 에서 MAX_FILE_SIZE 를
// 직접 쓰기 때문 (admin/chat, ChatWidget).

export const MAX_FILE_SIZE = 1024 * 1024 * 1024 // 1GB
export const MAX_FILE_SIZE_LABEL = '1GB'
