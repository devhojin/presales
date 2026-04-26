#!/usr/bin/env python3
"""
NAS news.db (SQLite) → morning-brief.news_items (Supabase) 이관.

이관 목적: cross-day dedup 연속성. 모닝브리프가 어제 보낸 뉴스를 다시 안 보내려면
NAS 가 누적해온 url_hash 가 필요하다.

실행:
  python3 scripts/migrate-news-db.py

원본:  morning-brief/_legacy/news-archive/news.db
대상:  morning-brief Supabase ynvirceyybekzyqbzbxz public.news_items
"""
import os
import sys
import json
import sqlite3
import urllib.request
import urllib.error
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "_legacy" / "news-archive" / "news.db"
SUPABASE_URL = os.environ.get("MORNING_BRIEF_SUPABASE_URL", "https://ynvirceyybekzyqbzbxz.supabase.co").rstrip("/")
SERVICE_KEY = os.environ.get("MORNING_BRIEF_SUPABASE_SERVICE_KEY", "")

if not SERVICE_KEY:
    print("환경변수 MORNING_BRIEF_SUPABASE_SERVICE_KEY 필요", file=sys.stderr)
    sys.exit(1)

if not DB.exists():
    print(f"news.db 없음: {DB}", file=sys.stderr)
    sys.exit(1)


def post_batch(rows):
    body = json.dumps(rows).encode("utf-8")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/news_items?on_conflict=url_hash",
        data=body,
        method="POST",
        headers={
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=ignore-duplicates,return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode('utf-8','replace')[:500]}", file=sys.stderr)
        raise


def main():
    conn = sqlite3.connect(str(DB))
    cur = conn.execute(
        "SELECT url, url_hash, title, source, category, pub_date, first_seen_at "
        "FROM news ORDER BY first_seen_at"
    )
    rows = []
    for r in cur.fetchall():
        url, url_hash, title, source, category, pub_date, first_seen_at = r
        rows.append({
            "url": url,
            "url_hash": url_hash,
            "title": title,
            "source_media": source,
            "category": category or "기타",
            "pub_date": None,  # 원본 pub_date는 RFC822 문자열이라 일단 null
            "collected_at": first_seen_at + "+09:00" if first_seen_at and "T" in first_seen_at else None,
            "raw": {"legacy_pub_date": pub_date, "imported_from": "nas-news.db"},
        })
    conn.close()

    print(f"총 {len(rows)}건 이관 시작")
    BATCH = 100
    sent = 0
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        post_batch(chunk)
        sent += len(chunk)
        print(f"  {sent}/{len(rows)}")
    print(f"완료: {sent}건")


if __name__ == "__main__":
    main()
