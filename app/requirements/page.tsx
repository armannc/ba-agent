'use client'
import { useState, useEffect, useCallback } from 'react'
import { FileText, Upload, Loader2, CheckCircle, AlertCircle, AlertTriangle, Lightbulb, ChevronDown, ChevronUp, Target } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { BusinessRequirement } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-signal-yellow border-signal-yellow/30 bg-signal-yellow/10',
  active: 'text-signal-blue border-signal-blue/30 bg-signal-blue/10',
  implemented: 'text-signal-green border-signal-green/30 bg-signal-green/10',
  deprecated: 'text-slate-border border-slate-border/30 bg-slate-card',
}

const ISSUE_ICONS: Record<string, React.ReactNode> = {
  logic_error: <AlertCircle size={14} className="text-signal-red" />,
  impossibility: <AlertTriangle size={14} className="text-signal-red" />,
  ambiguity: <AlertTriangle size={14} className="text-signal-yellow" />,
  improvement: <Lightbulb size={14} className="text-signal-blue" />,
}

const ISSUE_LABELS: Record<string, string> = {
  logic_error: 'Логическая ошибка',
  impossibility: 'Невозможность',
  ambiguity: 'Неточность',
  improvement: 'Улучшение',
}

export default function RequirementsPage() {
  const [requirements, setRequirements] = useState<BusinessRequirement[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState<BusinessRequirement | null>(null)
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState('draft')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 5000)
  }

  const load = useCallback(async () => {
    const res = await fetch('/api/upload-requirements')
    const data = await res.json()
    setRequirements(data.requirements || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', title || file.name.replace(/\.[^.]+$/, ''))
      fd.append('status', status)
      const res = await fetch('/api/upload-requirements', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) {
        showToast('success', `Требования загружены и проанализированы`)
        setSelected(data.requirement)
        load()
      } else {
        showToast('error', data.error || 'Ошибка')
      }
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const updateStatus = async (id: string, newStatus: string) => {
    await fetch('/api/upload-requirements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    })
    setRequirements(prev => prev.map(r => r.id === id ? { ...r, status: newStatus as BusinessRequirement['status'] } : r))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: newStatus as BusinessRequirement['status'] } : null)
  }

  const scoreColor = (score: number) => score >= 80 ? 'text-signal-green' : score >= 60 ? 'text-signal-yellow' : 'text-signal-red'

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
            <div className="flex items-center gap-2 mb-3">
              <FileText size={16} className="text-accent" />
              <h1 className="font-display font-semibold text-white">Требования</h1>
            </div>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Название (необязательно)"
              className="w-full bg-slate-card border border-slate-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-border focus:outline-none focus:border-accent mb-2"
            />
            <div className="flex gap-2">
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="flex-1 bg-slate-card border border-slate-border rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-accent"
              >
                <option value="draft">Черновик</option>
                <option value="active">Активные</option>
                <option value="implemented">Реализованные</option>
              </select>
              <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs cursor-pointer transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                Загрузить
                <input type="file" accept=".txt,.md,.docx,.pdf" className="hidden" onChange={handleUpload} />
              </label>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {loading ? (
              <div className="flex justify-center pt-8"><Loader2 size={20} className="animate-spin text-accent" /></div>
            ) : requirements.length === 0 ? (
              <div className="text-center pt-12 text-slate-border">
                <FileText size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">Загрузи первые требования</p>
              </div>
            ) : requirements.map(r => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selected?.id === r.id ? 'border-accent bg-accent-muted' : 'border-slate-border bg-slate-card hover:border-accent/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-xs font-medium text-white leading-tight">{r.title}</p>
                  <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border font-mono ${STATUS_COLORS[r.status]}`}>
                    {r.status}
                  </span>
                </div>
                {r.analysis && (
                  <div className="flex items-center gap-1">
                    <div className={`text-[10px] font-mono font-bold ${scoreColor(r.analysis.overall_score)}`}>
                      {r.analysis.overall_score}/100
                    </div>
                    <span className="text-[10px] text-slate-border">·</span>
                    <span className="text-[10px] text-slate-border">{r.analysis.issues?.length || 0} замечаний</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-border">
              <Target size={48} className="mb-3 opacity-20" />
              <p className="text-sm">Выбери требование слева или загрузи новое</p>
              <p className="text-xs mt-2 max-w-sm text-center opacity-70">
                Агент автоматически проверит его на логичность, неточности и конфликты с существующими требованиями
              </p>
            </div>
          ) : (
            <div className="max-w-3xl">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-white mb-1">{selected.title}</h2>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded border font-mono ${STATUS_COLORS[selected.status]}`}>
                      {selected.status}
                    </span>
                    <span className="text-xs text-slate-border">{new Date(selected.created_at).toLocaleDateString('ru')}</span>
                  </div>
                </div>
                <select
                  value={selected.status}
                  onChange={e => updateStatus(selected.id, e.target.value)}
                  className="bg-slate-card border border-slate-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent"
                >
                  <option value="draft">Черновик</option>
                  <option value="active">Активные</option>
                  <option value="implemented">Реализованные</option>
                  <option value="deprecated">Устаревшие</option>
                </select>
              </div>

              {/* Analysis */}
              {selected.analysis && (
                <div className="space-y-4 mb-6">
                  {/* Score */}
                  <div className="p-4 rounded-xl bg-slate-card border border-slate-border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-white">Оценка качества требований</p>
                      <span className={`text-2xl font-display font-bold ${scoreColor(selected.analysis.overall_score)}`}>
                        {selected.analysis.overall_score}<span className="text-base">/100</span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          selected.analysis.overall_score >= 80 ? 'bg-signal-green' :
                          selected.analysis.overall_score >= 60 ? 'bg-signal-yellow' : 'bg-signal-red'
                        }`}
                        style={{ width: `${selected.analysis.overall_score}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-border mt-2">{selected.analysis.summary}</p>
                  </div>

                  {/* Issues */}
                  {selected.analysis.issues?.length > 0 && (
                    <div>
                      <p className="text-xs font-mono text-accent uppercase tracking-wider mb-2">Замечания ({selected.analysis.issues.length})</p>
                      <div className="space-y-2">
                        {selected.analysis.issues.map((issue: {type: string; severity: string; description: string; suggestion: string; requirement_ref: string}, i: number) => (
                          <div key={i} className={`p-3 rounded-lg border ${
                            issue.type === 'improvement' ? 'border-signal-blue/20 bg-signal-blue/5' :
                            issue.severity === 'high' ? 'border-signal-red/20 bg-signal-red/5' :
                            'border-signal-yellow/20 bg-signal-yellow/5'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              {ISSUE_ICONS[issue.type]}
                              <span className="text-xs font-medium text-white">{ISSUE_LABELS[issue.type]}</span>
                              <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                issue.severity === 'high' ? 'text-signal-red bg-signal-red/10' :
                                issue.severity === 'medium' ? 'text-signal-yellow bg-signal-yellow/10' :
                                'text-signal-blue bg-signal-blue/10'
                              }`}>{issue.severity}</span>
                            </div>
                            <p className="text-xs text-gray-300 mb-1">{issue.description}</p>
                            {issue.suggestion && (
                              <p className="text-xs text-slate-border italic">💡 {issue.suggestion}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Conflicts */}
                  {selected.analysis.conflicts?.length > 0 && (
                    <div>
                      <p className="text-xs font-mono text-signal-red uppercase tracking-wider mb-2">Конфликты ({selected.analysis.conflicts.length})</p>
                      <div className="space-y-2">
                        {selected.analysis.conflicts.map((c: {req_a: string; req_b: string; description: string}, i: number) => (
                          <div key={i} className="p-3 rounded-lg border border-signal-red/20 bg-signal-red/5">
                            <p className="text-xs font-medium text-white mb-1">Конфликт с: <span className="text-signal-red">{c.req_b}</span></p>
                            <p className="text-xs text-gray-300">{c.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Raw text */}
              <div>
                <p className="text-xs font-mono text-accent uppercase tracking-wider mb-2">Текст требований</p>
                <div className="p-4 rounded-xl bg-slate-card border border-slate-border">
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap font-body leading-relaxed">{selected.raw_text}</pre>
                </div>
              </div>

              {/* Before/After metrics guide */}
              <div className="mt-6 p-4 rounded-xl bg-accent-muted border border-accent/20">
                <p className="text-sm font-medium text-accent mb-3 flex items-center gap-2">
                  <Target size={14} />
                  До и после релиза
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-mono text-white uppercase tracking-wider mb-1.5">До релиза</p>
                    <ul className="text-xs text-slate-border space-y-1">
                      <li>• Определи метрики успеха</li>
                      <li>• Зафиксируй baseline значения</li>
                      <li>• Установи критерии приёмки</li>
                      <li>• Согласуй период наблюдения</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-white uppercase tracking-wider mb-1.5">После релиза</p>
                    <ul className="text-xs text-slate-border space-y-1">
                      <li>• Сравни с baseline</li>
                      <li>• Проверь статистику</li>
                      <li>• Оцени побочные эффекты</li>
                      <li>• Задокументируй результат</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
