'use client'

import { usePathname } from 'next/navigation'
import { ChatWidget } from '@/components/chat/ChatWidget'
import { ExitIntentPopup } from '@/components/ExitIntentPopup'
import { GoogleAnalytics } from '@/components/GoogleAnalytics'
import { MicrosoftClarity } from '@/components/MicrosoftClarity'
import { PageViewTracker } from '@/components/PageViewTracker'
import { ToastContainer } from '@/components/Toast'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin') ?? false

  if (isAdmin) {
    return (
      <>
        {children}
        <ToastContainer />
      </>
    )
  }

  return (
    <>
      <Header />
      <PageViewTracker />
      <main className="flex-1">{children}</main>
      <Footer />
      <ToastContainer />
      <ChatWidget />
      <ExitIntentPopup />
      <GoogleAnalytics />
      <MicrosoftClarity />
    </>
  )
}
