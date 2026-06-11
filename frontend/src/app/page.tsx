import Link from 'next/link'
import { BookOpen, Shield, User } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold text-gray-900">ExamGuard</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="btn btn-secondary">
              Login
            </Link>
            <Link href="/register" className="btn btn-primary">
              Register
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-3xl">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            AI-Powered Online Exam Monitoring
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Secure, automated proctoring solution with real-time AI monitoring
            to ensure exam integrity
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register?role=student" className="btn btn-primary text-lg px-8 py-3">
              <User className="w-5 h-5 mr-2 inline" />
              Student Portal
            </Link>
            <Link href="/register?role=admin" className="btn btn-secondary text-lg px-8 py-3">
              <Shield className="w-5 h-5 mr-2 inline" />
              Admin Portal
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-5xl">
          <FeatureCard
            icon={<BookOpen className="w-10 h-10 text-primary" />}
            title="Take Exams"
            description="Access your exams with real-time AI monitoring and webcam verification"
          />
          <FeatureCard
            icon={<Shield className="w-10 h-10 text-primary" />}
            title="Secure Monitoring"
            description="Automated detection of suspicious behaviors including phone usage and tab switching"
          />
          <FeatureCard
            icon={<User className="w-10 h-10 text-primary" />}
            title="Admin Dashboard"
            description="Comprehensive violation reports and exam management for administrators"
          />
        </div>
      </main>

      <footer className="bg-white py-6 text-center text-gray-500">
        <p>AI-Powered Exam Monitoring System</p>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="card text-center">
      <div className="mb-4 flex justify-center">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
