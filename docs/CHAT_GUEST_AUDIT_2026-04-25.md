# Chat Guest Audit - 2026-04-25

## Scope

- Local dev server: `http://localhost:3000`
- Focus: guest inquiry flow, room creation, message send, room lookup, admin visibility, access control

## Scenarios Run

1. Guest room creation
   - `POST /api/chat/rooms` with a fresh `guest_id`
2. Guest message send
   - `POST /api/chat/messages` with `room_id + guest_id + content`
3. Guest message reload
   - `POST /api/chat/guest`
4. Guest email save
   - `PATCH /api/chat/rooms`
5. Guest read mark
   - `POST /api/chat/read`
6. Invalid guest access
   - `POST /api/chat/read` with a different `guest_id`
7. Admin chat UI visibility
   - `GET /admin/chat` in the in-app browser

## Verified OK

- Guest room can be created successfully.
- Guest can send a text message successfully.
- Guest can reload the same room and read its messages.
- Guest can save a notification email successfully.
- Guest can mark admin messages as read.
- A different `guest_id` is correctly blocked with `403`.
- Guest rooms and messages appear in the admin chat UI.

## Findings

### 1. Empty guest rooms are created as soon as the widget opens

- `src/components/chat/ChatWidget.tsx:173-220`
  - The widget calls `initRoom()` immediately when the widget is opened.
  - For guests, if there is no existing room, it creates one before the first message is sent.
- `src/app/api/chat/rooms/route.ts:160-168`
  - New guest rooms are inserted with `admin_unread_count: 1` even though no message exists yet.

Observed result:

- Fresh room `70648539-6963-4c1d-9680-9ca53e879e19`
- `last_message: null`
- `admin_unread_count: 1`
- Admin chat UI showed `비회원0007 / 새 대화 / unread 1` without any actual inquiry text.

Impact:

- Simply opening the widget pollutes the admin queue.
- The admin unread count is inflated by non-conversations.

### 2. First real guest message is counted as unread `2`, not `1`

- `src/app/api/chat/messages/route.ts:181-199`
  - Message send logic reads the current unread count and increments it by `+1`.
  - Because room creation already seeded `admin_unread_count: 1`, the first real guest message becomes `2`.

Observed result:

- Fresh guest room `923b7246-0f0f-47cf-a329-105fb4b5cead`
- After exactly one guest message:
  - `last_message: "비회원 1메시지 검증 1777103458156"`
  - `admin_unread_count: 2`

Impact:

- Admin badge counts are wrong from the first customer message.
- Queue urgency is overstated.

## Conclusion

- Core guest chat flow is operational.
- However, the current guest flow has a real logic defect around room creation and unread counting.
- Operationally, this is not a transport failure but an admin-queue integrity bug.
