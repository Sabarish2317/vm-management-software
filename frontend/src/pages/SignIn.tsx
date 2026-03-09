import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'
import { loginUser, registerUser } from '@/queries/authService'
import { appRoutes } from '@/routes/appRoutes'

type Mode = 'login' | 'register'

const TOKEN_KEY = 'VM_TOKEN'
const USER_KEY = 'VM_USER'

export default function SignIn() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') ?? appRoutes.dashboard.path

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const fn = mode === 'login' ? loginUser : registerUser
      const data = await fn({ email, password })

      // Persist token in cookie (7-day expiry matches backend default)
      Cookies.set(TOKEN_KEY, data.token, { expires: 7, sameSite: 'Lax' })
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))

      toast.success(
        mode === 'login' ? 'Logged in successfully!' : 'Account created!'
      )
      navigate(redirect, { replace: true })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? 'Something went wrong. Please try again.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-card border-border space-y-6 rounded-2xl border p-8 shadow-sm">
          {/* Logo / Title */}
          <div className="space-y-1 text-center">
            <div className="mb-4 flex justify-center">
              <div className="bg-primary flex h-10 w-10 items-center justify-center rounded-xl">
                <svg
                  className="text-primary-foreground h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-foreground text-2xl font-semibold tracking-tight">
              VM Management
            </h1>
            <p className="text-muted-foreground text-sm">
              {mode === 'login'
                ? 'Sign in to your account'
                : 'Create a new account'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-foreground text-sm font-medium"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring h-10 w-full rounded-lg border px-3 py-2 text-sm transition-shadow outline-none focus:ring-2"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-foreground text-sm font-medium"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring h-10 w-full rounded-lg border px-3 py-2 text-sm transition-shadow outline-none focus:ring-2"
              />
              {mode === 'register' && (
                <p className="text-muted-foreground text-xs">
                  Minimum 6 characters
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground mt-3 h-10 w-full rounded-lg text-sm font-medium transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? mode === 'login'
                  ? 'Signing in…'
                  : 'Creating account…'
                : mode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
            </button>
          </form>

          {/* Toggle mode */}
          <p className="text-muted-foreground text-center text-sm">
            {mode === 'login'
              ? "Don't have an account?"
              : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-foreground font-medium underline underline-offset-4 transition-opacity hover:opacity-70"
            >
              {mode === 'login' ? 'Register' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
