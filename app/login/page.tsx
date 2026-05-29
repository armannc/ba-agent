'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else router.push('/dashboard')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center">
      <div className="bg-slate-card border border-slate-border rounded-2xl p-8 w-full max-w-md">
        <h1 className="font-display text-2xl font-semibold text-white mb-2">Вход</h1>
        <p className="text-slate-border text-sm mb-6">BA Agent — AI Бизнес-Аналитик</p>
        {error && <p className="text-red-400 text-sm mb-4 p-3 bg-red-400/10 rounded-lg">{error}</p>}
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-slate-panel border border-slate-border rounded-lg px-4 py-3 text-white placeholder-slate-border focus:outline-none focus:border-accent"
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="w-full bg-slate-panel border border-slate-border rounded-lg px-4 py-3 text-white placeholder-slate-border focus:outline-none focus:border-accent"
          />
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover text-white rounded-lg py-3 font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </div>
        <p className="text-slate-border text-sm text-center mt-4">
          Нет аккаунта?{' '}
          <a href="/register" className="text-accent hover:underline">Зарегистрироваться</a>
        </p>
      </div>
    </div>
  )
}