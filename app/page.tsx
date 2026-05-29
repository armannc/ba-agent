'use client'
import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Send, Sparkles, ChevronRight, Loader2 } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { QUICK_PROMPTS } from '@/lib/prompts'
import { ChatMessage } from '@/types'

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const categories = [
    { id: 'all', label: 'Все' },
    { id: 'conversion', label: '📉 Конверсия' },
    { id: 'segmentation', label: '👥 Сегменты' },
    { id: 'funnel', label: '🎯 Воронка' },
    { id: 'hypothesis', label: '💡 Гипотезы' },
    { id: 'report', label: '📊 Отчёты' },
  ]

  const filteredPrompts = activeCategory === 'all'
    ? QUICK_PROMPTS
    : QUICK_PROMPTS.filter(p => p.category === activeCategory)

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    setInput('')

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date().toISOString() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      const assistantMsg: ChatMessage = { role: 'assistant', content: '', timestamp: new Date().toISOString() }
      setMessages(prev => [...prev, assistantMsg])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantContent += decoder.decode(value)
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { ...assistantMsg, content: assistantContent }
          return updated
        })
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Ошибка соединения с агентом. Проверь API ключ и Supabase настройки.',
        timestamp: new Date().toISOString()
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-border px-8 py-4 flex items-center justify-between bg-slate-panel">
          <div>
            <h1 className="font-display text-lg font-semibold text-white">Чат с BA Агентом</h1>
            <p className="text-xs text-slate-border mt-0.5">Используются данные из глоссария, требований и заметок</p>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            <span className="text-xs text-accent font-mono">gemini-2.0-flash</span>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Chat area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
              {messages.length === 0 && (
                <div className="text-center py-20 animate-fade-in">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-muted border border-accent/20 mb-4">
                    <Sparkles size={28} className="text-accent" />
                  </div>
                  <h2 className="font-display text-2xl font-semibold text-white mb-2">
                    Готов к анализу
                  </h2>
                  <p className="text-slate-border text-sm max-w-md mx-auto">
                    Задай вопрос, выбери подсказку справа, или загрузи данные в разделах Глоссарий, Требования и Заметки
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-4 animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-1">
                      <span className="text-xs font-bold font-display">BA</span>
                    </div>
                  )}

                  <div className={`max-w-2xl rounded-2xl px-5 py-4 ${
                    msg.role === 'user'
                      ? 'bg-accent text-white rounded-tr-sm'
                      : 'bg-slate-card border border-slate-border rounded-tl-sm'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose-ba text-sm text-gray-200">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content || '▌'}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-slate-card border border-slate-border flex items-center justify-center shrink-0 mt-1">
                      <span className="text-xs font-mono text-slate-border">Я</span>
                    </div>
                  )}
                </div>
              ))}

              {loading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <Loader2 size={14} className="animate-spin" />
                  </div>
                  <div className="bg-slate-card border border-slate-border rounded-2xl rounded-tl-sm px-5 py-4">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-slate-border animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-slate-border animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-slate-border animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-slate-border px-8 py-4 bg-slate-panel">
              <div className="flex gap-3 items-end">
                <div className="flex-1 bg-slate-card border border-slate-border rounded-xl focus-within:border-accent transition-colors">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Задай вопрос агенту... (Enter — отправить, Shift+Enter — новая строка)"
                    className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder-slate-border resize-none outline-none min-h-[48px] max-h-[180px]"
                    rows={1}
                    onInput={e => {
                      const t = e.target as HTMLTextAreaElement
                      t.style.height = 'auto'
                      t.style.height = Math.min(t.scrollHeight, 180) + 'px'
                    }}
                  />
                </div>
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim() || loading}
                  className="w-11 h-11 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Quick prompts panel */}
          <div className="w-64 border-l border-slate-border bg-slate-panel overflow-y-auto">
            <div className="px-4 py-3 border-b border-slate-border">
              <p className="text-xs font-mono text-slate-border uppercase tracking-wider">Быстрые вопросы</p>
            </div>

            {/* Category filter */}
            <div className="px-3 py-2 flex flex-wrap gap-1">
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className={`text-[10px] px-2 py-1 rounded-md transition-colors ${
                    activeCategory === c.id ? 'bg-accent text-white' : 'bg-slate-card text-slate-border hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="px-3 pb-4 space-y-1.5">
              {filteredPrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => send(p.prompt)}
                  disabled={loading}
                  className="w-full text-left px-3 py-2.5 rounded-lg bg-slate-card hover:bg-accent-muted border border-slate-border hover:border-accent/40 transition-all duration-200 group disabled:opacity-50"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white group-hover:text-white leading-tight">{p.label}</p>
                    </div>
                    <ChevronRight size={12} className="text-slate-border group-hover:text-accent shrink-0 mt-0.5 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
