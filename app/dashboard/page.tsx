'use client'
import { useState, useEffect } from 'react'
import { BarChart2, TrendingUp, FileText, BookOpen, MessageSquare, CheckSquare, AlertTriangle, Clock, Send, Loader2, Lightbulb } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
 
interface Stats {
  totalRequirements: number
  activeRequirements: number
  draftRequirements: number
  implementedRequirements: number
  avgScore: number
  totalGlossary: number
  totalNotes: number
  openActionItems: number
  doneActionItems: number
  requirementsByPriority: { name: string; value: number }[]
  requirementsByStatus: { name: string; value: number }[]
  recentRequirements: { title: string; status: string; priority: string; score: number }[]
}
 
export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [asking, setAsking] = useState(false)
 
  useEffect(() => {
    fetchStats()
  }, [])
 
  const fetchStats = async () => {
    setLoading(true)
    try {
      const [reqRes, glossaryRes, notesRes] = await Promise.all([
        fetch('/api/upload-requirements'),
        fetch('/api/upload-glossary'),
        fetch('/api/upload-notes'),
      ])
      const [reqData, glossaryData, notesData] = await Promise.all([
        reqRes.json(),
        glossaryRes.json(),
        notesRes.json(),
      ])
 
      const requirements = reqData.requirements || []
      const glossary = glossaryData.entries || []
      const notes = notesData.notes || []
 
      const allActionItems = notes.flatMap((n: {action_items: {done: boolean}[]}) => n.action_items || [])
      const openItems = allActionItems.filter((a: {done: boolean}) => !a.done).length
      const doneItems = allActionItems.filter((a: {done: boolean}) => a.done).length
 
      const scores = requirements
        .map((r: {analysis?: {overall_score?: number}}) => r.analysis?.overall_score)
        .filter((s: number | undefined) => typeof s === 'number')
      const avgScore = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0
 
      const priorityMap: Record<string, number> = {}
      requirements.forEach((r: {priority: string}) => {
        priorityMap[r.priority] = (priorityMap[r.priority] || 0) + 1
      })
 
      const statusMap: Record<string, number> = {}
      requirements.forEach((r: {status: string}) => {
        statusMap[r.status] = (statusMap[r.status] || 0) + 1
      })
 
      setStats({
        totalRequirements: requirements.length,
        activeRequirements: requirements.filter((r: {status: string}) => r.status === 'active').length,
        draftRequirements: requirements.filter((r: {status: string}) => r.status === 'draft').length,
        implementedRequirements: requirements.filter((r: {status: string}) => r.status === 'implemented').length,
        avgScore,
        totalGlossary: glossary.length,
        totalNotes: notes.length,
        openActionItems: openItems,
        doneActionItems: doneItems,
        requirementsByPriority: Object.entries(priorityMap).map(([name, value]) => ({ name, value })),
        requirementsByStatus: Object.entries(statusMap).map(([name, value]) => ({ name, value })),
        recentRequirements: requirements.slice(0, 5).map((r: {title: string; status: string; priority: string; analysis?: {overall_score?: number}}) => ({
          title: r.title,
          status: r.status,
          priority: r.priority,
          score: r.analysis?.overall_score || 0,
        })),
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }
 
  const askAgent = async () => {
    if (!question.trim() || asking) return
    setAsking(true)
    setAnswer('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Данные дашборда:\n${JSON.stringify(stats, null, 2)}\n\nВопрос: ${question}\n\nДай конкретный анализ.`
          }]
        }),
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let text = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value)
        setAnswer(text)
      }
    } finally {
      setAsking(false)
    }
  }
 
  const COLORS = ['#6C63FF', '#00E5A0', '#FFB830', '#FF4D6D']
  const statusLabels: Record<string, string> = { draft: 'Черновик', active: 'Активное', implemented: 'Реализовано', archived: 'Архив' }
  const priorityLabels: Record<string, string> = { low: 'Низкий', medium: 'Средний', high: 'Высокий', critical: 'Критичный' }
 
  const CustomTooltip = ({ active, payload, label }: {active?: boolean; payload?: {value: number; name: string}[]; label?: string}) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-slate-card border border-slate-border rounded-lg px-3 py-2">
        <p className="text-xs text-slate-border mb-1">{label}</p>
        <p className="text-sm font-mono text-white">{payload[0]?.value}</p>
      </div>
    )
  }
 
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-ink">
        {/* Header */}
        <div className="border-b border-slate-border px-8 py-5 bg-slate-panel flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <BarChart2 size={20} className="text-accent" />
            <div>
              <h1 className="font-display text-lg font-semibold text-white">Дашборд</h1>
              <p className="text-xs text-slate-border">Реальные данные из вашей базы</p>
            </div>
          </div>
          <button onClick={fetchStats} className="text-xs px-3 py-1.5 rounded-lg bg-slate-card border border-slate-border text-slate-border hover:text-white transition-colors">
            Обновить
          </button>
        </div>
 
        <div className="px-8 py-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 size={32} className="animate-spin text-accent" />
            </div>
          ) : !stats || stats.totalRequirements === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FileText size={48} className="text-slate-border mb-4" />
              <p className="text-white font-medium mb-2">Данных пока нет</p>
              <p className="text-slate-border text-sm">Загрузи требования, глоссарий и заметки — дашборд заполнится автоматически</p>
            </div>
          ) : (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Всего требований', value: stats.totalRequirements, icon: FileText, color: 'text-accent' },
                  { label: 'Терминов в глоссарии', value: stats.totalGlossary, icon: BookOpen, color: 'text-signal-green' },
                  { label: 'Заметок со встреч', value: stats.totalNotes, icon: MessageSquare, color: 'text-yellow-400' },
                  { label: 'Открытых задач', value: stats.openActionItems, icon: AlertTriangle, color: 'text-signal-red' },
                ].map((kpi, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-card border border-slate-border">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-xs text-slate-border">{kpi.label}</p>
                      <kpi.icon size={14} className={kpi.color} />
                    </div>
                    <p className="font-display text-3xl font-semibold text-white">{kpi.value}</p>
                  </div>
                ))}
              </div>
 
              {/* Second KPI row */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Активные', value: stats.activeRequirements, icon: TrendingUp, color: 'text-accent' },
                  { label: 'Черновики', value: stats.draftRequirements, icon: Clock, color: 'text-yellow-400' },
                  { label: 'Реализованные', value: stats.implementedRequirements, icon: CheckSquare, color: 'text-signal-green' },
                  { label: 'Средний score AI', value: stats.avgScore ? `${stats.avgScore}%` : '—', icon: BarChart2, color: 'text-accent' },
                ].map((kpi, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-card border border-slate-border">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-xs text-slate-border">{kpi.label}</p>
                      <kpi.icon size={14} className={kpi.color} />
                    </div>
                    <p className="font-display text-3xl font-semibold text-white">{kpi.value}</p>
                  </div>
                ))}
              </div>
 
              {/* Charts */}
              <div className="grid grid-cols-2 gap-4">
                {/* By priority */}
                <div className="p-4 rounded-xl bg-slate-card border border-slate-border">
                  <p className="text-xs font-mono text-accent uppercase tracking-wider mb-4">Требования по приоритету</p>
                  {stats.requirementsByPriority.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={stats.requirementsByPriority.map(d => ({ ...d, name: priorityLabels[d.name] || d.name }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A42" />
                        <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" fill="#6C63FF" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-slate-border text-sm text-center py-8">Нет данных</p>}
                </div>
 
                {/* By status pie */}
                <div className="p-4 rounded-xl bg-slate-card border border-slate-border">
                  <p className="text-xs font-mono text-accent uppercase tracking-wider mb-4">Требования по статусу</p>
                  {stats.requirementsByStatus.length > 0 ? (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="60%" height={180}>
                        <PieChart>
                          <Pie data={stats.requirementsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                            {stats.requirementsByStatus.map((_, index) => (
                              <Cell key={index} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name) => [value, statusLabels[name as string] || name]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2">
                        {stats.requirementsByStatus.map((item, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-xs text-slate-border">{statusLabels[item.name] || item.name}</span>
                            <span className="text-xs text-white font-mono ml-auto">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <p className="text-slate-border text-sm text-center py-8">Нет данных</p>}
                </div>
              </div>
 
              {/* Action items progress */}
              {(stats.openActionItems + stats.doneActionItems) > 0 && (
                <div className="p-4 rounded-xl bg-slate-card border border-slate-border">
                  <p className="text-xs font-mono text-accent uppercase tracking-wider mb-3">Прогресс задач из заметок</p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-slate-panel rounded-full h-3">
                      <div
                        className="bg-signal-green h-3 rounded-full transition-all"
                        style={{ width: `${Math.round(stats.doneActionItems / (stats.openActionItems + stats.doneActionItems) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm text-white font-mono whitespace-nowrap">
                      {stats.doneActionItems} / {stats.openActionItems + stats.doneActionItems} выполнено
                    </span>
                  </div>
                </div>
              )}
 
              {/* Recent requirements */}
              {stats.recentRequirements.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-card border border-slate-border">
                  <p className="text-xs font-mono text-accent uppercase tracking-wider mb-3">Последние требования</p>
                  <div className="space-y-2">
                    {stats.recentRequirements.map((r, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-slate-border last:border-0">
                        <span className="text-sm text-white truncate flex-1">{r.title}</span>
                        <div className="flex items-center gap-3 ml-4">
                          <span className="text-xs text-slate-border">{priorityLabels[r.priority] || r.priority}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            r.status === 'active' ? 'bg-accent/20 text-accent' :
                            r.status === 'implemented' ? 'bg-signal-green/20 text-signal-green' :
                            'bg-slate-panel text-slate-border'
                          }`}>{statusLabels[r.status] || r.status}</span>
                          {r.score > 0 && <span className="text-xs font-mono text-yellow-400">{r.score}%</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
 
              {/* AI Analysis */}
              <div className="p-4 rounded-xl bg-slate-panel border border-accent/20">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={16} className="text-accent" />
                  <p className="text-sm font-medium text-white">Спроси агента про эти данные</p>
                </div>
                <div className="flex gap-3 mb-3">
                  <input
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && askAgent()}
                    placeholder="Например: что требует внимания? какие задачи просрочены?"
                    className="flex-1 bg-slate-card border border-slate-border rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-border focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={askAgent}
                    disabled={!question.trim() || asking}
                    className="px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm flex items-center gap-2 disabled:opacity-40 transition-colors"
                  >
                    {asking ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Анализировать
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    'Что требует внимания прямо сейчас?',
                    'Какие требования конфликтуют?',
                    'Какие задачи не закрыты?',
                    'Оцени качество требований',
                  ].map(q => (
                    <button key={q} onClick={() => setQuestion(q)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-card border border-slate-border text-slate-border hover:text-white hover:border-accent/40 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
                {answer && (
                  <div className="p-4 rounded-lg bg-slate-card border border-slate-border">
                    <div className="text-sm text-gray-200 space-y-1">
                      {answer.split('\n').map((line, i) => <p key={i} className="leading-relaxed">{line}</p>)}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}