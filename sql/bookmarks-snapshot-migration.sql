-- ============================================
-- 북마크 스냅샷화 (B 안) — 원본 삭제돼도 사용자 북마크 유지
-- 2026-04-14
-- ============================================
-- 배경: 관리자가 피드/공고 원본을 삭제해도 사용자가 북마크한 항목은 "나중에 다시 볼 것"이므로
--       북마크 시점의 title/content/url을 스냅샷으로 보존해야 한다.

-- ① feed_bookmarks에 스냅샷 컬럼 추가
ALTER TABLE feed_bookmarks
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS excerpt TEXT,
  ADD COLUMN IF NOT EXISTS url TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS source_name TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_at TIMESTAMPTZ DEFAULT NOW();

-- ② announcement_bookmarks에 스냅샷 컬럼 추가
ALTER TABLE announcement_bookmarks
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS excerpt TEXT,
  ADD COLUMN IF NOT EXISTS url TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS source_name TEXT,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS snapshot_at TIMESTAMPTZ DEFAULT NOW();

-- ③ 기존 북마크 데이터에 스냅샷 backfill (원본이 아직 있는 것들)
UPDATE feed_bookmarks fb
SET
  title = cp.title,
  excerpt = LEFT(COALESCE(cp.content, ''), 500),
  url = cp.external_url,
  source = cp.source,
  source_name = cp.source_name,
  snapshot_at = COALESCE(fb.snapshot_at, fb.created_at, NOW())
FROM community_posts cp
WHERE fb.post_id = cp.id
  AND fb.title IS NULL;

UPDATE announcement_bookmarks ab
SET
  title = a.title,
  excerpt = LEFT(COALESCE(a.description, ''), 500),
  url = a.source_url,
  source = a.source,
  source_name = a.source,
  end_date = a.end_date,
  snapshot_at = COALESCE(ab.snapshot_at, ab.created_at, NOW())
FROM announcements a
WHERE ab.announcement_id = a.id
  AND ab.title IS NULL;
