'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const authError = searchParams.get('error') === 'auth'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white">Subcuro</h1>
        <p className="text-gray-400 mt-1 text-sm">Вход в аккаунт</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 text-sm"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 text-sm"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        {authError && (
          <p className="text-red-400 text-sm">
            Ссылка из письма устарела или недействительна. Запросите новую или войдите по паролю.
          </p>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
        >
          {loading ? 'Вход…' : 'Войти'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Нет аккаунта?{' '}
        <Link href="/signup" className="text-violet-400 hover:text-violet-300">
          Регистрация
        </Link>
      </p>
    </div>
  )
}
