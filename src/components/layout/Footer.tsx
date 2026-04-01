'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const FALLBACK = {
  company_name: 'AMARANS Partners',
  ceo_name: '채호진',
  business_number: '확인 필요',
  commerce_number: '준비 중',
  address: '서울특별시 강남구 테헤란로 123',
  email: 'contact@presales.co.kr',
  copyright: '2025 AMARANS Partners. All rights reserved.',
}

export function Footer() {
  const [s, setS] = useState(FALLBACK)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('site_settings')
      .select('key, value')
      .in('key', Object.keys(FALLBACK))
      .then(({ data }) => {
        if (data && data.length > 0) {
          const map = Object.fromEntries(
            data.map((r: { key: string; value: string }) => [r.key, r.value])
          )
          setS((prev) => ({ ...prev, ...map }))
        }
      })
  }, [])

  return (
    <footer className="bg-muted/50 border-t border-border pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-md bg-[#0B1629] flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">PS</span>
              </div>
              <h3 className="text-xl font-bold text-primary">프리세일즈</h3>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mb-4">
              공공조달 제안서 전문 플랫폼.
              <br />
              나라장터·조달청 입찰에 최적화된 기술제안서, 가격제안서,
              발표PT 템플릿과 전문가 컨설팅을 제공합니다.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-primary mb-4">서비스</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link href="/store" className="hover:text-primary transition-colors">
                  템플릿 스토어
                </Link>
              </li>
              <li>
                <Link href="/consulting" className="hover:text-primary transition-colors">
                  전문가 컨설팅
                </Link>
              </li>
              <li>
                <Link href="/store" className="hover:text-primary transition-colors">
                  무료 입찰 가이드
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-primary mb-4">고객지원</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link href="/about" className="hover:text-primary transition-colors">
                  회사소개
                </Link>
              </li>
              <li>
                <button className="hover:text-primary transition-colors">
                  자주 묻는 질문
                </button>
              </li>
              <li>
                <button className="hover:text-primary transition-colors">
                  문의하기
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="text-xs text-muted-foreground space-y-2">
            <p>
              <span className="font-semibold text-foreground mr-2">
                {s.company_name}
              </span>
              대표: {s.ceo_name} | 사업자등록번호: {s.business_number} | 통신판매업신고: {s.commerce_number}
            </p>
            <p>
              {s.address} | {s.email}
            </p>
            <p className="mt-4">{s.copyright}</p>
          </div>
          <div className="flex gap-4 text-xs font-medium text-muted-foreground">
            <button className="hover:text-primary">이용약관</button>
            <button className="text-foreground hover:text-primary">개인정보처리방침</button>
            <button className="hover:text-primary">환불정책</button>
          </div>
        </div>
      </div>
    </footer>
  )
}
