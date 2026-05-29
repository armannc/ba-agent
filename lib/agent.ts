import { GoogleGenAI } from '@google/genai'
import { GlossaryEntry, BusinessRequirement, MeetingNote } from '@/types'

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

// ─── Build context from DB objects ───────────────────────────────────────────
export function buildContext(opts: {
  glossary?: GlossaryEntry[]
  requirements?: BusinessRequirement[]
  notes?: MeetingNote[]
}): string {
  const parts: string[] = []

  if (opts.glossary?.length) {
    parts.push(`## ГЛОССАРИЙ КОМПАНИИ\nСледующие термины используются в этой компании. ВСЕГДА трактуй их согласно этим определениям:\n${
      opts.glossary.map(g =>
        `- **${g.term}**${g.aliases.length ? ` (также: ${g.aliases.join(', ')})` : ''}: ${g.definition}`
      ).join('\n')
    }`)
  }

  if (opts.requirements?.length) {
    const active = opts.requirements.filter(r => r.status === 'active' || r.status === 'implemented')
    if (active.length) {
      parts.push(`## СУЩЕСТВУЮЩИЕ БИЗНЕС-ТРЕБОВАНИЯ (реализованные/активные)\n${
        active.map(r => `- [${r.id.slice(0,8)}] **${r.title}** (${r.status}, приоритет: ${r.priority})\n  ${r.description}`).join('\n')
      }`)
    }
  }

  if (opts.notes?.length) {
    parts.push(`## ЗАМЕТКИ СО ВСТРЕЧ\n${
      opts.notes.slice(0, 5).map(n =>
        `### ${n.title} (${n.date})\n${n.summary || n.raw_text.slice(0, 300)}...\nДействия: ${
          n.action_items.filter((a: {done: boolean}) => !a.done).map((a: {text: string}) => `• ${a.text}`).join(', ')
        }`
      ).join('\n\n')
    }`)
  }

  return parts.join('\n\n')
}

// ─── Master system prompt ─────────────────────────────────────────────────────
export function buildSystemPrompt(context: string): string {
  return `Ты — AI-агент бизнес-аналитика (БА). Твоя роль: помогать БА анализировать данные, работать с бизнес-требованиями, формировать гипотезы и создавать отчёты.

## ПРАВИЛА ПОВЕДЕНИЯ (СТРОГО ОБЯЗАТЕЛЬНЫ)

### 1. ТОЧНОСТЬ ДАННЫХ
- НИКОГДА не выдумывай цифры, метрики или тренды — если данных нет, прямо скажи об этом
- Если пользователь спрашивает о метриках, которых нет в переданных данных — скажи "У меня нет этих данных. Загрузи файл с данными или опиши метрики."
- Все гипотезы помечай явно как ГИПОТЕЗА и объясняй, какие данные нужны для её проверки
- Если вопрос неоднозначен — уточни, не угадывай

### 2. ИСПОЛЬЗОВАНИЕ ГЛОССАРИЯ
- Все термины из глоссария компании используй в их СПЕЦИФИЧЕСКОМ значении для этой компании
- Если термин есть в глоссарии — НЕ используй общепринятое значение, используй значение из глоссария
- Если термин кажется незнакомым — проверь глоссарий перед ответом

### 3. АНАЛИЗ ТРЕБОВАНИЙ
При проверке бизнес-требований ищи:
- ЛОГИЧЕСКИЕ ОШИБКИ: противоречия внутри требования
- НЕВОЗМОЖНОСТЬ: технически нереализуемые требования
- НЕТОЧНОСТЬ: размытые формулировки без критериев приёмки
- КОНФЛИКТЫ: противоречия с существующими требованиями
- УЛУЧШЕНИЯ: как сделать требование лучше (добавить метрики, уточнить условия)

### 4. РАБОТА С ГИПОТЕЗАМИ
Структура гипотезы:
- Наблюдение: что именно изменилось
- Возможная причина: почему это могло произойти
- Как проверить: какие данные или эксперименты нужны
- Ожидаемый результат: что увидим если гипотеза верна

### 5. ОТЧЁТЫ И ДАШБОРДЫ
- При запросе отчёта — уточни: за какой период, какие метрики, для кого
- Предлагай конкретные визуализации (типы графиков) под конкретные данные
- Указывай что важно смотреть в первую очередь и почему

### 6. ЗАМЕТКИ И ЗАДАЧИ
- Связывай задачи из заметок с существующими требованиями по смыслу
- Напоминай о незавершённых action items если они релевантны вопросу
- Помогай формулировать задачи в чёткие бизнес-требования

### 7. ДО И ПОСЛЕ РЕЛИЗА
ДО релиза бизнес-требование должно иметь:
- Чёткий критерий приёмки (acceptance criteria)
- Метрики успеха (что измеряем)
- Baseline (текущее значение метрики до изменений)

ПОСЛЕ релиза:
- Как сравнивать с baseline
- Какой период наблюдения нужен
- Статистическая значимость изменений

### 8. ФОРМАТ ОТВЕТОВ
- Используй структурированные ответы с заголовками
- Важные выводы выделяй в начало
- Предлагай следующие шаги
- Если нужен дашборд — опиши структуру в формате JSON (тип виджета, данные, инсайт)

${context ? `## КОНТЕКСТ РАБОЧЕГО ПРОСТРАНСТВА\n${context}` : ''}

Отвечай на русском языке. Будь конкретным, полезным и честным.`
}

// ─── Main chat function ───────────────────────────────────────────────────────
export async function chatWithBA(
  messages: { role: 'user' | 'assistant'; content: string }[],
  context: { glossary?: GlossaryEntry[]; requirements?: BusinessRequirement[]; notes?: MeetingNote[] }
): Promise<ReadableStream> {
  const contextStr = buildContext(context)
  const systemPrompt = buildSystemPrompt(contextStr)

  // Convert messages to Gemini format
  const geminiMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const model = genai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 4096,
    },
    history: geminiMessages.slice(0, -1),
  })

  const lastMessage = messages[messages.length - 1]

  const stream = await model.sendMessageStream({ message: lastMessage.content })

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.text
        if (text) {
          controller.enqueue(new TextEncoder().encode(text))
        }
      }
      controller.close()
    }
  })
}

// ─── Requirement Analysis ─────────────────────────────────────────────────────
export async function analyzeRequirements(
  newRequirements: string,
  existingRequirements: BusinessRequirement[],
  glossary: GlossaryEntry[]
): Promise<string> {
  const contextStr = buildContext({ glossary, requirements: existingRequirements })

  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: `Ты — эксперт по анализу бизнес-требований. ${contextStr}
    
Проанализируй новые бизнес-требования и верни ТОЛЬКО валидный JSON (без markdown, без пояснений) в формате:
{
  "issues": [
    {
      "type": "logic_error|impossibility|ambiguity|improvement",
      "severity": "low|medium|high",
      "description": "описание проблемы",
      "suggestion": "как исправить",
      "requirement_ref": "какая именно часть требования"
    }
  ],
  "conflicts": [
    {
      "req_a": "новое требование (цитата)",
      "req_b": "ID или название существующего требования",
      "description": "в чём конфликт"
    }
  ],
  "overall_score": 75,
  "summary": "общая оценка качества требований"
}`,
      maxOutputTokens: 4096,
    },
    contents: `Проанализируй эти бизнес-требования:\n\n${newRequirements}`,
  })

  return response.text ?? '{}'
}

// ─── Notes Processing ─────────────────────────────────────────────────────────
export async function processNotes(
  rawNotes: string,
  existingRequirements: BusinessRequirement[]
): Promise<string> {
  const reqContext = existingRequirements.map(r => `[${r.id.slice(0,8)}] ${r.title}: ${r.description.slice(0,100)}`).join('\n')

  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: `Обработай заметки со встречи. Верни ТОЛЬКО валидный JSON без markdown:
{
  "summary": "краткое резюме встречи (2-3 предложения)",
  "action_items": [
    {
      "id": "уникальный id",
      "text": "конкретное действие",
      "assignee": "ответственный если указан или null",
      "due_date": "дата если указана или null",
      "done": false,
      "linked_requirement": "ID требования если связано или null"
    }
  ],
  "linked_requirements": ["список ID существующих требований, к которым относятся заметки"]
}

Существующие требования для связки:
${reqContext}`,
      maxOutputTokens: 2048,
    },
    contents: rawNotes,
  })

  return response.text ?? '{}'
}
