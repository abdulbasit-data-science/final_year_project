'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useExam } from '@/hooks/useExam'
import { useMonitoring } from '@/hooks/useMonitoring'
import { useViolations } from '@/hooks/useViolations'
import {
  Clock,
  Camera,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Flag,
  X,
  Send
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { VIOLATION_TYPES } from '@/lib/constants'

function ExamContent({ examId }: { examId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const attemptId = searchParams.get('attemptId')

  const {
    exam,
    attempt,
    questions,
    answers,
    currentQuestion,
    timeRemaining,
    loading: examLoading,
    error,
    startExam,
    selectAnswer,
    nextQuestion,
    prevQuestion,
    goToQuestion,
    submitExam
  } = useExam()

  const {
    isMonitoring,
    isWebcamActive,
    lastViolation,
    tabSwitchCount,
    startMonitoring,
    stopMonitoring,
    sendViolation
  } = useMonitoring(attempt?.id || '')

  const { violations } = useViolations()

  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showViolationAlert, setShowViolationAlert] = useState(false)

  useEffect(() => {
    if (examId) {
      startExam(examId)
    }
  }, [examId, startExam])

  useEffect(() => {
    if (attempt?.id && !isMonitoring) {
      startMonitoring()
    }
  }, [attempt?.id, isMonitoring, startMonitoring])

  useEffect(() => {
    if (lastViolation) {
      setShowViolationAlert(true)
      const timer = setTimeout(() => setShowViolationAlert(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [lastViolation])

  const handleSubmit = async () => {
    stopMonitoring()
    await submitExam()
    router.push('/student/dashboard')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600 bg-red-50 p-6 rounded-lg text-center max-w-md">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Failed to start exam</h2>
          <p>{error}</p>
          <button 
            onClick={() => router.push('/student/dashboard')}
            className="mt-6 btn btn-primary"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (examLoading || !exam || !attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading exam...</div>
      </div>
    )
  }

  const currentQ = questions[currentQuestion]
  const answeredCount = answers.size

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">{exam.title}</h1>

          <div className="flex items-center gap-6">
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-mono",
              timeRemaining < 300 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
            )}>
              <Clock className="w-5 h-5" />
              {formatTime(timeRemaining)}
            </div>

            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg",
              isWebcamActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            )}>
              <Camera className="w-5 h-5" />
              {isWebcamActive ? 'Recording' : 'No Camera'}
            </div>

            {tabSwitchCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning text-white">
                <AlertTriangle className="w-5 h-5" />
                {tabSwitchCount} violations
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 pt-20 pb-8 flex gap-6">
        {/* Question Area */}
        <div className="flex-1">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm text-gray-500">
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span className="text-sm text-gray-500">
                {answeredCount} answered
              </span>
            </div>

            <p className="text-lg text-gray-900 mb-8">{currentQ.question_text}</p>

            <div className="space-y-4">
              {['A', 'B', 'C', 'D'].map(option => (
                <button
                  key={option}
                  onClick={() => selectAnswer(currentQ.id, option)}
                  className={cn(
                    "w-full p-4 rounded-lg border-2 text-left transition-colors",
                    answers.get(currentQ.id) === option
                      ? "border-primary bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <span className={cn(
                    "inline-flex items-center justify-center w-8 h-8 rounded-full mr-3 font-medium",
                    answers.get(currentQ.id) === option
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-700"
                  )}>
                    {option}
                  </span>
                  {currentQ[`option_${option.toLowerCase()}` as keyof typeof currentQ]}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              <button
                onClick={prevQuestion}
                disabled={currentQuestion === 0}
                className="btn btn-secondary flex items-center gap-2 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
                Previous
              </button>

              {currentQuestion === questions.length - 1 ? (
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Submit Exam
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="btn btn-primary flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 space-y-6">
          {/* Webcam Preview */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Camera Preview</h3>
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
              <video
                ref={videoRef => {
                  if (videoRef && isWebcamActive) {
                    videoRef.srcObject = (window as any).stream
                  }
                }}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Question Navigator */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Questions</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => goToQuestion(i)}
                  className={cn(
                    "aspect-square rounded-lg font-medium text-sm",
                    i === currentQuestion
                      ? "bg-primary text-white"
                      : answers.has(q.id)
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Violations */}
          {violations.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Flag className="w-4 h-4" />
                Violations
              </h3>
              <div className="space-y-2">
                {violations.map((v, i) => (
                  <div key={i} className="text-sm p-2 bg-red-50 rounded-lg">
                    {VIOLATION_TYPES[v.violation_type]}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Violation Alert */}
      {showViolationAlert && lastViolation && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-6 h-6" />
          <div>
            <div className="font-semibold">Violation Detected</div>
            <div className="text-sm opacity-90">{VIOLATION_TYPES[lastViolation]}</div>
          </div>
          <button onClick={() => setShowViolationAlert(false)} className="ml-4">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Submit Exam</h2>
            <p className="text-gray-600 mb-6">
              You have answered {answeredCount} out of {questions.length} questions.
              Are you sure you want to submit?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="btn btn-primary flex-1"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ExamPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ExamContent examId={params.id} />
    </Suspense>
  )
}
