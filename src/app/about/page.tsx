import { Badge } from '@/components/ui/badge'

const team = [
  {
    name: '채호진',
    role: '대표 / 프리세일즈 디렉터',
    career: ['前 삼성SDS 사업기획팀', '前 카카오엔터프라이즈 BD', '한양대 경영학 MBA'],
    expertise: ['프리세일즈', '사업기획', 'BD'],
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300&h=300',
  },
  {
    name: '박지영',
    role: '공공조달 / 제안서 리드',
    career: ['前 LG CNS 공공사업부', '前 한국정보화진흥원 평가위원', '이화여대 행정학과'],
    expertise: ['공공조달', '기술제안서', '조달전략'],
    image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=300&h=300',
  },
  {
    name: '최민호',
    role: '공공사업 / 정부과제 시니어',
    career: ['前 KISTI 기술사업화팀', '前 정보통신산업진흥원 PM', '충남대 컴퓨터공학과'],
    expertise: ['정부R&D', '공공사업', '기술사업화'],
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=300&h=300',
  },
]

const timeline = [
  { year: '2023', event: '사업 기획 착수' },
  { year: '2024', event: '법인 설립 (AMARANS Partners)' },
  { year: '2025', event: '베타 오픈 + 템플릿 스토어 런칭' },
]

export default function AboutPage() {
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
        {[
          {
            title: 'Mission',
            desc: '공공조달 시장의 진입 장벽을 낮추고, 중소기업이 공정하게 경쟁할 수 있는 환경을 만듭니다.',
          },
          {
            title: 'Vision',
            desc: '대한민국 No.1 공공조달 제안서 플랫폼으로, 모든 기업이 실력으로 평가받는 시장을 지향합니다.',
          },
          {
            title: 'Value',
            desc: '실전 경험 기반의 콘텐츠, 투명한 가격 정책, 고객의 수주 성공이 우리의 성공입니다.',
          },
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
          {team.map((member) => (
            <div key={member.name} className="border border-border rounded-xl overflow-hidden">
              <div className="aspect-square bg-muted">
                <img
                  src={member.image}
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
          {timeline.map((item) => (
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
