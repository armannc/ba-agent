'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, BookOpen, FileText, StickyNote, BarChart2, Settings } from 'lucide-react'

const nav = [
  { href: '/', icon: MessageSquare, label: 'Чат с агентом' },
  { href: '/glossary', icon: BookOpen, label: 'Глоссарий' },
  { href: '/requirements', icon: FileText, label: 'Требования' },
  { href: '/notes', icon: StickyNote, label: 'Заметки' },
  { href: '/dashboard', icon: BarChart2, label: 'Дашборд' },
]

export default function Sidebar() {
  const path = usePathname()
  return (
    <aside className="w-60 shrink-0 flex flex-col bg-slate-panel border-r border-slate-border h-screen sticky top-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-display font-bold text-sm">
            BA
          </div>
          <div>
            <p className="font-display font-semibold text-white text-sm leading-tight">BA Agent</p>
            <p className="text-[10px] text-slate-border uppercase tracking-widest">AI Аналитик</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = path === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200
                ${active
                  ? 'bg-accent text-white shadow-lg glow-accent'
                  : 'text-slate-border hover:text-white hover:bg-slate-card'
                }`}
            >
              <Icon size={16} className={active ? 'text-white' : 'text-slate-border'} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-border hover:text-white hover:bg-slate-card transition-all"
        >
          <Settings size={16} />
          Настройки
        </Link>
        <div className="mt-3 px-3 py-2 rounded-lg bg-accent-muted">
          <p className="text-[10px] text-accent font-mono uppercase tracking-wider">Статус агента</p>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-signal-green animate-pulse-slow" />
            <span className="text-xs text-signal-green">Активен</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
