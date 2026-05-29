'use client'
import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Upload, Trash2, Plus, Search, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { GlossaryEntry } from '@/types'

export default function GlossaryPage() {
  const [entries, setEntries] = useState<GlossaryEntry[]>([])
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const loadEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/upload-glossary')
      const data = await res.json()
      setEntries(data.entries || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadEntries() }, [loadEntries])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload-glossary', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) {
        showToast('success', `Загружено ${data.count} терминов`)
        loadEntries()
      } else {
        showToast('error', data.error || 'Ошибка загрузки')
      }
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const deleteEntry = async (id: string) => {
    await fetch('/api/upload-glossary', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const filtered = entries.filter(e =>
    e.term.toLowerCase().includes(search.toLowerCase()) ||
    e.definition.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm animate-slide-up
            ${toast.type === 'success' ? 'bg-signal-green/10 border-signal-green/30 text-signal-green' : 'bg-signal-red/10 border-signal-red/30 text-signal-red'}`}>
            {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="border-b border-slate-border px-8 py-5 bg-slate-panel flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <BookOpen size={20} className="text-accent" />
            <div>
              <h1 className="font-display text-lg font-semibold text-white">Глоссарий</h1>
              <p className="text-xs text-slate-border">{entries.length} терминов · Агент использует их при ответах</p>
            </div>
          </div>
          <label className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm cursor-pointer transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? 'Загружаю...' : 'Загрузить файл'}
            <input type="file" accept=".txt,.csv,.md,.docx,.pdf" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>

        <div className="px-8 py-6">
          {/* Info box */}
          <div className="mb-6 p-4 rounded-xl bg-accent-muted border border-accent/20">
            <p className="text-sm text-accent font-medium mb-1">Как загрузить глоссарий?</p>
            <p className="text-xs text-slate-border leading-relaxed">
              Поддерживаются файлы .txt, .csv, .md, .docx, .pdf. Формат: каждая строка — термин и определение через запятую, двоеточие или табуляцию.
              Пример: <code className="font-mono bg-slate-card px-1 rounded text-white">Конверсия, отношение числа целевых действий к числу визитов</code>
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-border" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по терминам..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-card border border-slate-border rounded-lg text-sm text-white placeholder-slate-border focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 size={24} className="animate-spin text-accent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-border">
              <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">{search ? 'Ничего не найдено' : 'Глоссарий пуст — загрузи файл или добавь термины'}</p>
            </div>
          ) : (
            <div className="border border-slate-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-card">
                    <th className="text-left px-4 py-3 text-[11px] font-mono text-accent uppercase tracking-wider w-1/4">Термин</th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono text-accent uppercase tracking-wider">Определение</th>
                    <th className="text-left px-4 py-3 text-[11px] font-mono text-accent uppercase tracking-wider w-1/4">Синонимы</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-border">
                  {filtered.map(e => (
                    <tr key={e.id} className="hover:bg-slate-card/50 transition-colors group">
                      <td className="px-4 py-3 font-medium text-sm text-white">{e.term}</td>
                      <td className="px-4 py-3 text-sm text-gray-300 leading-relaxed">{e.definition}</td>
                      <td className="px-4 py-3 text-sm text-slate-border">{e.aliases?.join(', ') || '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteEntry(e.id)} className="opacity-0 group-hover:opacity-100 text-slate-border hover:text-signal-red transition-all">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
