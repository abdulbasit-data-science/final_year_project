'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard, BookOpen, FileText, LogOut, Plus, Edit, Trash2,
  CheckCircle, XCircle, AlertTriangle, Copy, Users, ChevronDown, ChevronRight, Shield, Sparkles
} from 'lucide-react'
import type { Exam, ExamAttempt, Violation } from '@/lib/types'
import { cn } from '@/lib/utils'
import { VIOLATION_TYPES, STATUS_COLORS } from '@/lib/constants'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function AdminDashboard() {
  const router = useRouter()
  const { user, loading: authLoading, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'exams' | 'reports'>('exams')
  const [exams, setExams] = useState<Exam[]>([])
  const [attempts, setAttempts] = useState<ExamAttempt[]>([])
  const [violations, setViolations] = useState<Violation[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedViolations, setExpandedViolations] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) router.push('/login')
  }, [user, authLoading, router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiHeaders = { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
        const [examsRes, attemptsRes, violationsRes] = await Promise.all([
          fetch(`${API_URL}/api/exams/all`, { headers: apiHeaders }).then(r => r.json()),
          fetch(`${API_URL}/api/attempts/list`, { headers: apiHeaders }).then(r => r.json()),
          fetch(`${API_URL}/api/violations/all`, { headers: apiHeaders }).then(r => r.json()),
        ])
        setExams(examsRes.data || [])
        setAttempts(attemptsRes.data || [])
        setViolations(violationsRes.data || [])
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    if (user?.role === 'admin') fetchData()
  }, [user])

  const togglePublish = async (examId: string) => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      const res = await fetch(`${API_URL}/api/exams/${examId}/publish`, { method: 'POST', headers })
      if (res.ok) {
        const data = await res.json()
        setExams(prev => prev.map(e => e.id === examId ? { ...e, is_published: data.data.is_published } : e))
      }
    } catch (e) { console.error(e) }
  }

  const fetchExams = async () => {
    const apiHeaders = { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    const res = await fetch(`${API_URL}/api/exams/all`, { headers: apiHeaders })
    const data = await res.json()
    setExams(data.data || [])
  }

  const deleteExam = async (examId: string) => {
    if (!confirm('Are you sure you want to delete this exam?')) return
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      const res = await fetch(`${API_URL}/api/exams/${examId}`, { method: 'DELETE', headers })
      if (res.ok) await fetchExams()
      else alert('Failed to delete exam')
    } catch (e) { alert('Error deleting exam') }
  }

  const reviewAttempt = async (attemptId: string, status: 'reviewed' | 'completed') => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}`, 'Content-Type': 'application/json' }
      const res = await fetch(`${API_URL}/api/attempts/${attemptId}`, { method: 'PUT', headers, body: JSON.stringify({ status }) })
      if (res.ok) setAttempts(prev => prev.map(a => a.id === attemptId ? { ...a, status } : a))
    } catch (e) { console.error(e) }
  }

  const deleteAttempt = async (attemptId: string) => {
    if (!confirm('Are you sure you want to delete this exam report?')) return
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      const res = await fetch(`${API_URL}/api/attempts/${attemptId}`, { method: 'DELETE', headers })
      if (res.ok) {
        setAttempts(prev => prev.filter(a => a.id !== attemptId))
        setViolations(prev => prev.filter(v => v.attempt_id !== attemptId))
      } else alert('Failed to delete exam report')
    } catch (e) { alert('Error deleting exam report') }
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

  const Sidebar = () => (
    <aside className="min-h-screen fixed flex flex-col" style={{ width: 256, backgroundColor: 'var(--bg-card)', borderRight: '1px solid var(--border)' }}>
      <div className="p-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center shadow-glow">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Admin Panel</span>
        </div>
      </div>
      <nav className="p-3 space-y-1 flex-1">
        <button onClick={() => setActiveTab('exams')}
          className={cn("w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all",
            activeTab === 'exams' ? 'bg-primary-50 text-primary-700' : 'hover:bg-surface-50')}
          style={activeTab === 'exams' ? {} : { color: 'var(--text-secondary)' }}>
          <BookOpen className="w-4 h-4" /> Manage Exams
        </button>
        <button onClick={() => setActiveTab('reports')}
          className={cn("w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all",
            activeTab === 'reports' ? 'bg-primary-50 text-primary-700' : 'hover:bg-surface-50')}
          style={activeTab === 'reports' ? {} : { color: 'var(--text-secondary)' }}>
          <FileText className="w-4 h-4" /> Exam Reports
        </button>
      </nav>
      <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center" style={{ color: 'var(--accent)' }}>
            <Users className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user?.full_name}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Administrator</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={logout} className="btn btn-ghost w-full text-sm justify-center">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </aside>
  )

  const ExamsTab = () => (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Manage Exams</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Create, publish, and manage your exams</p>
        </div>
        <button onClick={() => router.push('/admin/exams/create')} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Create Exam
        </button>
      </div>
      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
              <th className="table-header">Title</th>
              <th className="table-header">Duration</th>
              <th className="table-header">Marks</th>
              <th className="table-header">Status</th>
              <th className="table-header text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {exams.map(exam => (
              <tr key={exam.id} className="transition-colors hover:bg-surface-50/50">
                <td className="table-cell font-medium" style={{ color: 'var(--text-primary)' }}>{exam.title}</td>
                <td className="table-cell" style={{ color: 'var(--text-secondary)' }}>{exam.duration_minutes} min</td>
                <td className="table-cell" style={{ color: 'var(--text-secondary)' }}>{exam.total_marks}</td>
                <td className="table-cell">
                  <span className={cn("badge", exam.is_published ? "badge-success" : "badge-neutral")}>
                    {exam.is_published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="table-cell text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { navigator.clipboard.writeText(exam.id); alert('Exam ID copied!') }} className="btn-ghost p-2 rounded-lg"><Copy className="w-4 h-4" /></button>
                    <button onClick={() => togglePublish(exam.id)} className="btn-ghost p-2 rounded-lg">
                      {exam.is_published ? <XCircle className="w-4 h-4 text-amber-500" /> : <CheckCircle className="w-4 h-4 text-emerald-500" />}
                    </button>
                    <button className="btn-ghost p-2 rounded-lg"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => deleteExam(exam.id)} className="btn-ghost p-2 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {exams.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center">
                <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No exams created yet</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Click "Create Exam" to get started</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )

  const ReportsTab = () => (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Exam Reports</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Review student attempts and violations</p>
      </div>
      <div className="space-y-4">
        {attempts.map(attempt => {
          const exam = exams.find(e => e.id === attempt.exam_id)
          const attemptViolations = violations.filter(v => v.attempt_id === attempt.id)
          const isExpanded = expandedViolations[attempt.id] || false
          return (
            <div key={attempt.id} className="card animate-fade-in">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{exam?.title || 'Unknown Exam'}</h3>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{(attempt as any).student_name || attempt.student_id}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {new Date(attempt.started_at).toLocaleString()}
                    {attempt.submitted_at && <> &middot; {new Date(attempt.submitted_at).toLocaleString()}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("badge", attempt.status === 'completed' ? "badge-success" : attempt.status === 'flagged' ? "badge-danger" : attempt.status === 'in_progress' ? "badge-info" : "badge-neutral")}>{attempt.status}</span>
                  {attempt.status !== 'completed' && attempt.status !== 'reviewed' && <>
                    <button onClick={() => reviewAttempt(attempt.id, 'completed')} className="btn-ghost p-2 rounded-lg text-emerald-600"><CheckCircle className="w-4 h-4" /></button>
                    <button onClick={() => reviewAttempt(attempt.id, 'reviewed')} className="btn-ghost p-2 rounded-lg text-red-500"><XCircle className="w-4 h-4" /></button>
                  </>}
                  <button onClick={() => deleteAttempt(attempt.id)} className="btn-ghost p-2 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
                  <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Score</p>
                  <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{attempt.score !== null ? `${attempt.score}/${exam?.total_marks}` : '-'}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
                  <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Violations</p>
                  <p className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <AlertTriangle className="w-5 h-5 text-red-400" /> {attemptViolations.length}
                  </p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
                  <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Duration</p>
                  <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {attempt.submitted_at ? Math.round((new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / 60000) + ' min' : 'In progress'}
                  </p>
                </div>
              </div>
              {attemptViolations.length > 0 && (
                <div>
                  <button onClick={() => setExpandedViolations(prev => ({ ...prev, [attempt.id]: !isExpanded }))}
                    className="flex items-center gap-2 w-full p-3 rounded-xl hover:bg-red-50 transition-colors text-sm"
                    style={{ color: 'var(--text-primary)' }}>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-red-400" /> : <ChevronRight className="w-4 h-4 text-red-400" />}
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="font-medium text-red-700">{attemptViolations.length} Violation{attemptViolations.length > 1 ? 's' : ''}</span>
                  </button>
                  {isExpanded && (
                    <div className="rounded-xl p-4 mt-1 grid grid-cols-2 gap-2 animate-fade-in" style={{ backgroundColor: 'rgba(239,68,68,0.05)' }}>
                      {attemptViolations.map((v, i) => (
                        <div key={i} className="flex items-center justify-between text-sm rounded-lg p-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.15)' }}>
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{VIOLATION_TYPES[v.violation_type]}</span>
                          <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>{new Date(v.detected_at).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {attempts.length === 0 && (
          <div className="card text-center py-16" style={{ borderStyle: 'dashed', borderWidth: 2, borderColor: 'var(--border)' }}>
            <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No exam attempts yet</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Reports appear here once students take exams</p>
          </div>
        )}
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-grid relative" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="fixed top-[-15%] left-[-5%] w-[30%] h-[30%] rounded-full bg-gradient-to-br from-primary-400/10 to-primary-600/5 blur-3xl animate-float pointer-events-none" />
      <Sidebar />
      <main className="ml-64 p-8" style={{ minHeight: '100vh' }}>
        {activeTab === 'exams' ? <ExamsTab /> : <ReportsTab />}
      </main>
    </div>
  )
}
