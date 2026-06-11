'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { BookOpen, Clock, LogOut, AlertTriangle } from 'lucide-react'
import type { Exam, ExamAttempt } from '@/lib/types'

export default function StudentDashboard() {
  const router = useRouter()
  const { user, loading: authLoading, logout } = useAuth()
  const [exams, setExams] = useState<Exam[]>([])
  const [attempts, setAttempts] = useState<ExamAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      const [examsRes, attemptsRes] = await Promise.all([
        supabase.from('exams').select('*').eq('is_published', true),
        supabase.from('exam_attempts').select('*').eq('student_id', user.id)
      ])

      setExams(examsRes.data || [])
      setAttempts(attemptsRes.data || [])
      setLoading(false)
    }

    fetchData()
  }, [user, supabase])

  const startExam = (examId: string) => {
    const existingAttempt = attempts.find(a => a.exam_id === examId && a.status === 'in_progress')
    if (existingAttempt) {
      router.push(`/student/exam/${examId}?attemptId=${existingAttempt.id}`)
    } else {
      router.push(`/student/exam/${examId}`)
    }
  }

  const [examIdInput, setExamIdInput] = useState('')

  const handleStartExam = (e: React.FormEvent) => {
    e.preventDefault()
    if (!examIdInput.trim()) return
    
    // Check if there's already an in-progress attempt for this exam ID
    const existingAttempt = attempts.find(a => a.exam_id === examIdInput.trim() && a.status === 'in_progress')
    if (existingAttempt) {
      router.push(`/student/exam/${examIdInput.trim()}?attemptId=${existingAttempt.id}`)
    } else {
      router.push(`/student/exam/${examIdInput.trim()}`)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold text-gray-900">Student Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Welcome, {user?.full_name}</span>
            <button onClick={logout} className="btn btn-secondary flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white p-8 rounded-xl shadow-sm border text-center mb-12">
          <BookOpen className="w-16 h-16 text-primary mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Join an Exam</h1>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Please enter the unique Exam ID provided by your administrator or instructor to begin your exam.
          </p>
          
          <form onSubmit={handleStartExam} className="max-w-md mx-auto flex gap-4">
            <input
              type="text"
              value={examIdInput}
              onChange={(e) => setExamIdInput(e.target.value)}
              placeholder="Enter Exam ID (e.g., 123e4567-e89b-...)"
              className="input flex-1 font-mono text-sm"
              required
            />
            <button type="submit" className="btn btn-primary whitespace-nowrap">
              Start Exam
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
