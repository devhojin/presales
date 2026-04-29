'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

type AgreementItemProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: ReactNode
  href?: string
  preview?: string
}

export function AgreementItem({
  checked,
  onCheckedChange,
  label,
  href,
  preview,
}: AgreementItemProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="w-4 h-4 rounded border border-border cursor-pointer accent-primary"
        />
        <span className="text-sm text-muted-foreground">
          {href ? (
            <Link href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors">
              {label}
            </Link>
          ) : (
            label
          )}
          {href ? '에 동의합니다 (필수)' : null}
        </span>
      </label>
      {preview && !checked && (
        <div className="ml-7 max-h-[10.5rem] overflow-y-auto rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-xs leading-6 text-muted-foreground">
          <p className="whitespace-pre-line">{preview}</p>
        </div>
      )}
    </div>
  )
}

export const TERMS_PREVIEW = `제1조 목적
본 약관은 AMARANS가 운영하는 PRESALES 웹사이트 및 관련 서비스를 이용함에 있어 회사와 이용자의 권리, 의무 및 책임사항, 서비스 이용조건과 절차를 정합니다.

제2조 서비스
회사는 공공조달 문서 스토어, 입찰 공고, IT피드, 모닝 브리프, 컨설팅, 채팅 상담, 구매 내역 및 다운로드 관리 기능을 제공합니다.

제3조 회원가입과 계정 관리
회원은 정확한 정보를 제공해야 하며, 비밀번호와 계정을 직접 관리해야 합니다. 회사는 보안을 위해 비밀번호 정책, 로그인 실패 제한, 세션 만료 등 보호 조치를 적용할 수 있습니다.

제4조 디지털 콘텐츠 이용
구매한 디지털 콘텐츠는 본인 또는 소속 조직의 내부 업무, 제안서 작성, 발표 준비 목적으로 사용할 수 있으며 무단 복제, 재판매, 공유, 배포는 금지됩니다.`

export const PRIVACY_PREVIEW = `제1조 처리 목적
회사는 회원 관리, 상품 제공, 결제와 정산, 상담과 고객지원, 콘텐츠 운영, 보안과 품질 개선을 위해 필요한 최소한의 개인정보를 처리합니다.

제2조 수집 항목
회원가입 시 이메일, 비밀번호 인증 정보, 이름, 회사명, 휴대전화번호, 약관 및 개인정보 처리방침 동의 일시를 수집할 수 있습니다.

제3조 보유 및 파기
개인정보는 목적 달성 또는 회원 탈퇴 시 지체 없이 삭제 또는 익명화합니다. 단, 전자상거래법 등 관계 법령에 따라 보존해야 하는 주문, 결제, 분쟁 대응 기록은 정해진 기간 동안 분리 보관 후 파기합니다.

제4조 국외 이전
서비스 제공에 필요한 해외 클라우드, 해외 SaaS, 해외 고객지원 인프라 사용 과정에서 암호화된 개인정보가 국외로 이전 또는 보관될 수 있으며, 이전 항목과 보유기간은 개인정보처리방침의 국외 이전 표에서 확인할 수 있습니다.`
