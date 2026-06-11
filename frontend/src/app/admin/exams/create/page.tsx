'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'

interface QuestionForm {
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_option: string
  marks: number
}

export default function CreateExamPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState(60)
  const [totalMarks, setTotalMarks] = useState(100)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  
  const [questions, setQuestions] = useState<QuestionForm[]>([
    {
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_option: 'A',
      marks: 1
    }
  ])
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  if (authLoading) return <div>Loading...</div>
  if (!user || user.role !== 'admin') {
    router.push('/login')
    return null
  }
  
  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_option: 'A',
        marks: 1
      }
    ])
  }
  
  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }
  
  const updateQuestion = (index: number, field: keyof QuestionForm, value: string | number) => {
    const newQuestions = [...questions]
    newQuestions[index] = { ...newQuestions[index], [field]: value }
    setQuestions(newQuestions)
  }
  
  const handleSave = async (publish: boolean) => {
    if (!title) {
      alert('Exam title is required')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // 1. Create Exam
      const payload: any = {
        title,
        description,
        duration_minutes: duration,
        total_marks: totalMarks
      }

      if (startTime) payload.start_time = new Date(startTime).toISOString()
      if (endTime) payload.end_time = new Date(endTime).toISOString()

      const examResponse = await fetch('http://localhost:8000/api/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(payload)
      })
      
      if (!examResponse.ok) throw new Error(await examResponse.text())
      
      const examData = await examResponse.json()
      const exam = examData.data
      
      // 2. Add Questions
      for (let index = 0; index < questions.length; index++) {
        const q = questions[index]
        const qResponse = await fetch(`http://localhost:8000/api/exams/${exam.id}/questions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify({
            question_text: q.question_text,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_option: q.correct_option,
            marks: q.marks,
            order_index: index
          })
        })
        
        if (!qResponse.ok) throw new Error(await qResponse.text())
      }
      
      // 3. Publish if requested
      if (publish) {
        const pResponse = await fetch(`http://localhost:8000/api/exams/${exam.id}/publish`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        })
        if (!pResponse.ok) throw new Error(await pResponse.text())
      }
      
      router.push('/admin/dashboard')
    } catch (err: any) {
      console.error('Error saving exam:', err)
      alert(`Failed to save exam: ${err.message || JSON.stringify(err)}`)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/admin/dashboard')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Create New Exam</h1>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={isSubmitting}
              className="btn btn-primary"
            >
              Publish Exam
            </button>
          </div>
        </div>
        
        <div className="space-y-8">
          {/* Exam Details */}
          <section className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Exam Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="input"
                  placeholder="e.g. Midterm Examination: Computer Science"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="input h-24 resize-none"
                  placeholder="Instructions or details about the exam..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time (Optional)</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time (Optional)</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes) *</label>
                <input
                  type="number"
                  value={duration}
                  onChange={e => setDuration(parseInt(e.target.value))}
                  className="input"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks *</label>
                <input
                  type="number"
                  value={totalMarks}
                  onChange={e => setTotalMarks(parseInt(e.target.value))}
                  className="input"
                  min="1"
                  required
                />
              </div>
            </div>
          </section>
          
          {/* Questions Bank */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Questions ({questions.length})</h2>
              <button
                onClick={addQuestion}
                className="btn btn-secondary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Question
              </button>
            </div>
            
            {questions.map((q, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Question {index + 1}</h3>
                  <button
                    onClick={() => removeQuestion(index)}
                    disabled={questions.length === 1}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                    <textarea
                      value={q.question_text}
                      onChange={e => updateQuestion(index, 'question_text', e.target.value)}
                      className="input h-20 resize-none"
                      placeholder="Enter the question here..."
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Option A</label>
                      <input
                        type="text"
                        value={q.option_a}
                        onChange={e => updateQuestion(index, 'option_a', e.target.value)}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Option B</label>
                      <input
                        type="text"
                        value={q.option_b}
                        onChange={e => updateQuestion(index, 'option_b', e.target.value)}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Option C</label>
                      <input
                        type="text"
                        value={q.option_c}
                        onChange={e => updateQuestion(index, 'option_c', e.target.value)}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Option D</label>
                      <input
                        type="text"
                        value={q.option_d}
                        onChange={e => updateQuestion(index, 'option_d', e.target.value)}
                        className="input"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Correct Option</label>
                      <select
                        value={q.correct_option}
                        onChange={e => updateQuestion(index, 'correct_option', e.target.value)}
                        className="input bg-white"
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Marks for this question</label>
                      <input
                        type="number"
                        value={q.marks}
                        onChange={e => updateQuestion(index, 'marks', parseInt(e.target.value))}
                        className="input"
                        min="1"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}
