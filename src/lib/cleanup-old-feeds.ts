import { createClient } from '@supabase/supabase-js'

/**
 * IT피드 3주 자동 삭제
 * - community_posts 중 RSS 수집 건(source != 'manual')만 대상
 * - 수동 등록(source='manual')은 보존
 * - feed_bookmarks 는 post_id 에 FK 없고 bookmarks-snapshot-migration 으로 스냅샷 저장됨
 *   → 포스트 삭제해도 사용자 즐겨찾기는 스냅샷으로 유지
 * - 고아 feed_reads 는 함께 정리 (무한 증가 방지)
 */
export async function cleanupOldFeeds(retentionDays = 21): Promise<{
  deletedPosts: number
  deletedReads: number
  cutoff: string
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()

  // ① 삭제 대상 post_id 수집 (count 확보 + 뒤이은 reads 정리에 사용)
  const { data: oldPosts } = await supabase
    .from('community_posts')
    .select('id')
    .lt('created_at', cutoffDate)
    .neq('source', 'manual')
    .limit(100000)

  const oldIds = (oldPosts || []).map((p: { id: string }) => p.id)
  if (oldIds.length === 0) {
    return { deletedPosts: 0, deletedReads: 0, cutoff: cutoffDate }
  }

  // 대량 in() 배열은 URL 길이 한계에 걸릴 수 있어 500개씩 청크로 삭제
  const chunk = <T>(arr: T[], size: number): T[][] => {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
  }

  // ② 포스트 삭제 (청크)
  let postsDeleted = 0
  for (const ids of chunk(oldIds, 500)) {
    const { error } = await supabase.from('community_posts').delete().in('id', ids)
    if (error) throw new Error(`community_posts 삭제 실패: ${error.message}`)
    postsDeleted += ids.length
  }

  // ③ 고아 feed_reads 정리 (청크)
  // 북마크는 스냅샷 보존이 설계이므로 건드리지 않음
  let readsDeleted = 0
  for (const ids of chunk(oldIds, 500)) {
    const { error, data } = await supabase
      .from('feed_reads')
      .delete()
      .in('post_id', ids)
      .select('post_id')
    if (error) throw new Error(`feed_reads 정리 실패: ${error.message}`)
    readsDeleted += data?.length || 0
  }

  return {
    deletedPosts: postsDeleted,
    deletedReads: readsDeleted,
    cutoff: cutoffDate,
  }
}
