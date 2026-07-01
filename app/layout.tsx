import type { Metadata } from 'next'
import Header from '@/components/Header'
import './globals.css'

export const metadata: Metadata = {
  title: '아이디어 버드',
  description: 'AI 콘텐츠 에디터',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <Header />
        {children}
      </body>
    </html>
  )
}
