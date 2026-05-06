import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

type HelpfulRequest = {
  reviewId?: unknown
  helpful?: unknown
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    },
  )

  const { data: { user }, error: authError } = await authClient.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as HelpfulRequest | null
  const reviewId = Number(body?.reviewId)
  const helpful = body?.helpful
  if (!Number.isInteger(reviewId) || reviewId <= 0 || typeof helpful !== 'boolean') {
    return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 })
  }

  const service = serviceClient()
  const { data: review, error: reviewError } = await service
    .from('reviews')
    .select('id, helpful_count, is_published')
    .eq('id', reviewId)
    .maybeSingle()

  if (reviewError) {
    return NextResponse.json({ ok: false, error: reviewError.message }, { status: 500 })
  }
  if (!review || review.is_published !== true) {
    return NextResponse.json({ ok: false, error: 'review_not_found' }, { status: 404 })
  }

  if (helpful) {
    const { error: insertError } = await service
      .from('review_helpful')
      .insert({ user_id: user.id, review_id: reviewId })

    if (insertError && insertError.code !== '23505') {
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 })
    }
    if (!insertError) {
      const { error: rpcError } = await service.rpc('increment_helpful', { rid: reviewId })
      if (rpcError) return NextResponse.json({ ok: false, error: rpcError.message }, { status: 500 })
    }
  } else {
    const { data: deleted, error: deleteError } = await service
      .from('review_helpful')
      .delete()
      .eq('user_id', user.id)
      .eq('review_id', reviewId)
      .select('id')

    if (deleteError) {
      return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 })
    }
    if ((deleted ?? []).length > 0) {
      const { error: rpcError } = await service.rpc('decrement_helpful', { rid: reviewId })
      if (rpcError) return NextResponse.json({ ok: false, error: rpcError.message }, { status: 500 })
    }
  }

  const { data: updated } = await service
    .from('reviews')
    .select('helpful_count')
    .eq('id', reviewId)
    .maybeSingle()

  return NextResponse.json({
    ok: true,
    helpful,
    helpfulCount: updated?.helpful_count ?? review.helpful_count ?? 0,
  })
}
