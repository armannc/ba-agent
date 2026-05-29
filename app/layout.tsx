import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['cyrillic', 'latin'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'BA Agent — AI Бизнес-Аналитик',
  description: 'AI-агент для бизнес-аналитиков: анализ требований, гипотезы, отчёты',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${playfair.variable} ${dmSans.variable} ${jetbrains.variable}`}>
      <body className="bg-ink text-white font-body antialiased">{children}</body>
    </html>
  )
}
