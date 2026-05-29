// ─── Glossary ────────────────────────────────────────────────────────────────
export interface GlossaryEntry {
  id: string
  term: string
  definition: string
  aliases: string[]
  category: string
  created_at: string
}

// ─── Business Requirements ────────────────────────────────────────────────────
export type RequirementStatus = 'draft' | 'active' | 'implemented' | 'deprecated'

export interface BusinessRequirement {
  id: string
  title: string
  description: string
  status: RequirementStatus
  priority: 'low' | 'medium' | 'high' | 'critical'
  tags: string[]
  conflicts: string[]          // IDs of conflicting requirements
  related: string[]            // IDs of related requirements
  metrics: string[]
  raw_text?: string
  analysis?: {
    issues: unknown[]
    conflicts: unknown[]
    overall_score: number
    summary: string
  }
  created_at: string
  updated_at: string
}

export interface RequirementAnalysis {
  issues: {
    type: 'logic_error' | 'impossibility' | 'ambiguity' | 'improvement'
    severity: 'low' | 'medium' | 'high'
    description: string
    suggestion: string
    requirement_ref: string
  }[]
  conflicts: {
    req_a: string
    req_b: string
    description: string
  }[]
  overall_score: number
  summary: string
}

// ─── Notes ────────────────────────────────────────────────────────────────────
export interface MeetingNote {
  id: string
  title: string
  raw_text: string
  summary: string
  action_items: ActionItem[]
  linked_requirements: string[]
  date: string
  created_at: string
}

export interface ActionItem {
  id: string
  text: string
  assignee?: string
  due_date?: string
  done: boolean
  linked_requirement?: string
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  sources?: string[]   // referenced glossary/requirements/notes IDs
}

export type QuickPrompt = {
  label: string
  prompt: string
  icon: string
  category: 'conversion' | 'segmentation' | 'funnel' | 'hypothesis' | 'report'
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardWidget {
  id: string
  type: 'kpi' | 'chart' | 'table' | 'hypothesis' | 'alert'
  title: string
  data: Record<string, unknown>
  insight?: string
}
