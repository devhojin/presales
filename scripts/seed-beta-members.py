#!/usr/bin/env python3
"""
프리세일즈 베타테스트 27명 회원 시드 스크립트.

1. Supabase Auth Admin API 로 auth.users 생성
2. profiles 업데이트 (name, phone, company)
3. orders + order_items 생성
4. reviews 생성 (reviewer_name 포함)
5. 공고/피드 즐겨찾기 생성
6. brief_subscribers 추가
7. chat_rooms + chat_messages 생성
8. consulting_requests 생성 (user_id 연결)
9. download_logs 생성
10. user_coupons 발급 + 사용 처리

실행: python3 scripts/seed-beta-members.py
환경변수: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request
import urllib.error
import random
import secrets
from datetime import datetime, timedelta, date
from pathlib import Path

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
DEFAULT_PASSWORD = "Test123!"

if not SUPABASE_URL or not SERVICE_KEY:
    # Try reading from .env.local
    env_path = Path(__file__).parent.parent / ".env.local"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            v = v.strip().strip('"').strip("'")
            if k.strip() == "NEXT_PUBLIC_SUPABASE_URL":
                SUPABASE_URL = v.rstrip("/")
            elif k.strip() == "SUPABASE_SERVICE_ROLE_KEY":
                SERVICE_KEY = v

assert SUPABASE_URL and SERVICE_KEY, "SUPABASE_URL and SERVICE_ROLE_KEY required"

# Windows cp949 encoding fix
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass


def _headers():
    return {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _post(path: str, data: dict | list, method: str = "POST"):
    url = f"{SUPABASE_URL}{path}"
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, method=method, headers=_headers())
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        print(f"  HTTP {e.code}: {err[:300]}", file=sys.stderr)
        return None


def _get(path: str):
    url = f"{SUPABASE_URL}{path}"
    req = urllib.request.Request(url, method="GET", headers=_headers())
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        print(f"  GET HTTP {e.code}: {err[:300]}", file=sys.stderr)
        return None


def create_auth_user(email: str, password: str = DEFAULT_PASSWORD) -> str | None:
    """Supabase Auth Admin API 로 유저 생성. 이미 있으면 조회."""
    result = _post("/auth/v1/admin/users", {
        "email": email,
        "password": password,
        "email_confirm": True,
    })
    if result and result.get("id"):
        return result["id"]
    # 이미 있을 수 있음 — 조회
    users = _get(f"/auth/v1/admin/users?page=1&per_page=1000")
    if users and isinstance(users, dict):
        for u in users.get("users", []):
            if u.get("email") == email:
                return u["id"]
    return None


def rest_post(table: str, data: dict | list):
    return _post(f"/rest/v1/{table}", data)


def rest_get(table: str, query: str = ""):
    return _get(f"/rest/v1/{table}?{query}")


def random_date(days_ago_min: int, days_ago_max: int) -> str:
    d = datetime.now() - timedelta(days=random.randint(days_ago_min, days_ago_max))
    return d.isoformat(timespec="seconds")


def main():
    seed_file = Path(__file__).parent / "seed-members.json"
    members = json.loads(seed_file.read_text(encoding="utf-8"))
    print(f"=== {len(members)} 명 시드 시작 ===")

    # 쿠폰 ID 조회
    coupons_raw = rest_get("coupons", "select=id,code&is_active=eq.true")
    coupon_map = {c["code"]: c["id"] for c in (coupons_raw or [])}
    print(f"쿠폰: {coupon_map}")

    # 공고 ID 목록 (즐겨찾기용)
    anns_raw = rest_get("announcements", "select=id&is_published=eq.true&limit=50")
    ann_ids = [a["id"] for a in (anns_raw or [])]

    # 피드 ID 목록 (즐겨찾기용) — community_posts
    feeds_raw = rest_get("community_posts", "select=id&is_published=eq.true&limit=50")
    feed_ids = [f["id"] for f in (feeds_raw or [])]

    created = 0
    for i, m in enumerate(members):
        name = m["name"]
        email = m["email"]
        print(f"\n[{i+1}/{len(members)}] {name} ({email}) — {m['tier']}")

        # 1. auth.users 생성
        user_id = create_auth_user(email)
        if not user_id:
            print(f"  ❌ 유저 생성 실패: {email}")
            continue
        print(f"  ✅ user_id: {user_id[:12]}...")

        # 2. profiles 업데이트 (PATCH)
        try:
            url = f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}"
            req = urllib.request.Request(url, method="PATCH",
                data=json.dumps({
                    "name": name,
                    "phone": m.get("phone"),
                    "company": m.get("company"),
                    "role": m.get("role", "user"),
                }).encode("utf-8"),
                headers=_headers())
            urllib.request.urlopen(req, timeout=10)
            print(f"  ✅ profile 업데이트")
        except Exception as e:
            print(f"  ⚠️ profile 업데이트 실패: {e}")

        # 3. orders + order_items
        orders_data = m.get("orders", [])
        if orders_data:
            # 주문 1~2개로 묶기
            order_groups = []
            if len(orders_data) <= 3:
                order_groups = [orders_data]
            else:
                mid = len(orders_data) // 2
                order_groups = [orders_data[:mid], orders_data[mid:]]

            for og in order_groups:
                total = sum(o["price"] for o in og)
                status = og[0].get("status", "paid")
                created_at = random_date(7, 60)
                order_res = rest_post("orders", {
                    "user_id": user_id,
                    "total_amount": total,
                    "status": status,
                    "payment_method": "card",
                    "paid_at": created_at if status == "paid" else None,
                    "created_at": created_at,
                })
                if order_res and len(order_res) > 0:
                    order_id = order_res[0]["id"]
                    items = [{"order_id": order_id, "product_id": o["product_id"], "price": o["price"]} for o in og]
                    rest_post("order_items", items)
                    print(f"  ✅ 주문 {order_id}: {len(og)}건 {total:,}원")

        # 4. reviews
        for rv in m.get("reviews", []):
            rest_post("reviews", {
                "user_id": user_id,
                "product_id": rv["product_id"],
                "rating": rv["rating"],
                "title": rv.get("title", ""),
                "content": rv["content"],
                "reviewer_name": name,
                "reviewer_email": email,
                "is_published": True,
                "is_verified_purchase": True,
                "helpful_count": random.randint(0, 8),
                "image_urls": [],
                "created_at": random_date(3, 30),
            })
        if m.get("reviews"):
            print(f"  ✅ 리뷰 {len(m['reviews'])}건")

        # 5. 공고 즐겨찾기
        ann_count = m.get("ann_bookmarks", 0)
        if ann_count > 0 and ann_ids:
            picks = random.sample(ann_ids, min(ann_count, len(ann_ids)))
            for aid in picks:
                rest_post("announcement_bookmarks", {
                    "user_id": user_id,
                    "announcement_id": aid,
                })
            print(f"  ✅ 공고 즐겨찾기 {len(picks)}건")

        # 6. 피드 즐겨찾기
        feed_count = m.get("feed_bookmarks", 0)
        if feed_count > 0 and feed_ids:
            picks = random.sample(feed_ids, min(feed_count, len(feed_ids)))
            for fid in picks:
                rest_post("feed_bookmarks", {
                    "user_id": user_id,
                    "feed_id": fid,
                })
            print(f"  ✅ 피드 즐겨찾기 {len(picks)}건")

        # 7. 모닝 브리프 구독
        if m.get("brief_subscribed"):
            token = secrets.token_urlsafe(16)
            rest_post("brief_subscribers", {
                "email": email,
                "name": name,
                "token": token,
                "status": "active",
                "source": "seed",
            })
            print(f"  ✅ 브리프 구독")

        # 8. 채팅
        chat_msgs = m.get("chat_messages", [])
        if chat_msgs:
            room_res = rest_post("chat_rooms", {
                "user_id": user_id,
                "room_type": "member",
                "status": "open",
                "last_message": chat_msgs[-1][:50],
                "last_message_at": random_date(1, 14),
                "admin_unread_count": len(chat_msgs),
            })
            if room_res and len(room_res) > 0:
                room_id = room_res[0]["id"]
                for ci, msg in enumerate(chat_msgs):
                    rest_post("chat_messages", {
                        "room_id": room_id,
                        "sender_id": user_id,
                        "sender_type": "user",
                        "message_type": "text",
                        "content": msg,
                        "created_at": random_date(1, 14),
                    })
                print(f"  ✅ 채팅 {len(chat_msgs)}건")

        # 9. 컨설팅
        consulting = m.get("consulting")
        if consulting:
            rest_post("consulting_requests", {
                "user_id": user_id,
                "name": name,
                "email": email,
                "phone": m.get("phone"),
                "company": m.get("company"),
                "package_type": consulting["package_type"],
                "message": consulting.get("message", "상담 요청합니다"),
                "status": consulting["status"],
                "created_at": random_date(3, 30),
            })
            print(f"  ✅ 컨설팅 ({consulting['package_type']}/{consulting['status']})")

        # 10. 다운로드 이력
        downloads = m.get("downloads", [])
        for pid in downloads:
            rest_post("download_logs", {
                "user_id": user_id,
                "product_id": pid,
                "file_name": f"product_{pid}.pptx",
                "downloaded_at": random_date(1, 30),
            })
        if downloads:
            print(f"  ✅ 다운로드 {len(downloads)}건")

        # 11. 쿠폰
        coupon_code = m.get("coupon_used")
        if coupon_code and coupon_code in coupon_map:
            cid = coupon_map[coupon_code]
            token = secrets.token_urlsafe(16)
            rest_post("user_coupons", {
                "user_id": user_id,
                "coupon_id": cid,
                "source": "seed",
                "used_at": random_date(3, 30),
            })
            print(f"  ✅ 쿠폰 {coupon_code} 사용")

        created += 1

    print(f"\n=== 완료: {created}/{len(members)} 명 ===")


if __name__ == "__main__":
    main()
