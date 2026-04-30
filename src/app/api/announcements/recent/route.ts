import { createClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type AnnouncementRow = {
  id: string
  title: string
  organization: string | null
  source: string | null
  end_date: string | null
  status: string | null
  created_at: string | null
  updated_at: string | null
}

function siteBaseUrl(req: NextRequest): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).replace(/\/+$/, '')
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 8), 1), 20)
  const sinceHours = Math.min(Math.max(Number(searchParams.get('sinceHours') || 24), 1), 168)
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString()
  const today = new Date().toISOString().slice(0, 10)

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, organization, source, end_date, status, created_at, updated_at')
      .eq('is_published', true)
      .eq('status', 'active')
      .or(`end_date.gte.${today},end_date.is.null`)
      .or(`created_at.gte.${since},updated_at.gte.${since}`)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error) throw error

    const base = siteBaseUrl(req)
    const announcements = ((data ?? []) as AnnouncementRow[]).map((row) => ({
      id: row.id,
      title: row.title,
      organization: row.organization,
      source: row.source,
      end_date: row.end_date,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      url: `${base}/announcements/${row.id}`,
    }))

    return NextResponse.json(
      { ok: true, announcements, since, limit },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'recent_announcements_failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
