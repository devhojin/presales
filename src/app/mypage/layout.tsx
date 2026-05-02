import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '나의콘솔',
  robots: {
    index: false,
    follow: false,
  },
}

export default function MyPageLayout({ children }: { children: React.ReactNode }) {
  return children
}
