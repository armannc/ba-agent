import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { analyzeRequirements } from '@/lib/agent'

export const runtime = 'nodejs'
export const maxDuration = 90

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const rawText = formData.get('text') as string | null
    const status = (formData.get('status') as string) || 'draft'
    const title = (formData.get('title') as string) || 'Без названия'

    let text = rawText || ''

    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext === 'txt' || ext === 'md') {
        text = await file.text()
      } else if (ext === 'docx') {
        const mammoth = await import('mammoth')
        const buffer = Buffer.from(await file.arrayBuffer())
        const result = await mammoth.extractRawText({ buffer })
        text = result.value
      } else if (ext === 'pdf') {
        const pdfParse = await import('pdf-parse')
        const buffer = Buffer.from(await file.arrayBuffer())
        const result = await pdfParse.default(buffer)
        text = result.text
      }
    }

    if (!text.trim()) {
      return Response.json({ error: 'Текст требований пустой' }, { status: 400 })
    }

    // Load existing requirements and glossary for conflict check
    const db = supabaseAdmin()
    const [reqRes, glossaryRes] = await Promise.all([
      db.from('requirements').select('*').in('status', ['active', 'implemented']),
      db.from('glossary').select('*'),
    ])

    // Analyze with AI
    const analysisRaw = await analyzeRequirements(text, reqRes.data || [], glossaryRes.data || [])
    let analysis
    try {
      const cleaned = analysisRaw.replace(/```json|```/g, '').trim()
      analysis = JSON.parse(cleaned)
    } catch {
      analysis = { issues: [], conflicts: [], overall_score: 0, summary: 'Не удалось провести анализ' }
    }

    // Save to DB
    const { data, error } = await db.from('requirements').insert({
      title,
      description: text.slice(0, 500),
      raw_text: text,
      status,
      priority: 'medium',
      tags: [],
      conflicts: analysis.conflicts?.map((c: {req_b: string}) => c.req_b) || [],
      related: [],
      metrics: [],
      analysis,
    }).select().single()

    if (error) throw error

    return Response.json({ success: true, requirement: data, analysis })
  } catch (error) {
    console.error('Requirements upload error:', error)
    return Response.json({ error: 'Ошибка при загрузке требований' }, { status: 500 })
  }
}

export async function GET() {
  const db = supabaseAdmin()
  const { data, error } = await db.from('requirements').select('*').order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ requirements: data })
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json()
  const db = supabaseAdmin()
  const { data, error } = await db.from('requirements').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ requirement: data })
}
