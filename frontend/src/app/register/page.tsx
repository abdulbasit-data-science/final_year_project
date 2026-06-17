'use client'

import { useState, Suspense, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, Shield, Mail, User, Lock, UserPlus, Sparkles } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialRole = searchParams.get('role') || 'student'

  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '', full_name: '', role: initialRole as 'student' | 'admin'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return }
    if (formData.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password, full_name: formData.full_name, role: formData.role }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Registration failed')
      router.push('/login')
    } catch (err: any) {
      setError(err.message || 'Failed to register')
    } finally { setLoading(false) }
  }

  return (
    <div className="card-glass w-full max-w-md p-8 animate-scale-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Create account</h1>
        <p className="mt-1.5" style={{ color: 'var(--text-secondary)' }}>Join ExamGuard to get started</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm mb-6" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--danger)' }} />
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
          <div className="relative">
            <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="input pl-10" placeholder="John Doe" required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="input pl-10" placeholder="you@example.com" required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Role</label>
          <select name="role" value={formData.role} onChange={handleChange} className="select">
            <option value="student">Student</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} className="input pl-10 pr-10" placeholder="Min 6 characters" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Confirm Password</label>
          <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="input" placeholder="Confirm your password" required />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary w-full py-3">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          <UserPlus className="w-4 h-4" />
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="text-center mt-8 text-sm" style={{ color: 'var(--text-muted)' }}>
        Already have an account?{' '}
        <Link href="/login" className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>Sign In</Link>
      </p>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-grid relative flex flex-col items-center justify-center px-4 py-8 overflow-hidden">
      <div className="fixed top-[-15%] left-[-5%] w-[35%] h-[35%] rounded-full bg-gradient-to-br from-primary-400/20 to-primary-600/10 blur-3xl animate-float" />
      <div className="fixed bottom-[-15%] right-[-5%] w-[35%] h-[35%] rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/10 blur-3xl animate-float" style={{ animationDelay: '-3s' }} />

      <div className="flex items-center justify-between w-full max-w-md mb-10">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center shadow-glow group-hover:shadow-glow-lg transition-shadow">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>ExamGuard</span>
        </Link>
      </div>

      <Suspense fallback={
        <div className="card-glass w-full max-w-md flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      }>
        <RegisterForm />
      </Suspense>
    </div>
  )
}
