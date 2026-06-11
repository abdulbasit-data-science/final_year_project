'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Users,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy
} from 'lucide-react'
import type { Exam, ExamAttempt, Violation } from '@/lib/types'
import { cn } from '@/lib/utils'
import { VIOLATION_TYPES, STATUS_COLORS } from '@/lib/constants'

export default function AdminDashboard() {
  const router = useRouter()
  const { user, loading: authLoading, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'exams' | 'reports'>('exams')
  const [exams, setExams] = useState<Exam[]>([])
  const [attempts, setAttempts] = useState<ExamAttempt[]>([])
  const [violations, setViolations] = useState<Violation[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch exams via direct supabase (allowed for admin)
        const examsRes = await supabase.from('exams').select('*').order('created_at', { ascending: false })
        const apiHeaders = {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
        // Fetch attempts via backend API (requires admin token)
        const attemptsRes = await fetch('http://localhost:8000/api/attempts/list', { headers: apiHeaders }).then(r => r.json())
        // Fetch violations via backend API
        const violationsRes = await fetch('http://localhost:8000/api/violations/all', { headers: apiHeaders }).then(r => r.json())

        setExams(examsRes.data || [])
        setAttempts(attemptsRes.data || [])
        setViolations(violationsRes.data || [])
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    if (user?.role === 'admin') {
      fetchData()
    }
  }, [user])

  const togglePublish = async (examId: string, isPublished: boolean) => {
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      const res = await fetch(`http://localhost:8000/api/exams/${examId}/publish`, {
        method: 'POST',
        headers
      })
      if (res.ok) {
        setExams(prev => prev.map(e => e.id === examId ? { ...e, is_published: true } : e)) // Assuming toggle publishes. If unpublish is needed, backend should support it. Since it currently just sets to True, let's keep it optimistic.
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchExams = async () => {
    const examsRes = await supabase.from('exams').select('*').order('created_at', { ascending: false })
    setExams(examsRes.data || [])
  }

  const deleteExam = async (examId: string) => {
    if (!confirm('Are you sure you want to delete this exam?')) return
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      const res = await fetch(`http://localhost:8000/api/exams/${examId}`, { method: 'DELETE', headers })
      if (res.ok) {
        // Refresh exams list
        await fetchExams()
      } else {
        const err = await res.json()
        console.error('Delete failed:', err)
        alert('Failed to delete exam. Please try again.')
      }
    } catch (e) {
      console.error(e)
      alert('Error deleting exam')
    }
  }

  const reviewAttempt = async (attemptId: string, status: 'reviewed' | 'completed') => {
    try {
      const headers = { 
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      }
      const res = await fetch(`http://localhost:8000/api/attempts/${attemptId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status })
      })
      if (res.ok) {
        setAttempts(prev => prev.map(a => a.id === attemptId ? { ...a, status } : a))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const deleteAttempt = async (attemptId: string) => {
    if (!confirm('Are you sure you want to delete this exam report?')) return
    try {
      const headers = { 
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
      const res = await fetch(`http://localhost:8000/api/attempts/${attemptId}`, {
        method: 'DELETE',
        headers
      })
      if (res.ok) {
        setAttempts(prev => prev.filter(a => a.id !== attemptId))
        setViolations(prev => prev.filter(v => v.attempt_id !== attemptId))
      } else {
        alert('Failed to delete exam report')
      }
    } catch (e) {
      console.error(e)
      alert('Error deleting exam report')
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r min-h-screen fixed">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            <span className="font-bold text-gray-900">Admin Panel</span>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          <button
            onClick={() => setActiveTab('exams')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
              activeTab === 'exams' ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <BookOpen className="w-5 h-5" />
            Exams
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
              activeTab === 'reports' ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <FileText className="w-5 h-5" />
            Reports
          </button>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="mb-2 text-sm text-gray-500">{user?.full_name}</div>
          <button onClick={logout} className="btn btn-secondary w-full flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        {activeTab === 'exams' ? (
          <>
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Manage Exams</h1>
              <button
                onClick={() => router.push('/admin/exams/create')}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Exam
              </button>
            </div>

            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Title</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Duration</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Questions</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {exams.map(exam => (
                    <tr key={exam.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{exam.title}</td>
                      <td className="px-4 py-3 text-gray-500">{exam.duration_minutes} min</td>
                      <td className="px-4 py-3 text-gray-500">{exam.total_marks} marks</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          exam.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                        )}>
                          {exam.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(exam.id)
                              alert('Exam ID copied to clipboard!')
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                            title="Copy Exam ID"
                          >
                            <Copy className="w-4 h-4 text-blue-500" />
                          </button>
                          <button
                            onClick={() => togglePublish(exam.id, exam.is_published)}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                            title={exam.is_published ? 'Unpublish' : 'Publish'}
                          >
                            {exam.is_published ? <XCircle className="w-4 h-4 text-gray-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                          </button>
                          <button className="p-2 hover:bg-gray-100 rounded-lg">
                            <Edit className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => deleteExam(exam.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {exams.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No exams created yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Exam Reports</h1>

            <div className="space-y-6">
              {attempts.map(attempt => {
                const exam = exams.find(e => e.id === attempt.exam_id)
                const attemptViolations = violations.filter(v => v.attempt_id === attempt.id)

                return (
                  <div key={attempt.id} className="card">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{exam?.title || 'Unknown Exam'}</h3>
                        <p className="text-sm text-gray-500">
                          Started: {new Date(attempt.started_at).toLocaleString()}
                          {attempt.submitted_at && (
                            <> | Submitted: {new Date(attempt.submitted_at).toLocaleString()}</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-sm font-medium",
                          STATUS_COLORS[attempt.status] || STATUS_COLORS.reviewed
                        )}>
                          {attempt.status}
                        </span>
                        {attempt.status !== 'completed' && attempt.status !== 'reviewed' && (
                          <>
                            <button
                              onClick={() => reviewAttempt(attempt.id, 'completed')}
                              className="btn btn-secondary text-sm"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Accept
                            </button>
                            <button
                              onClick={() => reviewAttempt(attempt.id, 'reviewed')}
                              className="btn btn-danger text-sm"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => deleteAttempt(attempt.id)}
                          className="p-2 hover:bg-red-100 rounded-lg text-red-500"
                          title="Delete Report"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-500">Score</div>
                        <div className="text-xl font-bold text-gray-900">
                          {attempt.score !== null ? `${attempt.score}/${exam?.total_marks}` : '-'}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-500">Violations</div>
                        <div className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          {attemptViolations.length}
                        </div>
                      </div>
                    </div>

                    {attemptViolations.length > 0 && (
                      <div className="bg-red-50 p-4 rounded-lg">
                        <h4 className="font-medium text-red-900 mb-2">Violation Details</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {attemptViolations.map((v, i) => (
                            <div key={i} className="text-sm bg-white p-2 rounded">
                              <span className="font-medium">{VIOLATION_TYPES[v.violation_type]}</span>
                              <span className="text-gray-500 ml-2">
                                {new Date(v.detected_at).toLocaleTimeString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {attempts.length === 0 && (
                <div className="card text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No exam attempts yet</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
