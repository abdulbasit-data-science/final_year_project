'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { BookOpen, LogOut, ArrowRight, Search, Shield, Sparkles, Zap } from 'lucide-react'
import type { Exam, ExamAttempt } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function StudentDashboard() {
  const router = useRouter()
  const { user, loading: authLoading, logout } = useAuth()
  const [exams, setExams] = useState<Exam[]>([])
  const [attempts, setAttempts] = useState<ExamAttempt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [user, authLoading, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return
      try {
        const token = localStorage.getItem('access_token')
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
        const [examsRes] = await Promise.all([
          fetch('http://localhost:8000/api/exams?is_published=true', { headers }).then(r => r.json()),
        ])
        setExams(examsRes.data || [])
        const attemptsRes = await fetch('http://localhost:8000/api/attempts/student/me', { headers }).then(r => r.json())
        setAttempts(attemptsRes.data || [])
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchData()
  }, [user])

  const startExam = (examId: string) => {
    const existingAttempt = attempts.find(a => a.exam_id === examId && a.status === 'in_progress')
    router.push(existingAttempt ? `/student/exam/${examId}?attemptId=${existingAttempt.id}` : `/student/exam/${examId}`)
  }

  const [examIdInput, setExamIdInput] = useState('')
  const handleStartExam = (e: React.FormEvent) => {
    e.preventDefault()
    if (!examIdInput.trim()) return
    const existingAttempt = attempts.find(a => a.exam_id === examIdInput.trim() && a.status === 'in_progress')
    router.push(existingAttempt ? `/student/exam/${examIdInput.trim()}?attemptId=${existingAttempt.id}` : `/student/exam/${examIdInput.trim()}`)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-grid">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center animate-pulse shadow-glow">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-grid relative" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="fixed top-[-15%] left-[-5%] w-[30%] h-[30%] rounded-full bg-gradient-to-br from-primary-400/10 to-primary-600/5 blur-3xl animate-float pointer-events-none" />

      <header className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="page-container flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center shadow-glow">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Student Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Welcome, <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{user?.full_name}</span>
            </span>
            <button onClick={logout} className="btn btn-ghost text-sm">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="page-container py-12">
        <div className="card-glass max-w-2xl mx-auto p-8 text-center mb-12 animate-scale-in" style={{ borderStyle: 'dashed', borderWidth: 2, borderColor: 'var(--accent)' }}>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center mx-auto mb-6" style={{ color: 'var(--accent)' }}>
            <Search className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Join an Exam</h1>
          <p className="mb-8 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>Enter the unique Exam ID provided by your instructor to begin.</p>
          <form onSubmit={handleStartExam} className="flex gap-3 max-w-lg mx-auto">
            <input type="text" value={examIdInput} onChange={(e) => setExamIdInput(e.target.value)} placeholder="Enter Exam ID" className="input flex-1 font-mono text-sm" required />
            <button type="submit" className="btn btn-primary whitespace-nowrap">
              Start Exam <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <section>
          <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Available Exams</h2>
          {exams.length === 0 ? (
            <div className="card text-center py-16" style={{ borderStyle: 'dashed', borderWidth: 2, borderColor: 'var(--border)' }}>
              <BookOpen className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No exams available</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Check back later for new exams</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map(exam => {
                const attempt = attempts.find(a => a.exam_id === exam.id)
                const attempted = attempt && attempt.status !== 'in_progress'
                return (
                  <div key={exam.id} className={cn("card-glass p-6 hover:-translate-y-0.5 transition-all duration-300", attempted && "opacity-60")}>
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{exam.title}</h3>
                    </div>
                    <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{exam.description}</p>
                    <div className="flex items-center justify-between text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
                      <span>{exam.duration_minutes} min</span>
                      <span>{exam.total_marks} marks</span>
                    </div>
                    {attempted ? (
                      <div className={cn("badge w-full justify-center py-2", attempt?.status === 'completed' ? "badge-success" : "badge-danger")}>
                        {attempt?.status === 'completed' ? 'Completed' : 'Flagged'}
                      </div>
                    ) : (
                      <button onClick={() => startExam(exam.id)} className="btn btn-primary w-full">
                        {attempt?.status === 'in_progress' ? 'Continue' : 'Start Exam'}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
