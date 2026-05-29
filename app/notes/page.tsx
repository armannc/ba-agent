'use client'
import { useState, useEffect, useCallback } from 'react'
import { StickyNote, Upload, Loader2, CheckCircle, AlertCircle, Check, Link } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { MeetingNote, ActionItem } from '@/types'

export default function NotesPage() {
  const [notes, setNotes] = useState<MeetingNote[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState<MeetingNote | null>(null)
  const [title, setTitle] = useState('')
  const [rawText, setRawText] = useState('')
  const [tab, setTab] = useState<'upload' | 'paste'>('upload')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    const res = await fetch('/api/upload-notes')
    const data = await res.json()
    setNotes(data.notes || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleUpload = async (file?: File) => {
    if (!file && !rawText.trim()) return showToast('error', 'Нет данных для загрузки')
    setUploading(true)
    try {
      const fd = new FormData()
      if (file) fd.append('file', file)
      else fd.append('text', rawText)
      fd.append('title', title || (file ? file.name : `Заметки ${new Date().toLocaleDateString('ru')}`))
      const res = await fetch('/api/upload-notes', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) {
        showToast('success', 'Заметки обработаны и задачи извлечены')
        setSelected(data.note)
        setRawText('')
        setTitle('')
        load()
      } else {
        showToast('error', data.error || 'Ошибка')
      }
    } finally {
      setUploading(false)
    }
  }

  const toggleActionItem = async (noteId: string, itemId: string) => {
    const note = notes.find(n => n.id === noteId)
    if (!note) return
    const updated = note.action_items.map((a: ActionItem) => a.id === itemId ? { ...a, done: !a.done } : a)
    await fetch('/api/upload-notes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: noteId, action_items: updated }),
    })
    const updatedNote = { ...note, action_items: updated }
    setNotes(prev => prev.map(n => n.id === noteId ? updatedNote : n))
    if (selected?.id === noteId) setSelected(updatedNote)
  }

  const pendingCount = notes.reduce((acc, n) => acc + n.action_items.filter((a: ActionItem) => !a.done).length, 0)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex overflow-hidden">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm animate-slide-up
            ${toast.type === 'success' ? 'bg-signal-green/10 border-signal-green/30 text-signal-green' : 'bg-signal-red/10 border-signal-red/30 text-signal-red'}`}>
            {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {toast.message}
          </div>
        )}

        {/* List */}
        <div className="w-80 border-r border-slate-border flex flex-col bg-slate-panel">
          <div className="px-4 py-4 border-b border-slate-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <StickyNote size={16} className="text-accent" />
                <h1 className="font-display font-semibold text-white">Заметки</h1>
              </div>
              {pendingCount > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-signal-yellow/10 border border-signal-yellow/30 text-signal-yellow">
                  {pendingCount} задач
                </span>
              )}
            </div>

            {/* Upload tabs */}
            <div className="flex border border-slate-border rounded-lg overflow-hidden mb-2">
              {(['upload', 'paste'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 text-[11px] py-1.5 transition-colors ${tab === t ? 'bg-accent text-white' : 'text-slate-border hover:text-white'}`}
                >
                  {t === 'upload' ? '📄 Файл' : '📝 Вставить'}
                </button>
              ))}
            </div>

            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Название встречи"
              className="w-full bg-slate-card border border-slate-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-border focus:outline-none focus:border-accent mb-2"
            />

            {tab === 'upload' ? (
              <label className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs cursor-pointer transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                {uploading ? 'Обрабатываю...' : 'Загрузить заметки'}
                <input type="file" accept=".txt,.md,.docx" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }} />
              </label>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder="Вставь текст заметок со встречи..."
                  className="w-full bg-slate-card border border-slate-border rounded-lg px-3 py-2 text-xs text-white placeholder-slate-border focus:outline-none focus:border-accent resize-none h-24"
                />
                <button
                  onClick={() => handleUpload()}
                  disabled={!rawText.trim() || uploading}
                  className="w-full py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
                >
                  {uploading ? <Loader2 size={12} className="animate-spin" /> : null}
                  {uploading ? 'Обрабатываю...' : 'Обработать'}
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {loading ? (
              <div className="flex justify-center pt-8"><Loader2 size={20} className="animate-spin text-accent" /></div>
            ) : notes.length === 0 ? (
              <div className="text-center pt-12 text-slate-border">
                <StickyNote size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">Загрузи первые заметки</p>
              </div>
            ) : notes.map(n => {
              const pending = n.action_items.filter((a: ActionItem) => !a.done).length
              return (
                <button
                  key={n.id}
                  onClick={() => setSelected(n)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selected?.id === n.id ? 'border-accent bg-accent-muted' : 'border-slate-border bg-slate-card hover:border-accent/40'
                  }`}
                >
                  <p className="text-xs font-medium text-white leading-tight mb-1">{n.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-border">{new Date(n.date).toLocaleDateString('ru')}</span>
                    {pending > 0 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-signal-yellow/10 text-signal-yellow">
                        {pending} задач
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-border">
              <StickyNote size={48} className="mb-3 opacity-20" />
              <p className="text-sm">Выбери заметку или загрузи новую</p>
              <p className="text-xs mt-2 max-w-sm text-center opacity-70">
                Агент автоматически извлекает задачи, связывает их с требованиями и формирует саммари
              </p>
            </div>
          ) : (
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl font-semibold text-white mb-1">{selected.title}</h2>
              <p className="text-xs text-slate-border mb-6">{new Date(selected.date).toLocaleDateString('ru', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

              {/* Summary */}
              {selected.summary && (
                <div className="mb-5 p-4 rounded-xl bg-slate-card border border-slate-border">
                  <p className="text-xs font-mono text-accent uppercase tracking-wider mb-2">Саммари встречи</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{selected.summary}</p>
                </div>
              )}

              {/* Action items */}
              <div className="mb-5">
                <p className="text-xs font-mono text-accent uppercase tracking-wider mb-3">
                  Задачи · {selected.action_items.filter((a: ActionItem) => !a.done).length} открытых
                </p>
                {selected.action_items.length === 0 ? (
                  <p className="text-xs text-slate-border">Задачи не найдены</p>
                ) : (
                  <div className="space-y-2">
                    {selected.action_items.map((item: ActionItem) => (
                      <div
                        key={item.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                          item.done ? 'border-slate-border/30 bg-slate-card/30 opacity-50' : 'border-slate-border bg-slate-card'
                        }`}
                      >
                        <button
                          onClick={() => toggleActionItem(selected.id, item.id)}
                          className={`shrink-0 w-4 h-4 rounded border mt-0.5 flex items-center justify-center transition-colors ${
                            item.done ? 'bg-signal-green border-signal-green' : 'border-slate-border hover:border-accent'
                          }`}
                        >
                          {item.done && <Check size={10} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-snug ${item.done ? 'line-through text-slate-border' : 'text-white'}`}>
                            {item.text}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            {item.assignee && <span className="text-[10px] text-slate-border">👤 {item.assignee}</span>}
                            {item.due_date && <span className="text-[10px] text-signal-yellow">📅 {item.due_date}</span>}
                            {item.linked_requirement && (
                              <span className="text-[10px] text-accent flex items-center gap-1">
                                <Link size={10} /> {item.linked_requirement}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Linked requirements */}
              {selected.linked_requirements?.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-mono text-accent uppercase tracking-wider mb-2">Связанные требования</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.linked_requirements.map((r: string) => (
                      <span key={r} className="text-xs px-2 py-1 rounded bg-accent-muted border border-accent/20 text-accent">{r}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw text */}
              <div>
                <p className="text-xs font-mono text-slate-border uppercase tracking-wider mb-2">Исходный текст</p>
                <div className="p-4 rounded-xl bg-slate-card/50 border border-slate-border/50">
                  <pre className="text-xs text-slate-border whitespace-pre-wrap font-body leading-relaxed">{selected.raw_text}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
