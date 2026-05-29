// Utility to extract text from uploaded files (docx, pdf, txt, csv)

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'txt' || ext === 'md') {
    return await file.text()
  }

  if (ext === 'csv') {
    const text = await file.text()
    return text
  }

  if (ext === 'json') {
    const text = await file.text()
    try {
      return JSON.stringify(JSON.parse(text), null, 2)
    } catch {
      return text
    }
  }

  // For docx and pdf — handled server-side via API route
  throw new Error(`Файл типа .${ext} нужно обработать на сервере`)
}

// Parse glossary from text (CSV, tab-separated, or natural language)
export function parseGlossaryText(text: string): { term: string; definition: string; aliases: string[]; category: string }[] {
  const entries: { term: string; definition: string; aliases: string[]; category: string }[] = []
  const lines = text.split('\n').filter(l => l.trim())

  for (const line of lines) {
    // Skip headers
    if (line.toLowerCase().includes('термин') && line.toLowerCase().includes('определение')) continue

    // Try CSV/tab format: term,definition or term\tdefinition
    const separators = [',', '\t', ';', ' - ', ': ']
    let parsed = false

    for (const sep of separators) {
      if (line.includes(sep)) {
        const parts = line.split(sep)
        if (parts.length >= 2) {
          const term = parts[0].trim().replace(/^["']|["']$/g, '')
          const rest = parts.slice(1).join(sep).trim().replace(/^["']|["']$/g, '')

          // Check for aliases in parentheses: term (alias1, alias2)
          const aliasMatch = term.match(/^(.+?)\s*\((.+?)\)$/)
          const cleanTerm = aliasMatch ? aliasMatch[1].trim() : term
          const aliases = aliasMatch ? aliasMatch[2].split(',').map(a => a.trim()) : []

          entries.push({ term: cleanTerm, definition: rest, aliases, category: 'general' })
          parsed = true
          break
        }
      }
    }

    if (!parsed && line.length > 3) {
      // Treat as a term without definition
      entries.push({ term: line.trim(), definition: '', aliases: [], category: 'general' })
    }
  }

  return entries.filter(e => e.term && e.definition)
}
