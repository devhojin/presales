'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase'

interface TeamMember {
  name: string
  role: string
  image_url: string
  career: string[]
  expertise: string[]
  sort_order: number
}

interface TimelineItem {
  year: string
  event: string
}

export default function AboutPage() {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [mission, setMission] = useState('')
  const [vision, setVision] = useState('')
  const [value, setValue] = useState('')
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    Promise.all([
      supabase.from('team_members').select('*').order('sort_order'),
      supabase.from('site_settings').select('key, value').in('key', [
        'mission',
        'vision',
        'value_statement',
        'timeline_2023',
        'timeline_2024',
        'timeline_2025',
      ]),
    ]).then(([teamRes, settingsRes]) => {
      if (teamRes.data) setTeam(teamRes.data)

      if (settingsRes.data) {
        const s = Object.fromEntries(
          settingsRes.data.map((r: { key: string; value: string }) => [r.key, r.value])
        )
        setMission(s.mission ?? '')
        setVision(s.vision ?? '')
        setValue(s.value_statement ?? '')

        const tl: TimelineItem[] = []
        if (s.timeline_2023) tl.push({ year: '2023', event: s.timeline_2023 })
        if (s.timeline_2024) tl.push({ year: '2024', event: s.timeline_2024 })
        if (s.timeline_2025) tl.push({ year: '2025', event: s.timeline_2025 })
        setTimeline(tl)
      }

      setLoading(false)
    })
  }, [])

  return (
    <div className="container mx-auto px-4 py-10">
      {/* Hero */}
      <div className="text-center mb-16">
        <Badge className="bg-blue-500/10 text-blue-700 border-blue-200 mb-4">
          팀 소개
        </Badge>
        <h1 className="text-2xl md:text-3xl font-bold mb-3">
          공공조달의 복잡함을 문서로 단순하게
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          나라장터·조달청 입찰의 실전 경험을 가진 전문가들이
          만든 공공조달 제안서 전문 플랫폼입니다.
        </p>
      </div>

      {/* Mission / Vision / Values */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-border rounded-xl p-6 space-y-3 animate-pulse">
                <div className="h-5 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-4/5" />
              </div>
            ))
          : [
              { title: 'Mission', desc: mission },
              { title: 'Vision', desc: vision },
              { title: 'Value', desc: value },
            ].map((item) => (
              <div key={item.title} className="border border-border rounded-xl p-6 space-y-3">
                <h3 className="text-lg font-bold text-primary">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
      </div>

      {/* Team */}
      <div className="mb-20">
        <h2 className="text-xl font-bold text-center mb-10">전문가 팀</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-border rounded-xl overflow-hidden animate-pulse">
                  <div className="aspect-square bg-muted" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 bg-muted rounded w-1/2" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="space-y-1">
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-4/5" />
                    </div>
                  </div>
                </div>
              ))
            : team.map((member) => (
                <div key={member.name} className="border border-border rounded-xl overflow-hidden">
                  <div className="aspect-square bg-muted">
                    <img
                      src={member.image_url}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="font-bold">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {member.career.map((c) => (
                        <li key={c}>• {c}</li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-1.5">
                      {member.expertise.map((e) => (
                        <Badge key={e} variant="outline" className="text-[10px]">
                          {e}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="max-w-md mx-auto">
        <h2 className="text-xl font-bold text-center mb-10">연혁</h2>
        <div className="space-y-6">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-16 h-5 bg-muted rounded" />
                  <div className="w-3 h-3 rounded-full bg-muted shrink-0" />
                  <div className="h-4 bg-muted rounded flex-1" />
                </div>
              ))
            : timeline.map((item) => (
                <div key={item.year} className="flex items-center gap-4">
                  <div className="w-16 text-right">
                    <span className="font-bold text-primary">{item.year}</span>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-primary shrink-0" />
                  <p className="text-sm">{item.event}</p>
                </div>
              ))}
        </div>
      </div>
    </div>
  )
}
