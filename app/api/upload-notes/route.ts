import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { processNotes } from '@/lib/agent'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const rawText = formData.get('text') as string | null
    const title = (formData.get('title') as string) || `Встреча ${new Date().toLocaleDateString('ru')}`
    const date = (formData.get('date') as string) || new Date().toISOString().split('T')[0]

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
      }
    }

    if (!text.trim()) {
      return Response.json({ error: 'Текст заметок пустой' }, { status: 400 })
    }

    const db = supabaseAdmin()
    const { data: requirements } = await db.from('requirements').select('*')

    const processedRaw = await processNotes(text, requirements || [])
    let processed
    try {
      const cleaned = processedRaw.replace(/```json|```/g, '').trim()
      processed = JSON.parse(cleaned)
    } catch {
      processed = { summary: '', action_items: [], linked_requirements: [] }
    }

    const { data, error } = await db.from('notes').insert({
      title,
      raw_text: text,
      summary: processed.summary || '',
      action_items: processed.action_items || [],
      linked_requirements: processed.linked_requirements || [],
      date,
    }).select().single()

    if (error) throw error

    return Response.json({ success: true, note: data, processed })
  } catch (error) {
    console.error('Notes error:', error)
    return Response.json({ error: 'Ошибка при обработке заметок' }, { status: 500 })
  }
}

export async function GET() {
  const db = supabaseAdmin()
  const { data, error } = await db.from('notes').select('*').order('date', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ notes: data })
}

export async function PATCH(req: NextRequest) {
  const { id, action_items } = await req.json()
  const db = supabaseAdmin()
  const { data, error } = await db.from('notes').update({ action_items }).eq('id', id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ note: data })
}
