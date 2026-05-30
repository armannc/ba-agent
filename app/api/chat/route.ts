import { NextRequest } from 'next/server'
import { chatWithBA } from '@/lib/agent'
import { supabaseAdmin } from '@/lib/supabase'
import { getUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { messages } = await req.json()

    const db = supabaseAdmin()
    const [glossaryRes, requirementsRes, notesRes] = await Promise.all([
      db.from('glossary').select('*').eq('user_id', user.id).order('term'),
      db.from('requirements').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      db.from('notes').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(10),
    ])

    const stream = await chatWithBA(messages, {
      glossary: glossaryRes.data || [],
      requirements: requirementsRes.data || [],
      notes: notesRes.data || [],
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    console.error('Chat error:', error)
    return Response.json({ error: 'Ошибка при обращении к AI агенту' }, { status: 500 })
  }
}