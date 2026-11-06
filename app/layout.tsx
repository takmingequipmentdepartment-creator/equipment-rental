import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from './Navbar'

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
    <html lang="zh-TW">
      <body className={inter.className}>
        <Navbar />
        {children}
      </body>
    </html>
  )
}