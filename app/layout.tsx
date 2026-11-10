import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from './Navbar'
import { Providers } from './providers' // 👉 1. 引入剛剛寫好的 Providers

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '學生會設備借用系統',
  description: '德明學生會設備部專用',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // 👉 2. 加上 suppressHydrationWarning，這非常重要！可以避免深淺色模式在第一次載入時畫面閃爍或報錯
    <html lang="zh-TW" suppressHydrationWarning>
      <body className={inter.className}>
        {/* 👉 3. 用 Providers 把 Navbar 和整個網站內容包起來 */}
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  )
}