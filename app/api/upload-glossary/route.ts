import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { parseGlossaryText } from '@/lib/fileParser'
import { GoogleGenAI } from '@google/genai'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const rawText = formData.get('text') as string | null

    let text = rawText || ''

    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext === 'txt' || ext === 'md' || ext === 'csv') {
        text = await file.text()
      } else if (ext === 'docx') {
        // mammoth for docx
        const mammoth = await import('mammoth')
        const buffer = Buffer.from(await file.arrayBuffer())
        const result = await mammoth.extractRawText({ buffer })
        text = result.value
      } else if (ext === 'pdf') {
        const pdfParse = await import('pdf-parse')
        const buffer = Buffer.from(await file.arrayBuffer())
        const result = await pdfParse.default(buffer)
        text = result.text
      } else {
        return Response.json({ error: 'Поддерживаются форматы: txt, csv, md, docx, pdf' }, { status: 400 })
      }
    }

    if (!text.trim()) {
      return Response.json({ error: 'Файл пустой или не содержит текста' }, { status: 400 })
    }

    // Try simple parse first
    let entries = parseGlossaryText(text)

    // If parse yields nothing or few results, use AI to extract
    if (entries.length < 2) {
      const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
      const response = await genai.models.generateContent({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: 'Извлеки термины глоссария из текста. Верни ТОЛЬКО валидный JSON массив без markdown:\n[{"term":"...","definition":"...","aliases":[],"category":"general"}]',
          maxOutputTokens: 4096,
        },
        contents: `Извлеки все термины и определения из этого текста:\n\n${text.slice(0, 8000)}`,
      })
      const aiText = response.text ?? '[]'
      try {
        const cleaned = aiText.replace(/```json|```/g, '').trim()
        entries = JSON.parse(cleaned)
      } catch {
        entries = []
      }
    }

    if (!entries.length) {
      return Response.json({ error: 'Не удалось распознать термины. Убедись, что файл содержит термины и определения.' }, { status: 400 })
    }

    // Upsert to DB
    const db = supabaseAdmin()
    const { error } = await db.from('glossary').upsert(
      entries.map(e => ({
        term: e.term,
        definition: e.definition,
        aliases: e.aliases || [],
        category: e.category || 'general',
      })),
      { onConflict: 'term' }
    )

    if (error) throw error

    return Response.json({ success: true, count: entries.length, entries })
  } catch (error) {
    console.error('Glossary upload error:', error)
    return Response.json({ error: 'Ошибка при загрузке глоссария' }, { status: 500 })
  }
}

export async function GET() {
  const db = supabaseAdmin()
  const { data, error } = await db.from('glossary').select('*').order('term')
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ entries: data })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const db = supabaseAdmin()
  const { error } = await db.from('glossary').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
