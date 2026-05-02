import { createClient } from '@supabase/supabase-js'
import {
  AI_PROPOSAL_GUIDE_SETTING_KEY,
  DEFAULT_AI_PROPOSAL_GUIDE_CONTENT,
  getPublishedAiProposalGuideContent,
  parseAiProposalGuideContent,
  type AiProposalGuideContent,
} from '@/lib/ai-proposal-guide'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    },
  })
}

export async function getAiProposalGuideContent(): Promise<AiProposalGuideContent> {
  const supabase = getServiceClient()
  if (!supabase) return DEFAULT_AI_PROPOSAL_GUIDE_CONTENT

  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', AI_PROPOSAL_GUIDE_SETTING_KEY)
    .maybeSingle()

  if (error || !data?.value) return DEFAULT_AI_PROPOSAL_GUIDE_CONTENT
  return parseAiProposalGuideContent(data.value)
}

export async function getPublishedAiProposalGuideServerContent(): Promise<AiProposalGuideContent> {
  return getPublishedAiProposalGuideContent(await getAiProposalGuideContent())
}
