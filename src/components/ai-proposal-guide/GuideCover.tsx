import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import {
  AI_PROPOSAL_GUIDE_BASE_PATH,
  type AiProposalCoverTheme,
  type AiProposalGuideStep,
} from '@/lib/ai-proposal-guide'

function getThemeClasses(theme: AiProposalCoverTheme): string {
  switch (theme) {
    case 'blueprint':
      return 'bg-blue-800 text-white [--accent:#B7D7FF]'
    case 'copper':
      return 'bg-[#7B3F2A] text-white [--accent:#FFD4A8]'
    case 'mint':
      return 'bg-[#D9F4E8] text-zinc-950 [--accent:#047857]'
    case 'rose':
      return 'bg-[#F7D5DE] text-zinc-950 [--accent:#BE123C]'
    case 'sand':
      return 'bg-[#EFE0C7] text-zinc-950 [--accent:#8B5E34]'
    case 'violet':
      return 'bg-[#40335F] text-white [--accent:#E7D7FF]'
    case 'graphite':
      return 'bg-[#30363A] text-white [--accent:#C9F27A]'
    case 'ink':
    default:
      return 'bg-zinc-950 text-white [--accent:#F5C76B]'
  }
}

export function GuideCover({
  guide,
  compact = false,
  priority = false,
}: {
  guide: AiProposalGuideStep
  compact?: boolean
  priority?: boolean
}) {
  const hasCoverImage = Boolean(guide.coverImageUrl)

  return (
    <div
      className={`relative isolate flex aspect-[3/4] min-h-0 w-full overflow-hidden border border-black/10 shadow-[0_22px_50px_-35px_rgba(15,23,42,0.5)] ${getThemeClasses(guide.coverTheme)}`}
    >
      {hasCoverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={guide.coverImageUrl}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      {!hasCoverImage ? (
        <>
          <div className="absolute inset-x-0 top-0 h-1 bg-[var(--accent)]" />
          <div className="absolute -right-10 top-12 h-28 w-28 rounded-full border border-[var(--accent)]/45" />
          <div className="absolute bottom-7 left-5 h-20 w-20 rounded-full border border-[var(--accent)]/35" />
        </>
      ) : null}
      <div className={`relative flex h-full w-full flex-col justify-between p-5 ${compact ? 'p-4' : 'md:p-6'}`}>
        <div>
          <div
            className={`mb-5 inline-flex h-8 min-w-8 items-center justify-center border px-2 text-xs font-bold ${hasCoverImage ? 'border-white/25 bg-black/25 text-white backdrop-blur-sm' : 'border-current/25 bg-white/10'}`}
          >
            {String(guide.step).padStart(2, '0')}
          </div>
          {!hasCoverImage ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              AI Proposal Guide
            </p>
          ) : null}
        </div>
        {!hasCoverImage ? (
          <div>
            <h3 className={`${compact ? 'text-xl' : 'text-2xl md:text-3xl'} break-words font-black leading-tight tracking-normal`}>
              {guide.coverTitle || guide.title}
            </h3>
            <p className="mt-4 break-words border-t border-current/20 pt-3 text-xs font-semibold leading-5 opacity-80">
              {guide.coverSubtitle || guide.primaryKeyword}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function GuideCoverLink({ guide }: { guide: AiProposalGuideStep }) {
  return (
    <Link
      href={`${AI_PROPOSAL_GUIDE_BASE_PATH}/${guide.slug}`}
      className="group block min-w-0"
    >
      <GuideCover guide={guide} compact />
      <div className="mt-3">
        <p className="line-clamp-2 break-words text-sm font-bold leading-6 text-zinc-950 group-hover:text-blue-700">
          {guide.title}
        </p>
        <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>{guide.primaryKeyword}</span>
          <span>{guide.readingMinutes}분</span>
        </div>
      </div>
    </Link>
  )
}

export function EditorialArticleLink({ guide }: { guide: AiProposalGuideStep }) {
  return (
    <Link
      href={`${AI_PROPOSAL_GUIDE_BASE_PATH}/${guide.slug}`}
      className="group grid min-w-0 grid-cols-[74px_1fr] gap-4 border-t border-slate-200 py-4"
    >
      <GuideCover guide={guide} compact />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-blue-700">{String(guide.step).padStart(2, '0')} · {guide.primaryKeyword}</p>
        <h3 className="mt-1 break-words text-base font-bold leading-6 text-zinc-950 group-hover:text-blue-700">
          {guide.title}
        </h3>
        <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-slate-600">{guide.description}</p>
        <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
          {guide.primaryKeyword} 읽기
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  )
}
